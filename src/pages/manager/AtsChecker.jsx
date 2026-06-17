import { useState, useEffect, useMemo, memo } from 'react';
import { List } from 'react-window';

import api from '../../services/api';
import { useDebouncedValue } from '../../hooks/useHooks';
import './AtsChecker.css';

// PERF: row height must match .ac-vtable-row in AtsChecker.css — react-window
// needs a fixed pixel height up front to compute total scroll height and
// which rows are currently in the viewport.
const RESULT_ROW_HEIGHT = 64;
// Below this many rows, plain rendering is simpler and just as fast — only
// pay for virtualization once a list is actually long enough to matter.
const VIRTUALIZE_THRESHOLD = 30;

/* ─── Score Ring (unchanged from original) ─────────────────────────── */
// PERF FIX: memoized — this re-renders for every row in the results table,
// so without React.memo, every keystroke in the search box (which changes
// `filteredResults`'s array identity) re-renders every ring even though
// most rows' score/size props didn't change.
const ScoreRing = memo(function ScoreRing({ score, size = 96 }) {
  const r      = size === 64 ? 24 : 38;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color  = score >= 80 ? '#16a34a' : score >= 60 ? '#4f46e5' : score >= 40 ? '#d97706' : '#dc2626';

  return (
    <div className="ac-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e6f0" strokeWidth={size===64?5:8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={size===64?5:8}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform:`rotate(-90deg)`, transformOrigin:`${size/2}px ${size/2}px`, transition:'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="ac-ring-label">
        <span className="ac-ring-num" style={{ color, fontSize: size===64?14:20 }}>{score}</span>
        <span className="ac-ring-denom">/100</span>
      </div>
    </div>
  );
});

/* ─── Status Badge ───────────────────────────────────────────────────── */
const StatusBadge = memo(function StatusBadge({ status }) {
  const cfg = {
    HIRED:       { bg:'#dcfce7', color:'#16a34a', icon:'🏆' },
    SHORTLISTED: { bg:'#ede9fe', color:'#7c3aed', icon:'✅' },
    REJECTED:    { bg:'#fee2e2', color:'#dc2626', icon:'✕'  },
    APPLIED:     { bg:'#dbeafe', color:'#2563eb', icon:'📋' },
  };
  const s = cfg[status] || { bg:'#f3f4f6', color:'#6b7280', icon:'•' };
  return (
    <span className="ac-status-badge" style={{ background: s.bg, color: s.color }}>
      {s.icon} {status}
    </span>
  );
});

/* ─── Summary Card ───────────────────────────────────────────────────── */
const SummaryCard = memo(function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="ac-summary-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="ac-summary-icon">{icon}</div>
      <div className="ac-summary-value" style={{ color }}>{value ?? '—'}</div>
      <div className="ac-summary-label">{label}</div>
    </div>
  );
});

/* ─── Progress Bar ───────────────────────────────────────────────────── */
const ProgressBar = memo(function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="ac-progress-wrap">
      <div className="ac-progress-header">
        <span>{label}</span>
        <span>{current} / {total} ({pct}%)</span>
      </div>
      <div className="ac-progress-track">
        <div className="ac-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
});

/* ─── Virtualized results row ───────────────────────────────────────── */
// PERF: react-window only mounts the ~10-15 rows actually visible in the
// scroll viewport instead of all of them — with a few hundred resumes this
// is the difference between mounting a handful of DOM nodes vs. thousands.
//
// BUG FIX: this was previously written as a `FixedSizeList` itemRenderer
// (react-window v1 API — receives a single `data` array prop and reads
// `data[index]`). The installed package is react-window v2.2.7, whose API
// was completely rewritten: there is no `FixedSizeList` export at all, and
// the `List` component's `rowComponent` receives `index`/`style` plus
// whatever object you pass as `rowProps` spread directly onto the props
// (not nested under `data`). The old code would have thrown
// "FixedSizeList is not defined" the moment a manager had 30+ resumes
// (VIRTUALIZE_THRESHOLD), crashing the whole ATS Checker page.
const ResultRow = memo(function ResultRow({ index, style, results }) {
  const r = results[index];
  return (
    <div className={`ac-vtable-row ${!r.processed ? 'ac-row-skipped' : ''}`} style={style}>
      <div className="ac-vtable-cell ac-td-num">{index + 1}</div>
      <div className="ac-vtable-cell">
        <div className="ac-candidate-cell">
          <div className="ac-avatar">{r.candidateName?.[0]?.toUpperCase()}</div>
          <span className="ac-cand-name">{r.candidateName}</span>
        </div>
      </div>
      <div className="ac-vtable-cell ac-td-email">{r.candidateEmail}</div>
      <div className="ac-vtable-cell ac-td-file">{r.fileName || '—'}</div>
      <div className="ac-vtable-cell">
        <div className="ac-score-cell">
          <ScoreRing score={r.atsScore} size={48} />
          {!r.processed && <span className="ac-no-text-warn">No text</span>}
        </div>
      </div>
      <div className="ac-vtable-cell">
        <div className="ac-match-bar-wrap">
          <div className="ac-match-bar-track">
            <div
              className="ac-match-bar-fill"
              style={{
                width: `${r.matchPercentage}%`,
                background: r.matchPercentage >= 80 ? '#16a34a' : r.matchPercentage >= 60 ? '#7c3aed' : '#dc2626'
              }}
            />
          </div>
          <span className="ac-match-pct">{r.matchPercentage}%</span>
        </div>
      </div>
      <div className="ac-vtable-cell"><StatusBadge status={r.status} /></div>
    </div>
  );
}, (prev, next) => prev.results === next.results && prev.index === next.index && prev.style === next.style);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function AtsChecker() {

  /* ── State: view mode ─────────────────────────────────────────────── */
  const [view, setView] = useState('bulk'); // 'bulk' | 'single'

  /* ── State: single-candidate mode ────────────────────────────────── */
  const [candidates,    setCandidates]  = useState([]);
  const [loadingList,   setLoadingList] = useState(true);
  const [listError,     setListError]   = useState('');
  const [selected,      setSelected]    = useState(null);
  const [singleResult,  setSingleResult] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError,   setSingleError] = useState('');

  /* ── State: bulk mode ────────────────────────────────────────────── */
  const [summary,         setSummary]        = useState(null);
  const [summaryLoading,  setSummaryLoading] = useState(true);
  const [bulkResults,     setBulkResults]    = useState([]);
  const [bulkLoading,     setBulkLoading]    = useState(false);
  const [bulkError,       setBulkError]      = useState('');
  const [bulkStats,       setBulkStats]      = useState(null);
  const [bulkProgress,    setBulkProgress]   = useState({ current: 0, total: 0 });

  /* ── State: table filters ────────────────────────────────────────── */
  const [filterStatus,   setFilterStatus]  = useState('ALL');
  const [sortField,      setSortField]     = useState('atsScore');
  const [sortDir,        setSortDir]       = useState('desc');
  const [searchQ,        setSearchQ]       = useState('');
  // PERF FIX: debounce the search box so filtering ~hundreds of resumes
  // doesn't re-run (and re-render the whole table) on every single
  // keystroke — only once the user pauses typing for 200ms.
  const debouncedSearchQ = useDebouncedValue(searchQ, 200);

  /* ── Load candidate list + summary on mount ──────────────────────── */
  useEffect(() => {
    api.get('/api/manager/resumes')
      .then(res => setCandidates(res.data || []))
      .catch(() => setListError('Failed to load candidate resumes.'))
      .finally(() => setLoadingList(false));

    loadSummary();
  }, []);

  const loadSummary = () => {
    setSummaryLoading(true);
    api.get('/api/ats/summary')
      .then(res => setSummary(res.data))
      .catch(() => {/* summary is optional */})
      .finally(() => setSummaryLoading(false));
  };

  /* ── Derive status from ATS score ───────────────────────────────── */
  const scoreToStatus = (score) =>
    score >= 80 ? 'HIRED' : score >= 60 ? 'SHORTLISTED' : 'REJECTED';

  /* ── Auto-update a single application status ─────────────────────── */
  const autoUpdateStatus = async (applicationId, status) => {
    try {
      await api.put(`/api/manager/applications/${applicationId}/status`, { status });
    } catch { /* silent — status update is best-effort */ }
  };

  /* ── Single candidate ATS ────────────────────────────────────────── */
  const runSingleAts = async (candidate) => {
    setSelected(candidate);
    setSingleResult(null);
    setSingleError('');
    setSingleLoading(true);
    try {
      const res = await api.get(`/api/manager/resume/${candidate.resumeId}/ats-score`);
      const result = res.data;
      setSingleResult(result);

      // Auto-update application status based on ATS score
      if (candidate.applicationId && result.atsScore != null) {
        const autoStatus = scoreToStatus(result.atsScore);
        await autoUpdateStatus(candidate.applicationId, autoStatus);
        setSingleResult(prev => ({ ...prev, autoUpdatedStatus: autoStatus }));
        // Notify conversation list to refresh
        window.dispatchEvent(new CustomEvent('ats:shortlisted'));
      }
    } catch {
      setSingleError('ATS analysis failed. Please try again.');
    } finally {
      setSingleLoading(false);
    }
  };

  /* ── Bulk: Analyze All (score + auto-update statuses) ───────────── */
  const handleAnalyzeAll = async () => {
    setBulkLoading(true);
    setBulkError('');
    setBulkResults([]);
    setBulkStats(null);
    setBulkProgress({ current: 0, total: candidates.length });

    try {
      const res = await api.post('/api/ats/analyze-all');
      const data = res.data;
      const results = data.results || [];
      setBulkResults(results);
      setBulkProgress({ current: data.totalProcessed + data.totalSkipped, total: data.totalProcessed + data.totalSkipped });

      // Auto-update each application status based on ATS score
      let savedCount = 0;
      await Promise.allSettled(
        results
          .filter(r => r.processed && r.applicationId && r.atsScore != null)
          .map(async (r) => {
            const status = scoreToStatus(r.atsScore);
            try {
              await api.put(`/api/manager/applications/${r.applicationId}/status`, { status });
              savedCount++;
            } catch { /* continue for others */ }
          })
      );

      setBulkStats({
        totalProcessed:   data.totalProcessed,
        totalSkipped:     data.totalSkipped,
        totalHired:       data.totalHired,
        totalShortlisted: data.totalShortlisted,
        totalRejected:    data.totalRejected,
        message:          data.message,
        saved:            savedCount > 0,
        savedCount,
      });

      loadSummary();
      // Notify RecruiterChat to refresh its conversation list immediately
      window.dispatchEvent(new CustomEvent('ats:shortlisted'));
    } catch {
      setBulkError('Bulk analysis failed. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  };

  /* ── Bulk: Process All (ATS + save statuses) ─────────────────────── */
  const handleProcessAll = async () => {
    if (!window.confirm(
      'This will analyze ALL resumes and automatically update candidate statuses (Hire / Shortlist / Reject) in the database.\n\nContinue?'
    )) return;

    setBulkLoading(true);
    setBulkError('');
    setBulkResults([]);
    setBulkStats(null);
    setBulkProgress({ current: 0, total: candidates.length });

    try {
      const res = await api.post('/api/ats/process-all');
      const data = res.data;
      setBulkResults(data.results || []);
      setBulkStats({
        totalProcessed:   data.totalProcessed,
        totalSkipped:     data.totalSkipped,
        totalHired:       data.totalHired,
        totalShortlisted: data.totalShortlisted,
        totalRejected:    data.totalRejected,
        message:          data.message,
        saved:            true,
      });
      setBulkProgress({ current: data.totalProcessed + data.totalSkipped, total: data.totalProcessed + data.totalSkipped });
      // Refresh summary counts + notify conversation list
      loadSummary();
      window.dispatchEvent(new CustomEvent('ats:shortlisted'));
    } catch {
      setBulkError('Process All failed. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  };

  /* ── Table helpers ───────────────────────────────────────────────── */
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  // PERF FIX: memoized — previously this filter+sort chain ran on every
  // single render of AtsChecker (e.g. every time bulkLoading or any other
  // unrelated state changed), even when bulkResults/filterStatus/search/sort
  // hadn't changed. Now it only recomputes when one of its real inputs does.
  const filteredResults = useMemo(() => {
    const q = debouncedSearchQ.toLowerCase();
    return bulkResults
      .filter(r => filterStatus === 'ALL' || r.status === filterStatus)
      .filter(r =>
        q === '' ||
        r.candidateName?.toLowerCase().includes(q) ||
        r.candidateEmail?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const mul = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'atsScore') return mul * (a.atsScore - b.atsScore);
        if (sortField === 'candidateName') return mul * (a.candidateName || '').localeCompare(b.candidateName || '');
        return 0;
      });
  }, [bulkResults, filterStatus, debouncedSearchQ, sortField, sortDir]);

  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════════════════════ */
  return (
    <div className="ac-page">
      <div className="ac-inner">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="ac-header">
          <div className="ac-header-icon">🤖</div>
          <div style={{ flex: 1 }}>
            <h1>ATS Resume Checker</h1>
            <p>Bulk-analyze all uploaded resumes in one click. Automatically assign Hire / Shortlist / Reject based on ATS score.</p>
          </div>
          <div className="ac-view-toggle">
            <button
              className={`ac-toggle-btn ${view === 'bulk' ? 'active' : ''}`}
              onClick={() => setView('bulk')}
            >⚡ Bulk Mode</button>
            <button
              className={`ac-toggle-btn ${view === 'single' ? 'active' : ''}`}
              onClick={() => setView('single')}
            >🔍 Single Check</button>
          </div>
        </div>

        {/* ── Score Legend ────────────────────────────────────────────── */}
        <div className="ac-rules-strip">
          {[
            { range:'80–100', label:'Excellent → Hire',       color:'#16a34a' },
            { range:'60–79',  label:'Good → Shortlist',       color:'#4f46e5' },
            { range:'< 60',   label:'Below par → Reject',     color:'#dc2626' },
          ].map(r => (
            <div key={r.range} className="ac-rule-item">
              <span className="ac-rule-badge" style={{ background: r.color+'18', color: r.color, border:`1px solid ${r.color}40` }}>{r.range}</span>
              <span className="ac-rule-label">{r.label}</span>
            </div>
          ))}
        </div>

        {/* ════════ BULK MODE ════════════════════════════════════════ */}
        {view === 'bulk' && (
          <>
            {/* Dashboard Summary */}
            <div className="ac-summary-grid">
              <SummaryCard label="Total Applicants"  value={summary?.totalApplicants}  color="#2563eb" icon="👥" />
              <SummaryCard label="Hired"             value={summary?.totalHired}        color="#16a34a" icon="🏆" />
              <SummaryCard label="Shortlisted"       value={summary?.totalShortlisted}  color="#7c3aed" icon="✅" />
              <SummaryCard label="Rejected"          value={summary?.totalRejected}     color="#dc2626" icon="✕"  />
              <SummaryCard label="Pending Review"    value={summary?.totalPending}      color="#d97706" icon="⏳" />
              <SummaryCard label="Resumes Uploaded"  value={summary?.totalWithResume}   color="#0891b2" icon="📄" />
            </div>

            {/* Action Buttons */}
            <div className="ac-bulk-actions">
              <button
                className="ac-analyze-btn"
                onClick={handleAnalyzeAll}
                disabled={bulkLoading}
              >
                {bulkLoading ? <span className="ac-btn-spinner" /> : '🔍'}
                Analyze All Resumes
                <span className="ac-btn-sub">Score only – no DB changes</span>
              </button>

              <button
                className="ac-process-btn"
                onClick={handleProcessAll}
                disabled={bulkLoading}
              >
                {bulkLoading ? <span className="ac-btn-spinner" /> : '⚡'}
                Process All Candidates
                <span className="ac-btn-sub">Score + auto-update statuses</span>
              </button>
            </div>

            {/* Progress Bar */}
            {bulkLoading && (
              <div className="ac-loading-card">
                <div className="ac-loading-spinner" />
                <h3>Processing resumes…</h3>
                <p>Analyzing in batches of 50. Please wait.</p>
                <ProgressBar current={bulkProgress.current} total={bulkProgress.total || candidates.length} label="Resumes Analyzed" />
              </div>
            )}

            {/* Error */}
            {bulkError && <div className="ac-error">{bulkError}</div>}

            {/* Bulk stats banner */}
            {bulkStats && !bulkLoading && (
              <div className={`ac-bulk-banner ${bulkStats.saved ? 'saved' : ''}`}>
                <div className="ac-bulk-banner-main">
                  {bulkStats.saved ? '✅ Statuses saved to database' : '🔍 Analysis complete (preview only)'}
                </div>
                <div className="ac-bulk-banner-counts">
                  <span style={{color:'#16a34a'}}>🏆 Hired: <b>{bulkStats.totalHired}</b></span>
                  <span style={{color:'#7c3aed'}}>✅ Shortlisted: <b>{bulkStats.totalShortlisted}</b></span>
                  <span style={{color:'#dc2626'}}>✕ Rejected: <b>{bulkStats.totalRejected}</b></span>
                  {bulkStats.totalSkipped > 0 &&
                    <span style={{color:'#d97706'}}>⚠ Skipped: <b>{bulkStats.totalSkipped}</b></span>}
                </div>
                <div className="ac-bulk-banner-msg">{bulkStats.message}</div>
              </div>
            )}

            {/* Results Table */}
            {bulkResults.length > 0 && !bulkLoading && (
              <div className="ac-table-wrap">
                <div className="ac-table-toolbar">
                  <input
                    className="ac-search-input"
                    placeholder="🔍 Search by name or email…"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                  />
                  <select className="ac-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="HIRED">🏆 Hired</option>
                    <option value="SHORTLISTED">✅ Shortlisted</option>
                    <option value="REJECTED">✕ Rejected</option>
                  </select>
                  <span className="ac-count-badge">{filteredResults.length} results</span>
                </div>

                <div className="ac-table-scroll">
                  <div className="ac-vtable" role="table">
                    <div className="ac-vtable-row ac-vtable-header" role="row">
                      <div className="ac-vtable-cell" role="columnheader">#</div>
                      <div className="ac-vtable-cell ac-sortable" role="columnheader" onClick={() => toggleSort('candidateName')}>
                        Candidate{sortIcon('candidateName')}
                      </div>
                      <div className="ac-vtable-cell" role="columnheader">Email</div>
                      <div className="ac-vtable-cell" role="columnheader">Resume</div>
                      <div className="ac-vtable-cell ac-sortable" role="columnheader" onClick={() => toggleSort('atsScore')}>
                        ATS Score{sortIcon('atsScore')}
                      </div>
                      <div className="ac-vtable-cell" role="columnheader">Match %</div>
                      <div className="ac-vtable-cell" role="columnheader">Status</div>
                    </div>

                    {filteredResults.length >= VIRTUALIZE_THRESHOLD ? (
                      <List
                        style={{ height: Math.min(filteredResults.length, 8) * RESULT_ROW_HEIGHT }}
                        rowComponent={ResultRow}
                        rowCount={filteredResults.length}
                        rowHeight={RESULT_ROW_HEIGHT}
                        rowProps={{ results: filteredResults }}
                      />
                    ) : (
                      // Small lists: skip virtualization, just render rows directly —
                      // simpler and there's no scroll-performance problem to solve yet.
                      filteredResults.map((r, i) => (
                        <ResultRow key={r.resumeId} index={i} results={filteredResults} style={undefined} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════ SINGLE MODE ══════════════════════════════════════ */}
        {view === 'single' && (
          <>
            {!selected && (
              <div className="ac-input-card">
                <div className="ac-input-label">
                  <span className="ac-input-icon">👥</span>
                  <div>
                    <h3>Candidate Resumes</h3>
                    <p>Click "Run ATS" to score an individual candidate's resume</p>
                  </div>
                </div>

                {loadingList && (
                  <div style={{ padding:'20px', textAlign:'center', color:'#64748b' }}>
                    <div className="ac-btn-spinner" style={{ display:'inline-block', marginRight:8 }} />
                    Loading candidates…
                  </div>
                )}
                {listError && <div className="ac-error">{listError}</div>}

                {!loadingList && candidates.length === 0 && !listError && (
                  <div style={{ padding:'20px', textAlign:'center', color:'#64748b' }}>
                    No resumes uploaded yet.
                  </div>
                )}

                {candidates.length > 0 && (
                  <div className="ac-candidates-list">
                    {candidates.map(c => (
                      <div key={c.resumeId} className="ac-candidate-row">
                        <div className="ac-avatar">{c.candidateName?.[0]?.toUpperCase()}</div>
                        <div className="ac-cand-details">
                          <div className="ac-cand-name">{c.candidateName}</div>
                          <div className="ac-cand-email">{c.candidateEmail}</div>
                          <div className="ac-cand-file">📄 {c.fileName}
                            {!c.hasText && <span className="ac-no-text-warn">⚠ No text extracted</span>}
                          </div>
                        </div>
                        <button
                          className="ac-run-btn"
                          onClick={() => runSingleAts(c)}
                          disabled={!c.hasText}
                          title={!c.hasText ? 'Resume text could not be extracted' : ''}
                        >🤖 Run ATS</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selected && (
              <div className="ac-action-bar">
                <button className="ac-reset-btn" onClick={() => { setSelected(null); setSingleResult(null); setSingleError(''); }}>
                  ↩ Back to Candidates
                </button>
                <div style={{ fontSize:14, color:'#64748b' }}>
                  Checking: <strong>{selected.candidateName}</strong> — {selected.fileName}
                </div>
              </div>
            )}

            {singleError && <div className="ac-error">{singleError}</div>}

            {singleLoading && (
              <div className="ac-loading-card">
                <div className="ac-loading-spinner" />
                <h3>Analyzing resume…</h3>
                <p>Running keyword-based ATS scoring on {selected?.candidateName}'s resume</p>
              </div>
            )}

            {singleResult && !singleLoading && (
              <div className="ac-result">
                <div className="ac-result-top">
                  <div>
                    <h2>ATS Analysis Report</h2>
                    <p>{selected?.candidateName} — {selected?.fileName}</p>
                    <StatusBadge status={
                      singleResult.atsScore >= 80 ? 'HIRED' :
                      singleResult.atsScore >= 60 ? 'SHORTLISTED' : 'REJECTED'
                    } />
                  </div>
                  <ScoreRing score={singleResult.atsScore} />
                </div>

                <div className="ac-result-body">
                  {singleResult.matchedKeywords?.length > 0 && (
                    <div className="ac-keywords-row">
                      <div className="ac-section">
                        <h4>✅ Matched Keywords ({singleResult.matchedKeywords.length})</h4>
                        <div className="ac-chips">
                          {singleResult.matchedKeywords.map((kw, i) => (
                            <span key={i} className="ac-chip ac-chip-match">{kw}</span>
                          ))}
                        </div>
                      </div>
                      {singleResult.missingKeywords?.length > 0 && (
                        <div className="ac-section">
                          <h4>❌ Missing Keywords ({singleResult.missingKeywords.length})</h4>
                          <div className="ac-chips">
                            {singleResult.missingKeywords.map((kw, i) => (
                              <span key={i} className="ac-chip ac-chip-miss">{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {singleResult.suggestions?.length > 0 && (
                    <div className="ac-section">
                      <h4>💡 Recommendations</h4>
                      <div className="ac-suggestions">
                        {singleResult.suggestions.map((s, i) => (
                          <div key={i} className="ac-suggestion">
                            <span className="ac-suggestion-arrow">→</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}