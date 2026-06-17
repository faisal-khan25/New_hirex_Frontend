import { useState } from 'react';
import { useFetch } from '../../hooks/useHooks';
import api from '../../services/api';
import { invalidateConvCache } from '../manager/RecruiterChat';
import './Applicants.css';

/* ─── Status Badge ───────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    HIRED:       { bg:'#dcfce7', color:'#16a34a', icon:'🏆', label:'Hired' },
    SHORTLISTED: { bg:'#ede9fe', color:'#7c3aed', icon:'✅', label:'Shortlisted' },
    REJECTED:    { bg:'#fee2e2', color:'#dc2626', icon:'✕',  label:'Rejected' },
    APPLIED:     { bg:'#dbeafe', color:'#2563eb', icon:'📋', label:'Applied' },
  };
  const s = cfg[status] || { bg:'#f3f4f6', color:'#6b7280', icon:'•', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 20, background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

/* ─── ATS Score Mini ─────────────────────────────── */
function ScorePill({ score }) {
  if (score == null) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#7c3aed' : '#dc2626';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${color}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: 11, fontWeight: 800, color, background: color+'10',
        flexShrink: 0,
      }}>{score}</div>
      <div style={{
        flex: 1, height: 5, background: '#e5e7eb',
        borderRadius: 99, overflow:'hidden', minWidth: 50,
      }}>
        <div style={{
          height: '100%', width:`${score}%`,
          background: color, borderRadius: 99,
          transition: 'width .4s ease',
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════ */
export default function Applicants() {
  const { data: jobs, loading } = useFetch('/api/manager/jobs');

  const [selectedJob,  setSelectedJob]  = useState(null);
  const [applicants,   setApplicants]   = useState([]);
  const [loadingApps,  setLoadingApps]  = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortField,    setSortField]    = useState('appliedAt');
  const [sortDir,      setSortDir]      = useState('desc');
  const [searchQ,      setSearchQ]      = useState('');

  const loadApplicants = async (job) => {
    setSelectedJob(job);
    setLoadingApps(true);
    setFilterStatus('ALL');
    setSortField('appliedAt');
    setSortDir('desc');
    setSearchQ('');
    try {
      const res = await api.get(`/api/manager/jobs/${job.id}/applicants`);
      setApplicants(res.data || []);
    } catch {
      setApplicants([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const updateStatus = async (appId, status) => {
    try {
      await api.put(`/api/manager/applications/${appId}/status`, { status });
      setApplicants(prev =>
        prev.map(a => a.id === appId ? { ...a, status } : a)
      );
      // When shortlisting or hiring, invalidate the conversation cache so
      // the new candidate appears immediately in RecruiterChat without waiting
      // for the next poll cycle.
      if (status === 'SHORTLISTED' || status === 'HIRED') {
        invalidateConvCache();
      }
    } catch { /* silent */ }
  };

  // Table sort
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const sortIcon = (f) => sortField !== f ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓';

  // Summary counts for current job
  const counts = {
    ALL:         applicants.length,
    HIRED:       applicants.filter(a => a.status === 'HIRED').length,
    SHORTLISTED: applicants.filter(a => a.status === 'SHORTLISTED').length,
    REJECTED:    applicants.filter(a => a.status === 'REJECTED').length,
    APPLIED:     applicants.filter(a => a.status === 'APPLIED').length,
  };

  const filtered = applicants
    .filter(a => filterStatus === 'ALL' || a.status === filterStatus)
    .filter(a =>
      searchQ === '' ||
      a.applicantName?.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.applicantEmail?.toLowerCase().includes(searchQ.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'atsScore') return mul * ((a.atsScore ?? -1) - (b.atsScore ?? -1));
      if (sortField === 'applicantName') return mul * (a.applicantName || '').localeCompare(b.applicantName || '');
      if (sortField === 'appliedAt') return mul * (a.appliedAt || '').localeCompare(b.appliedAt || '');
      return 0;
    });

  if (loading) return <div className="apps-loading">⏳ Loading jobs…</div>;

  return (
    <div className="apps-layout">

      {/* ── Sidebar ────────────────────────────────────────── */}
      <div className="apps-sidebar">
        <div className="apps-sidebar-head">
          <span className="apps-sidebar-icon">💼</span>
          <span>Your Job Postings</span>
        </div>
        {!jobs?.length && <div className="apps-sidebar-empty">No jobs posted yet</div>}
        {jobs?.map(job => (
          <div
            key={job.id}
            className={`apps-job-card ${selectedJob?.id === job.id ? 'apps-job-active' : ''}`}
            onClick={() => loadApplicants(job)}
          >
            <div className="apps-job-title">{job.title}</div>
            <div className="apps-job-loc">📍 {job.location}</div>
          </div>
        ))}
      </div>

      {/* ── Main ───────────────────────────────────────────── */}
      <div className="apps-main">

        {!selectedJob && (
          <div className="apps-empty-state">
            <div className="apps-empty-icon">👈</div>
            <h2>Select a Job</h2>
            <p>Choose a job posting from the sidebar to view and manage applicants.</p>
          </div>
        )}

        {selectedJob && (
          <>
            {/* Page header */}
            <div className="apps-page-header">
              <div>
                <h1>{selectedJob.title}</h1>
                <p>{applicants.length} applicant{applicants.length !== 1 ? 's' : ''} · {selectedJob.location}</p>
              </div>
            </div>

            {/* Status tabs */}
            <div className="apps-status-tabs">
              {['ALL','HIRED','SHORTLISTED','APPLIED','REJECTED'].map(s => (
                <button
                  key={s}
                  className={`apps-tab-btn ${filterStatus === s ? 'active' : ''}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === 'HIRED' ? '🏆' : s === 'SHORTLISTED' ? '✅' : s === 'REJECTED' ? '✕' : s === 'APPLIED' ? '📋' : '👥'}
                  {' '}{s} <span className="apps-tab-count">{counts[s]}</span>
                </button>
              ))}
            </div>

            {/* Search + sort toolbar */}
            <div className="apps-toolbar">
              <input
                className="apps-search-input"
                placeholder="🔍 Search by name or email…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
              <select className="apps-sort-select" value={`${sortField}:${sortDir}`}
                onChange={e => { const [f,d] = e.target.value.split(':'); setSortField(f); setSortDir(d); }}>
                <option value="appliedAt:desc">Applied At (Newest)</option>
                <option value="appliedAt:asc">Applied At (Oldest)</option>
                <option value="atsScore:desc">ATS Score (High → Low)</option>
                <option value="atsScore:asc">ATS Score (Low → High)</option>
                <option value="applicantName:asc">Name (A → Z)</option>
                <option value="applicantName:desc">Name (Z → A)</option>
              </select>
            </div>

            {loadingApps && (
              <div className="apps-loading-inline">
                <div className="apps-spinner" /> Loading applicants…
              </div>
            )}

            {!loadingApps && !filtered.length && (
              <div className="apps-no-apps">
                <div className="apps-empty-icon">📭</div>
                <p>{applicants.length ? 'No results for this filter.' : 'No applicants yet for this position.'}</p>
              </div>
            )}

            {/* Applicant Cards */}
            {!loadingApps && filtered.map(app => (
              <div key={app.id} className="apps-card">

                {/* Card header */}
                <div className="apps-card-header">
                  <div className="apps-candidate-info">
                    <div className="apps-avatar">{app.applicantName?.[0]?.toUpperCase()}</div>
                    <div>
                      <div className="apps-name">{app.applicantName}</div>
                      <div className="apps-email">{app.applicantEmail}</div>
                    </div>
                  </div>
                  <div className="apps-card-meta">
                    <StatusBadge status={app.status} />
                    {app.appliedAt && (
                      <div className="apps-applied-at">
                        Applied {new Date(app.appliedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* ATS Score Row */}
                <div className="apps-ats-row">
                  <span className="apps-ats-label">🤖 ATS Score</span>
                  <div style={{ flex: 1 }}>
                    <ScorePill score={app.atsScore} />
                  </div>
                  {app.matchPercentage != null && (
                    <span className="apps-match-pct">{app.matchPercentage}% match</span>
                  )}
                  {!app.hasResume && (
                    <span className="apps-no-resume">⚠ No resume uploaded</span>
                  )}
                </div>

                {/* Resume */}
                <div className="apps-resume-row">
                  {app.resumeId ? (
                    <>
                      <span className="apps-resume-label">📎 Resume:</span>
                      <a
                        href={`${window.__BACKEND_URL__ || ''}/api/manager/resume/${app.resumeId}/download`}
                        className="apps-resume-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download ⬇️
                      </a>
                    </>
                  ) : app.resumeUrl ? (
                    <>
                      <span className="apps-resume-label">📎 Resume:</span>
                      <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="apps-resume-link">
                        View Resume ↗
                      </a>
                    </>
                  ) : (
                    <span className="apps-no-resume">⚠️ No resume uploaded</span>
                  )}
                </div>

                {/* Cover letter */}
                {app.coverLetter && (
                  <div className="apps-cover">"{app.coverLetter}"</div>
                )}

                {/* Actions */}
                <div className="apps-actions">
                  <button
                    className="apps-shortlist-btn"
                    onClick={() => updateStatus(app.id, 'SHORTLISTED')}
                    disabled={app.status === 'SHORTLISTED'}
                  >✅ Shortlist</button>

                  <button
                    className="apps-reject-btn"
                    onClick={() => updateStatus(app.id, 'REJECTED')}
                    disabled={app.status === 'REJECTED'}
                  >✕ Reject</button>

                  <button
                    className="apps-hire-btn"
                    onClick={() => updateStatus(app.id, 'HIRED')}
                    disabled={app.status === 'HIRED'}
                  >🏆 Hire</button>
                </div>

              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
