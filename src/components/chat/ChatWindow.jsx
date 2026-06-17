import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import api, { getAuthenticatedBlobUrl, revokeBlobUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import './ChatWindow.css';

// Pre-load WebSocket libs at module level — ready before user clicks any conversation
let SockJS      = null;
let StompClient = null;
import('sockjs-client').then(m  => { SockJS      = m.default;  });
import('@stomp/stompjs').then(m => { StompClient = m.Client;   });

/* ─── Constants ─────────────────────────────────────────────── */
const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const ALLOWED_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/gif', 'application/zip',
  'application/x-zip-compressed', 'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/* ─── Format helpers — module-level so they never change ─────── */
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ─── AuthImage ──────────────────────────────────────────────── */
// BUG FIX: this component was referenced at render time (in
// renderFileAttachment below) but its definition was commented out,
// which throws "AuthImage is not defined" and crashes the whole chat
// window the moment any message has an image attachment. Restored here,
// memoized so it only re-fetches the blob when the file URL changes.
const AuthImage = memo(function AuthImage({ fileUrl, fileName, className }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAuthenticatedBlobUrl(fileUrl)
      .then(url => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (!src) return <div className="chat-img-thumb chat-img-loading">⏳</div>;
  return <img src={src} alt={fileName || 'Shared image'} className={className} loading="lazy" />;
});

/* ─── MessageRow ─────────────────────────────────────────────── */
const MessageRow = memo(function MessageRow({
  msg, isOwn, onReact, onDeleteForMe, onDeleteForEveryone, onDownload, onImageClick,
}) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [emojiOpen,   setEmojiOpen]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const rowRef = useRef(null);

  useEffect(() => {
    if (!menuOpen && !emojiOpen) return;
    const handler = (e) => {
      if (!rowRef.current?.contains(e.target)) {
        setMenuOpen(false);
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, emojiOpen]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    await onDownload(msg.fileUrl, msg.fileName);
    setDownloading(false);
  }, [onDownload, msg.fileUrl, msg.fileName]);

  const renderStatusIcon = () => {
    if (!isOwn) return null;
    if (msg.status === 'READ')      return <span className="chat-status-icon chat-status-read"      title="Read">✓✓</span>;
    if (msg.status === 'DELIVERED') return <span className="chat-status-icon chat-status-delivered" title="Delivered">✓✓</span>;
    return <span className="chat-status-icon chat-status-sent" title="Sent">✓</span>;
  };

  const renderFileAttachment = () => {
    if (msg.fileType === 'IMAGE') {
      return (
        <div className="chat-img-wrap" onClick={() => onImageClick(msg.fileUrl)} style={{ cursor: 'pointer' }}>
          <AuthImage fileUrl={msg.fileUrl} fileName={msg.fileName} className="chat-img-thumb" />
          <div className="chat-img-overlay">🔍</div>
        </div>
      );
    }
    const icons = { PDF: '📄', DOC: '📝', ZIP: '🗜️', EXCEL: '📊', OTHER: '📎' };
    return (
      <div className="chat-file-card">
        <div className="chat-file-icon">{icons[msg.fileType] || '📎'}</div>
        <div className="chat-file-info">
          <div className="chat-file-name">{msg.fileName}</div>
          <div className="chat-file-size">{formatFileSize(msg.fileSize)}</div>
        </div>
        <button
          className="chat-file-download"
          onClick={handleDownload}
          disabled={downloading}
          title={downloading ? 'Downloading…' : 'Download'}
        >
          {downloading ? '⏳' : '⬇'}
        </button>
      </div>
    );
  };

  return (
    <div ref={rowRef} className={`chat-msg-row ${isOwn ? 'chat-msg-row--own' : 'chat-msg-row--other'}`}>
      {!isOwn && <div className="chat-msg-avatar">{msg.senderName?.charAt(0)?.toUpperCase()}</div>}

      <div className="chat-msg-bubble-wrap">
        {!isOwn && <div className="chat-msg-sender">{msg.senderName}</div>}

        <div className="chat-msg-bubble-row">
          {!msg.deletedForEveryone && (
            <div className="chat-ctx-menu-wrap">
              <button className="chat-react-btn" title="React"
                onClick={() => { setEmojiOpen(o => !o); setMenuOpen(false); }}>😊</button>
              {emojiOpen && (
                <div className={`chat-emoji-picker ${isOwn ? 'chat-emoji-picker--own' : ''}`}>
                  {EMOJI_LIST.map(e => (
                    <button key={e} className="chat-emoji-opt"
                      onClick={() => { onReact(msg.id, e); setEmojiOpen(false); }}>{e}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`chat-msg-bubble ${isOwn ? 'chat-bubble--own' : 'chat-bubble--other'} ${msg.deletedForEveryone ? 'chat-bubble--deleted' : ''} ${msg._optimistic ? 'chat-bubble--sending' : ''}`}>
            {msg.deletedForEveryone ? (
              <span className="chat-deleted-text">🚫 This message was deleted.</span>
            ) : (
              <>
                {msg.content && <span>{msg.content}</span>}
                {msg.fileUrl && renderFileAttachment()}
              </>
            )}
          </div>

          {!msg.deletedForEveryone && (
            <div className="chat-ctx-menu-wrap">
              <button className="chat-menu-btn" aria-label="Message options"
                onClick={() => { setMenuOpen(o => !o); setEmojiOpen(false); }}>⋮</button>
              {menuOpen && (
                <div className={`chat-ctx-menu ${isOwn ? 'chat-ctx-menu--own' : ''}`}>
                  <button onClick={() => { onDeleteForMe(msg.id); setMenuOpen(false); }}>
                    🗑️ Delete for me
                  </button>
                  {isOwn && (
                    <button className="chat-ctx-danger"
                      onClick={() => { onDeleteForEveryone(msg.id); setMenuOpen(false); }}>
                      🚫 Delete for everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {msg.reactions?.length > 0 && (
          <div className={`chat-reactions ${isOwn ? 'chat-reactions--own' : ''}`}>
            {msg.reactions.map(r => (
              <button key={r.emoji}
                className={`chat-reaction-pill ${r.reactedByMe ? 'chat-reaction-pill--mine' : ''}`}
                onClick={() => onReact(msg.id, r.emoji)}
                title={r.reactedByMe ? 'Remove reaction' : 'Add reaction'}>
                {r.emoji} {r.count > 1 && <span>{r.count}</span>}
              </button>
            ))}
          </div>
        )}

        <div className={`chat-msg-time ${isOwn ? 'chat-msg-time--own' : ''}`}>
          {msg._optimistic
            ? <span className="chat-status-sending">sending…</span>
            : <>{formatTime(msg.sentAt)}{renderStatusIcon()}</>
          }
        </div>
      </div>
    </div>
  );
});

/* ─── ChatWindow ─────────────────────────────────────────────── */
export default function ChatWindow({ applicationId, recipientName, onClose, embedded = false, onConversationUpdate }) {
  const { user } = useAuth();
  // FIX: pull fetchUnread so we can update the navbar badge instantly
  // when a WebSocket NEW_MESSAGE arrives, without waiting 30s for the poll.
  const { fetchUnread } = useNotifications();

  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState('');
  const [uploadError,  setUploadError]  = useState('');
  const [lightbox,     setLightbox]     = useState(null);
  const [currentPage,  setCurrentPage]  = useState(0);
  const [hasMore,      setHasMore]      = useState(false);
  const [wsConnected,  setWsConnected]  = useState(false);

  const bottomRef       = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef    = useRef(null);
  const textareaRef     = useRef(null);
  const stompClientRef  = useRef(null);
  const isFetchingRef   = useRef(false);
  const prevScrollH     = useRef(0);
  const wasAtBottom     = useRef(true);

  // FIX (blob memory leak): keeps a side-channel snapshot of the current
  // `messages` array so async handlers (delete-for-me/everyone, WS frames)
  // can look up a message's old fileUrl *before* mutating state, without
  // calling side-effecting code (revokeBlobUrl) from inside a setState
  // updater function — updater functions can be invoked twice by React in
  // StrictMode/dev, which is fine for pure state transitions but not for
  // side effects like revoking object URLs.
  const messagesRef = useRef([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // FIX (blob memory leak): tracks every IMAGE fileUrl rendered in this
  // conversation. Previously a `fileUrlsInView` Set was declared inside the
  // WebSocket effect but nothing ever added to it, so the "revoke on close"
  // cleanup was permanently a no-op and every image blob fetched via
  // getAuthenticatedBlobUrl() stayed in memory (and as a live object URL)
  // for the lifetime of the tab, no matter how many conversations were opened.
  const imageUrlsRef = useRef(new Set());
  useEffect(() => {
    messages.forEach(m => {
      if (m.fileType === 'IMAGE' && m.fileUrl) imageUrlsRef.current.add(m.fileUrl);
    });
  }, [messages]);

  const userId = user?.id;
  const isOwnMsg = useCallback((msg) => msg.senderId === userId, [userId]);

  /* ── fetchMessages ─────────────────────────────────────── */
  const fetchMessages = useCallback(async (page = 0, prepend = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data } = await api.get(`/api/chat/application/${applicationId}/messages?page=${page}`);
      const isLegacy = Array.isArray(data);
      const newMsgs  = isLegacy ? data : (data.messages || []);
      const more     = isLegacy ? false : (data.hasMore || false);

      setHasMore(more);
      setCurrentPage(page);

      if (prepend) {
        prevScrollH.current = messagesAreaRef.current?.scrollHeight || 0;
        setMessages(prev => [...newMsgs, ...prev]);
      } else {
        setMessages(newMsgs);
      }
      setError('');
    } catch {
      setError('Failed to load messages.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [applicationId]);

  /* ── Restore scroll after prepending older messages ─────── */
  useEffect(() => {
    if (!prevScrollH.current || !messagesAreaRef.current) return;
    const diff = messagesAreaRef.current.scrollHeight - prevScrollH.current;
    messagesAreaRef.current.scrollTop = diff;
    prevScrollH.current = 0;
  }, [messages]);

  /* ── Scroll to bottom only when at bottom already ───────── */
  useEffect(() => {
    if (loading) return;
    if (wasAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  /* ── WebSocket + fallback polling ──────────────────────── */
  useEffect(() => {
    let client = null;
    let fallbackInterval = null;

    fetchMessages(0, false);

    const connectWs = () => {
      // Use pre-loaded modules; fall back to polling if they haven't resolved yet
      if (!SockJS || !StompClient) {
        fallbackInterval = setInterval(() => fetchMessages(0, false), 10000);
        return;
      }

      const token  = localStorage.getItem('token');
      const wsUrl  = (import.meta.env.VITE_API_URL || 'http://localhost:8080') + '/ws';

      client = new StompClient({
        webSocketFactory: () => new SockJS(wsUrl),
        connectHeaders:   { Authorization: `Bearer ${token}` },
        reconnectDelay:   5000,
        onConnect: () => {
          setWsConnected(true);
          client.subscribe(`/topic/chat/${applicationId}`, (frame) => {
            try {
              const payload = JSON.parse(frame.body);

              if (payload.type === 'NEW_MESSAGE') {
                const incoming = payload.message;

                // FIX (duplicate message bug): previously this only checked
                // `prev.some(m => m.id === incoming.id)`. That check is useless
                // for the SENDER's own message, because at the moment the WS
                // frame arrives, the sender's copy is still the optimistic
                // placeholder with `id: tempId` — it never matches the real
                // server id, so the real message got appended *in addition to*
                // the placeholder. Then, when the REST POST response came back,
                // it replaced the placeholder with the real message too —
                // giving two copies of the same message in state.
                //
                // Fix: also try to match an existing *optimistic* placeholder
                // (same sender + same content) and replace it in place instead
                // of appending a second entry.
                setMessages(prev => {
                  if (prev.some(m => m.id === incoming.id)) {
                    return prev; // already have the real message (REST beat the WS frame)
                  }
                  const optimisticIdx = prev.findIndex(
                    m => m._optimistic &&
                         m.senderId === incoming.senderId &&
                         m.content === incoming.content
                  );
                  if (optimisticIdx !== -1) {
                    const next = [...prev];
                    next[optimisticIdx] = incoming;
                    return next;
                  }
                  return [...prev, incoming];
                });

                if (incoming.senderId !== userId) {
                  fetchUnread();
                }
                // Update sidebar preview for incoming messages too
                onConversationUpdate?.(incoming);
              } else if (payload.type === 'MESSAGE_DELETED_FOR_EVERYONE') {
                // FIX (blob memory leak): if the deleted message had an
                // image attachment, revoke its cached blob URL now — the
                // tombstone that replaces it has no fileUrl, so nothing
                // else will ever revoke this entry otherwise.
                const prior = messagesRef.current.find(m => m.id === payload.message.id);
                if (prior?.fileType === 'IMAGE' && prior.fileUrl) revokeBlobUrl(prior.fileUrl);
                setMessages(prev =>
                  prev.map(m => m.id === payload.message.id ? payload.message : m)
                );
              } else if (payload.type === 'REACTION_UPDATED') {
                setMessages(prev =>
                  prev.map(m => m.id === payload.message.id ? payload.message : m)
                );
              }
            } catch { /* ignore malformed frames */ }
          });
        },
        onDisconnect: () => setWsConnected(false),
        onStompError: () => setWsConnected(false),
      });

      stompClientRef.current = client;
      client.activate();
    };

    connectWs();

    return () => {
      if (client)           client.deactivate();
      if (fallbackInterval) clearInterval(fallbackInterval);
      stompClientRef.current = null;
      // FIX: Revoke cached blob URLs for every image actually rendered in
      // this conversation, so the blobUrlCache Map (and the underlying
      // browser object URLs) don't grow unbounded as the user opens more
      // conversations in the same session.
      imageUrlsRef.current.forEach(url => revokeBlobUrl(url));
      imageUrlsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  /* ── Infinite scroll ───────────────────────────────────── */
  const handleScroll = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    wasAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (!loadingMore && hasMore && el.scrollTop < 60) {
      setLoadingMore(true);
      fetchMessages(currentPage + 1, true).finally(() => setLoadingMore(false));
    }
  }, [loadingMore, hasMore, currentPage, fetchMessages]);

  /* ── Send message — optimistic update ─────────────────── */
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // 1. Clear input immediately so user can keep typing
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 2. Show message instantly with a temp id (optimistic)
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id:        tempId,
      content:   trimmed,
      senderId:  userId,
      senderName: user?.name || 'You',
      sentAt:    new Date().toISOString(),
      status:    'SENDING',
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    wasAtBottom.current = true;

    setSending(true);
    setError('');
    try {
      const { data } = await api.post(
        `/api/chat/application/${applicationId}/messages`,
        { content: trimmed }
      );

      // FIX (duplicate message bug): the WS NEW_MESSAGE frame for this exact
      // message can arrive *before* this REST response resolves. If it did,
      // the WS handler above already replaced the optimistic placeholder with
      // the real message (matched by tempId no longer existing). In that case
      // mapping tempId -> data here would be a no-op for replacement, but if
      // the WS handler instead appended the real message as a *new* entry
      // (older code), we'd end up with two. To stay safe regardless of which
      // arrived first: if the real message is already present, just drop the
      // placeholder; otherwise replace the placeholder with the real message.
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) {
          return prev.filter(m => m.id !== tempId);
        }
        return prev.map(m => m.id === tempId ? data : m);
      });

      // Update sidebar conversation preview immediately
      onConversationUpdate?.(data);
    } catch (err) {
      // Roll back the optimistic message and restore input
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(trimmed);
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [applicationId, input, sending, userId, user?.name]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  // FIX: Auto-grow textarea as user types, capped at 120px
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, []);

  /* ── File upload ───────────────────────────────────────── */
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('File type not allowed. Use PDF, DOC, images, or ZIP.');
      e.target.value = ''; return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File exceeds 10 MB limit.');
      e.target.value = ''; return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setSending(true);
    try {
      const { data } = await api.post(`/api/chat/application/${applicationId}/upload`, formData);
      setMessages(prev =>
        prev.some(m => m.id === data.id) ? prev : [...prev, data]
      );
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload file.');
    } finally {
      setSending(false);
      e.target.value = '';
    }
  }, [applicationId]);

  /* ── File download ─────────────────────────────────────── */
  const handleDownloadFile = useCallback(async (fileUrl, fileName) => {
    try {
      const blobUrl = await getAuthenticatedBlobUrl(fileUrl);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setUploadError('Failed to download file. Please try again.');
    }
  }, []);

  /* ── Image lightbox ────────────────────────────────────── */
  const handleImageClick = useCallback(async (fileUrl) => {
    try {
      const blobUrl = await getAuthenticatedBlobUrl(fileUrl);
      setLightbox({ url: blobUrl });
    } catch {
      setUploadError('Failed to load image preview.');
    }
  }, []);

  /* ── Delete handlers ───────────────────────────────────── */
  const handleDeleteForMe = useCallback(async (msgId) => {
    try {
      await api.delete(`/api/chat/messages/${msgId}/for-me`);
      // FIX (blob memory leak): free the image blob for this user's own
      // copy immediately — it's gone from their view, so there's no
      // reason to keep the cached object URL around.
      const target = messagesRef.current.find(m => m.id === msgId);
      if (target?.fileType === 'IMAGE' && target.fileUrl) revokeBlobUrl(target.fileUrl);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      // FIX: surface the backend's actual error (e.g. "Access denied…")
      // instead of a generic message that hides what really happened.
      setError(err.response?.data?.error || 'Failed to delete message. Please try again.');
    }
  }, []);

  const handleDeleteForEveryone = useCallback(async (msgId) => {
    if (!window.confirm('Delete this message for everyone? This cannot be undone.')) return;
    try {
      const { data } = await api.delete(`/api/chat/messages/${msgId}/for-everyone`);
      const target = messagesRef.current.find(m => m.id === msgId);
      if (target?.fileType === 'IMAGE' && target.fileUrl) revokeBlobUrl(target.fileUrl);
      setMessages(prev => prev.map(m => m.id === msgId ? data : m));
    } catch (err) {
      // FIX: the backend returns specific messages for this action — most
      // importantly the delete-window-expired case ("Delete for everyone is
      // only allowed within N minutes of sending this message") — which a
      // generic catch was previously discarding.
      setError(err.response?.data?.error || 'Failed to delete message for everyone. Please try again.');
    }
  }, []);

  /* ── Reaction handler ──────────────────────────────────── */
  const handleReact = useCallback(async (msgId, emoji) => {
    try {
      const { data } = await api.post(`/api/chat/messages/${msgId}/react`, { emoji });
      setMessages(prev => prev.map(m => m.id === msgId ? data : m));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add reaction.');
    }
  }, []);

  /* ── Memoize stable prop set for MessageRow ────────────── */
  const rowCallbacks = useMemo(() => ({
    onReact:             handleReact,
    onDeleteForMe:       handleDeleteForMe,
    onDeleteForEveryone: handleDeleteForEveryone,
    onDownload:          handleDownloadFile,
    onImageClick:        handleImageClick,
  }), [handleReact, handleDeleteForMe, handleDeleteForEveryone, handleDownloadFile, handleImageClick]);

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className={`chat-window ${embedded ? 'chat-window--embedded' : 'chat-window--modal'}`}>

      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">{recipientName?.charAt(0)?.toUpperCase() || '?'}</div>
          <div>
            <div className="chat-header-name">{recipientName || 'Recruiter'}</div>
            <div className="chat-header-sub">
              Hiring Conversation
              {wsConnected && <span className="chat-ws-dot" title="Live" />}
            </div>
          </div>
        </div>
        {onClose && (
          <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">✕</button>
        )}
      </div>

      {/* Messages area */}
      <div className="chat-messages" ref={messagesAreaRef} onScroll={handleScroll}>
        {loadingMore && <div className="chat-center-msg chat-loading-more">Loading older messages…</div>}
        {!hasMore && !loading && messages.length > 0 && (
          <div className="chat-center-msg chat-no-more">— Beginning of conversation —</div>
        )}
        {loading && <div className="chat-center-msg">Loading messages…</div>}
        {!loading && messages.length === 0 && (
          <div className="chat-center-msg chat-empty">
            <span className="chat-empty-icon">💬</span>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            isOwn={isOwnMsg(msg)}
            {...rowCallbacks}
          />
        ))}

        {error       && <div className="chat-error">{error}</div>}
        {uploadError && <div className="chat-error">{uploadError}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip,.txt,.xls,.xlsx"
          onChange={handleFileChange}
        />
        <button
          className="chat-attach-btn"
          title="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >📎</button>

        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKey}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          style={{ resize: 'none', overflow: 'hidden' }}
        />

        <button
          className={`chat-send-btn ${sending ? 'chat-send-btn--loading' : ''}`}
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          aria-label="Send"
        >
          {sending ? '…' : '➤'}
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="chat-lightbox" onClick={() => setLightbox(null)}>
          <div className="chat-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="chat-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox.url} alt="Preview" className="chat-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}