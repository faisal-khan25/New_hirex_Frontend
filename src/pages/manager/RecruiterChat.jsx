import { useState, useEffect, useRef, useCallback, memo } from 'react';
import api from '../../services/api';
import ChatWindow from '../../components/chat/ChatWindow';
import './RecruiterChat.css';

// ─── Module-level conversation cache ─────────────────────────
// Stores the merged conversation list across navigations.
// Keyed by applicationId for O(1) upsert on poll.
// Reset to null on explicit refresh so stale stubs don't persist.
let convCache      = null;   // Map<applicationId, conv> | null
let stubsFetched   = false;  // whether we've already fetched the applicant stubs

// Exported so Applicants.jsx can call this after shortlisting
export function invalidateConvCache() {
  convCache    = null;
  stubsFetched = false;
}

/* ─── ConvItem ───────────────────────────────────────────────── */
const ConvItem = memo(function ConvItem({ conv, isActive, onSelect, formatTime }) {
  return (
    <div
      className={`rc-conv-item ${isActive ? 'rc-conv-item--active' : ''} ${conv.unreadCount > 0 ? 'rc-conv-item--unread' : ''}`}
      onClick={() => onSelect(conv)}
    >
      <div className="rc-conv-avatar">{conv.candidateName?.charAt(0)?.toUpperCase()}</div>
      <div className="rc-conv-info">
        <div className="rc-conv-top">
          <span className="rc-conv-name">{conv.candidateName}</span>
          <span className="rc-conv-time">{formatTime(conv.lastMessageAt)}</span>
        </div>
        <div className="rc-conv-job">{conv.jobTitle}</div>
        <div className="rc-conv-bottom">
          <span className="rc-conv-preview">
            {conv.lastMessage || (conv._fromApplicants
              ? '✅ Shortlisted — start the conversation'
              : 'No messages yet')}
          </span>
          {conv.unreadCount > 0 && (
            <span className="rc-unread-badge">{conv.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
});

/* ─── Main Component ─────────────────────────────────────────── */
export default function RecruiterChat() {
  const [conversations, setConversations] = useState(() =>
    convCache ? [...convCache.values()] : []
  );
  const [loading, setLoading] = useState(!convCache);
  const [error,   setError]   = useState('');
  const [selected, setSelected] = useState(null);

  const mergeRef = useRef(new Map(convCache || [])); // Map<applicationId, conv>

  // ── Merge helper: upsert into the Map, then push sorted array to state ──
  const applyMerge = useCallback((serverList, stubs) => {
    const map = mergeRef.current;

    // Add/update real conversations from server
    for (const conv of serverList) {
      const existing = map.get(conv.applicationId);
      map.set(conv.applicationId, {
        ...(existing || {}),
        ...conv,
        // Keep unreadCount from existing if server doesn't have it
        unreadCount: conv.unreadCount ?? existing?.unreadCount ?? 0,
      });
    }

    // Add stubs only for applicationIds not already in the map
    for (const stub of (stubs || [])) {
      if (!map.has(stub.applicationId)) {
        map.set(stub.applicationId, stub);
      }
    }

    // Persist to module-level cache
    convCache = new Map(map);

    // Sort: real messages first, then by lastMessageAt descending
    const sorted = [...map.values()].sort((a, b) => {
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage)  return  1;
      return (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '');
    });

    setConversations(sorted);
  }, []);

  // ── Fetch just the conversations (fast — used for polls too) ──
  const fetchConversations = useCallback(async (stubs) => {
    try {
      const { data } = await api.get('/api/chat/manager/conversations');
      applyMerge(data, stubs ?? [...(mergeRef.current.values())].filter(c => c._fromApplicants));
      setError('');
    } catch {
      setError('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  }, [applyMerge]);

  // ── Fetch applicant stubs — ONE dedicated endpoint, not N calls ──
  // The backend returns all SHORTLISTED+HIRED applicants across all jobs in 1 query.
  // Falls back to the N-call waterfall if the endpoint doesn't exist yet.
  const fetchStubs = useCallback(async () => {
    try {
      // Preferred: single endpoint that joins jobs+applicants server-side
      const { data } = await api.get('/api/manager/shortlisted-applicants');
      return data.map(a => ({
        applicationId:     a.id,
        candidateName:     a.applicantName,
        candidateEmail:    a.applicantEmail,
        jobTitle:          a.jobTitle,
        applicationStatus: a.status,
        lastMessage:       null,
        lastMessageAt:     a.appliedAt || null,
        unreadCount:       0,
        _fromApplicants:   true,
      }));
    } catch {
      // Fallback: parallel fetch per job (old approach, still faster than sequential)
      try {
        const { data: jobs } = await api.get('/api/manager/jobs');
        const results = await Promise.all(
          jobs.map(j =>
            api.get(`/api/manager/jobs/${j.id}/applicants`)
               .then(r => ({ job: j, apps: r.data || [] }))
               .catch(() => ({ job: j, apps: [] }))
          )
        );
        const stubs = [];
        for (const { job, apps } of results) {
          for (const a of apps) {
            if (a.status === 'SHORTLISTED' || a.status === 'HIRED') {
              stubs.push({
                applicationId:     a.id,
                candidateName:     a.applicantName,
                candidateEmail:    a.applicantEmail,
                jobTitle:          job.title,
                applicationStatus: a.status,
                lastMessage:       null,
                lastMessageAt:     a.appliedAt || null,
                unreadCount:       0,
                _fromApplicants:   true,
              });
            }
          }
        }
        return stubs;
      } catch {
        return [];
      }
    }
  }, []);

  // ── Init: fetch conversations immediately, stubs in parallel ──
  useEffect(() => {
    let cancelled   = false;
    let pollInterval = null;

    const init = async () => {
      if (convCache) {
        // Already have data — show it instantly, then refresh silently
        mergeRef.current = new Map(convCache);
        setLoading(false);
        fetchConversations(); // silent background refresh
        return;
      }

      // First load: fire both in parallel
      const [, stubs] = await Promise.all([
        fetchConversations(),
        stubsFetched ? Promise.resolve([...mergeRef.current.values()].filter(c => c._fromApplicants))
                     : fetchStubs(),
      ]);

      if (!cancelled) {
        stubsFetched = true;
        // If we got fresh stubs, merge them in
        if (Array.isArray(stubs) && stubs.length > 0) {
          applyMerge([], stubs);
        }
      }
    };

    init().then(() => {
      if (!cancelled) {
        // Poll every 15s for sidebar updates (unread counts, last message preview)
        pollInterval = setInterval(() => {
          if (!cancelled) fetchConversations();
        }, 15000);
      }
    });

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchConversations, fetchStubs, applyMerge]);

  // ── Selecting a conversation clears its unread badge ──
  const handleSelect = useCallback((conv) => {
    setSelected(conv);
    // Clear unread locally
    mergeRef.current.set(conv.applicationId, { ...conv, unreadCount: 0 });
    convCache = new Map(mergeRef.current);
    setConversations(prev =>
      prev.map(c => c.applicationId === conv.applicationId ? { ...c, unreadCount: 0 } : c)
    );
  }, []);

  // ── Called by parent when a candidate is freshly shortlisted ──
  // Immediately inserts the new stub so it appears without waiting for next poll
  const addNewConversation = useCallback((stub) => {
    applyMerge([], [stub]);
  }, [applyMerge]);

  const formatTime = useCallback((iso) => {
    if (!iso) return '';
    const d    = new Date(iso);
    const diff = Math.floor((Date.now() - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }, []);

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="rc-page">
      <div className="rc-header">
        <h1 className="rc-title">Recruiter Conversations</h1>
        <p className="rc-subtitle">
          Chat with shortlisted candidates regarding interviews and hiring updates
        </p>
      </div>

      <div className="rc-layout">

        {/* ── Sidebar ─────────────────────────────────────── */}
        <div className="rc-sidebar">
          <div className="rc-sidebar-header">
            <span>Conversations</span>
            {totalUnread > 0 && <span className="rc-badge">{totalUnread}</span>}
          </div>

          {loading && <div className="rc-loading">Loading…</div>}
          {error   && <div className="rc-error">{error}</div>}

          {!loading && conversations.length === 0 && (
            <div className="rc-empty">
              <div className="rc-empty-icon">💬</div>
              <p>No shortlisted candidates yet.</p>
              <p className="rc-empty-hint">
                Shortlisted candidates appear here automatically.
              </p>
            </div>
          )}

          <div className="rc-conv-list">
            {conversations.map(conv => (
              <ConvItem
                key={conv.applicationId}
                conv={conv}
                isActive={selected?.applicationId === conv.applicationId}
                onSelect={handleSelect}
                formatTime={formatTime}
              />
            ))}
          </div>
        </div>

        {/* ── Chat Panel ──────────────────────────────────── */}
        <div className="rc-chat-panel">
          {!selected ? (
            <div className="rc-no-selection">
              <div className="rc-no-selection-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a candidate from the left to start chatting.</p>
            </div>
          ) : (
            <div className="rc-chat-wrap">
              <div className="rc-chat-info-bar">
                <div className="rc-info-left">
                  <strong>{selected.candidateName}</strong>
                  <span className="rc-info-email">{selected.candidateEmail}</span>
                </div>
                <div className="rc-info-right">
                  <span className="rc-info-job">{selected.jobTitle}</span>
                  <span className="rc-status-badge rc-status-shortlisted">
                    {selected.applicationStatus}
                  </span>
                </div>
              </div>
              <ChatWindow
                key={selected.applicationId}
                applicationId={selected.applicationId}
                recipientName={selected.candidateName}
                embedded={true}
                onConversationUpdate={(lastMsg) => {
                  // Update sidebar preview when a message is sent/received
                  const updated = {
                    ...selected,
                    lastMessage:   lastMsg.content || `📎 ${lastMsg.fileName}`,
                    lastMessageAt: lastMsg.sentAt,
                  };
                  mergeRef.current.set(selected.applicationId, updated);
                  convCache = new Map(mergeRef.current);
                  setConversations(prev =>
                    prev.map(c =>
                      c.applicationId === selected.applicationId ? updated : c
                    ).sort((a, b) => {
                      if (a.lastMessage && !b.lastMessage) return -1;
                      if (!a.lastMessage && b.lastMessage)  return  1;
                      return (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '');
                    })
                  );
                }}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
