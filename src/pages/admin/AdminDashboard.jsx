import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useHooks';
import api from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';

import './AdminDashboard.css';

/* ─── helpers ─── */
const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const avatarColor = (name = '') => {
  const palette = [
    { bg: '#eff6ff', color: '#2563eb' },
    { bg: '#f5f3ff', color: '#7c3aed' },
    { bg: '#dcfce7', color: '#16a34a' },
    { bg: '#fff3ee', color: '#ff6524' },
    { bg: '#fef3c7', color: '#d97706' },
  ];
  const idx = (name.charCodeAt(0) || 0) % palette.length;
  return palette[idx];
};

const formatDate = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ROLE_BADGES = {
  ADMIN:     { cls: 'badge-purple', label: 'Admin' },
  MANAGER:   { cls: 'badge-blue',   label: 'Recruiter' },
  JOBSEEKER: { cls: 'badge-green',  label: 'Job Seeker' },
};

const STATUS_BADGES = {
  APPLIED:     { cls: 'badge-blue',   label: 'Applied' },
  SHORTLISTED: { cls: 'badge-yellow', label: 'Shortlisted' },
  REJECTED:    { cls: 'badge-orange', label: 'Rejected' },
  HIRED:       { cls: 'badge-green',  label: 'Hired' },
};

const TABS = [
  { id: 'overview',     icon: '📊', label: 'Overview' },
  { id: 'users',        icon: '👥', label: 'Users' },
  { id: 'jobs',         icon: '💼', label: 'Jobs' },
  { id: 'applications', icon: '📋', label: 'Applications' },
];

const PIE_COLORS = ['#ff6524', '#2563eb', '#16a34a', '#7c3aed', '#d97706'];

/* ═══════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════ */
function OverviewTab({ stats }) {
  const STAT_CARDS = [
    { num: stats.totalJobSeekers, label: 'Job Seekers', icon: '👤', color: 'var(--brand-blue)',   bg: 'var(--brand-blue-light)' },
    { num: stats.totalManagers,   label: 'Recruiters',  icon: '🏢', color: '#7c3aed',             bg: '#f5f3ff' },
    { num: stats.totalJobs,       label: 'Jobs Posted', icon: '💼', color: 'var(--brand-green)',  bg: 'var(--brand-green-light)' },
    { num: stats.totalApplications, label: 'Applications', icon: '📋', color: 'var(--brand-red)', bg: 'var(--brand-red-light)' },
  ];

  const pieData = [
    { name: 'Job Seekers', value: Number(stats.totalJobSeekers) },
    { name: 'Recruiters',  value: Number(stats.totalManagers) },
  ];

  return (
    <>
      <div className="grid-4 stats-grid">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            </div>
            <div className="stat-number" style={{ color: s.color }}>{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 charts-grid">
        {/* Recruiter Growth */}
        <div className="card">
          <h3 className="chart-title">Monthly Recruiter Growth</h3>
          {stats.monthlyGrowth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="managers" stroke="var(--brand-red)"
                  strokeWidth={2} dot={{ r: 4 }} name="New Recruiters" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty chart-empty">No data yet</div>
          )}
        </div>

        {/* Company Applications */}
        <div className="card">
          <h3 className="chart-title">Company-wise Applications</h3>
          {stats.companyHiringTrends?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.companyHiringTrends} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="company" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="applications" fill="var(--brand-red)" radius={[0, 4, 4, 0]} name="Applications" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty chart-empty">No hiring data yet</div>
          )}
        </div>

        {/* User Distribution Pie */}
        <div className="card">
          <h3 className="chart-title">User Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80}
                dataKey="value" nameKey="name" label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hiring Trends Table */}
        <div className="card company-table-card" style={{ padding: 0 }}>
          <div className="company-table-header">
            <h3 className="table-title">Hiring Trends by Company</h3>
          </div>
          {stats.companyHiringTrends?.length === 0 ? (
            <div className="empty">No data available</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Company</th>
                    <th>Total Applications</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.companyHiringTrends?.map((row, i) => (
                    <tr key={i}>
                      <td className="table-index">{i + 1}</td>
                      <td className="table-company">{row.company}</td>
                      <td><span className="badge badge-orange">{row.applications}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   USERS TAB
═══════════════════════════════════════ */
function UsersTab() {
  const { data: users, loading } = useFetch('/api/admin/users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const matchSearch = !search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  if (loading) return <div className="loading"><div className="spinner" /> Loading users…</div>;

  return (
    <>
      <div className="users-header">
        <h2>All Users ({filtered.length})</h2>
        <div className="search-bar">
          <span>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
          />
        </div>
      </div>

      <div className="filter-chips">
        {['ALL', 'JOBSEEKER', 'MANAGER', 'ADMIN'].map(r => (
          <button
            key={r}
            className={`filter-chip ${roleFilter === r ? 'active' : ''}`}
            onClick={() => setRoleFilter(r)}
          >
            {r === 'ALL' ? 'All Roles' : ROLE_BADGES[r]?.label || r}
          </button>
        ))}
      </div>

      <div className="data-table-card">
        {filtered.length === 0 ? (
          <div className="empty">No users found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const av = avatarColor(u.name);
                  const rb = ROLE_BADGES[u.role] || { cls: 'badge-gray', label: u.role };
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar" style={{ background: av.bg, color: av.color }}>
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div className="user-name">{u.name}</div>
                            <div className="user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${rb.cls}`}>{rb.label}</span></td>
                      <td>{formatDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   JOBS TAB
═══════════════════════════════════════ */
function JobsTab() {
  const { data: jobs, loading } = useFetch('/api/admin/jobs');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j =>
      !search ||
      j.title?.toLowerCase().includes(search.toLowerCase()) ||
      j.company?.toLowerCase().includes(search.toLowerCase()) ||
      j.location?.toLowerCase().includes(search.toLowerCase())
    );
  }, [jobs, search]);

  if (loading) return <div className="loading"><div className="spinner" /> Loading jobs…</div>;

  return (
    <>
      <div className="users-header">
        <h2>All Jobs ({filtered.length})</h2>
        <div className="search-bar">
          <span>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, company, location…"
          />
        </div>
      </div>

      <div className="data-table-card">
        {filtered.length === 0 ? (
          <div className="empty">No jobs found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(j => (
                  <tr key={j.id}>
                    <td>
                      <div className="job-row-title">{j.title}</div>
                      <div className="job-row-company">{j.company}</div>
                    </td>
                    <td>{j.location || '—'}</td>
                    <td>{j.jobType ? <span className="badge badge-blue">{j.jobType}</span> : '—'}</td>
                    <td>
                      <span className={`job-status-dot ${j.active ? 'score-excellent' : 'score-poor'}`}>
                        <span className={`dot ${j.active ? 'dot-green' : 'dot-gray'}`} />
                        {j.active ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td>{formatDate(j.postedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   APPLICATIONS TAB
═══════════════════════════════════════ */
function ApplicationsTab() {
  const { data: apps, loading } = useFetch('/api/admin/applications');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => {
    if (!apps) return [];
    return apps.filter(a => {
      const matchSearch = !search ||
        a.applicantName?.toLowerCase().includes(search.toLowerCase()) ||
        a.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
        a.company?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [apps, search, statusFilter]);

  if (loading) return <div className="loading"><div className="spinner" /> Loading applications…</div>;

  return (
    <>
      <div className="users-header">
        <h2>All Applications ({filtered.length})</h2>
        <div className="search-bar">
          <span>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search applicant, job, company…"
          />
        </div>
      </div>

      <div className="filter-chips">
        {['ALL', 'APPLIED', 'SHORTLISTED', 'REJECTED', 'HIRED'].map(s => (
          <button
            key={s}
            className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'ALL' ? 'All Statuses' : STATUS_BADGES[s]?.label || s}
          </button>
        ))}
      </div>

      <div className="data-table-card">
        {filtered.length === 0 ? (
          <div className="empty">No applications found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Job</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const av = avatarColor(a.applicantName);
                  const sb = STATUS_BADGES[a.status] || { cls: 'badge-gray', label: a.status };
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar" style={{ background: av.bg, color: av.color }}>
                            {getInitials(a.applicantName)}
                          </div>
                          <div>
                            <div className="user-name">{a.applicantName}</div>
                            <div className="user-email">{a.applicantEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="job-row-title">{a.jobTitle}</td>
                      <td className="job-row-company">{a.company}</td>
                      <td><span className={`badge ${sb.cls}`}>{sb.label}</span></td>
                      <td>{formatDate(a.appliedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   ATS CHECKER TAB
═══════════════════════════════════════ */
function ScoreRing({ score }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const cls =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'fair' : 'poor';

  const verdict =
    score >= 80 ? '🎉 Excellent Match' :
    score >= 60 ? '👍 Good Match' :
    score >= 40 ? '⚠️ Needs Work' : '❌ Poor Match';

  return (
    <div className="score-ring-wrap">
      <div className="score-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none"
            className={`ring-${cls}`}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="score-ring-label">
          <span className={`score-ring-num score-${cls}`}>{score}</span>
          <span className="score-ring-pct">/ 100</span>
        </div>
      </div>
      <div className="score-label-col">
        <span className={`score-verdict score-${cls}`}>{verdict}</span>
        <span className="score-sub">ATS Compatibility Score</span>
      </div>
    </div>
  );
}

function AtsCheckerTab() {
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const canCheck = resumeText.trim().length > 50 && jobDesc.trim().length > 50;

  const runAts = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const prompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze the resume against the job description and return ONLY a valid JSON object — no preamble, no markdown, no explanation.

Resume:
---
${resumeText.trim().slice(0, 3000)}
---

Job Description:
---
${jobDesc.trim().slice(0, 2000)}
---

Return this exact JSON structure:
{
  "overallScore": <integer 0-100>,
  "breakdown": [
    { "category": "Skills Match",        "score": <0-100> },
    { "category": "Experience Relevance","score": <0-100> },
    { "category": "Education Match",     "score": <0-100> },
    { "category": "Keyword Density",     "score": <0-100> }
  ],
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "summary": "2-3 sentence overall assessment."
}

Rules: overallScore = weighted average of breakdown. matchedKeywords = important terms in BOTH texts (max 15). missingKeywords = job requirements NOT in resume (max 10). suggestions = 3-5 specific, actionable tips. Return ONLY the JSON.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data.content.map(b => b.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setError('ATS check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResumeText('');
    setJobDesc('');
    setResult(null);
    setError('');
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>
          AI-Powered ATS Checker
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
          Paste a candidate's resume and a job description. Our AI will score the match and provide actionable feedback.
        </p>
      </div>

      <div className="ats-layout">
        {/* Resume Input */}
        <div className="ats-input-card">
          <h3><span>📄</span> Resume Text</h3>
          <p>Paste the candidate's full resume content here</p>
          <textarea
            className="ats-textarea"
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
            placeholder="Paste resume text here…

Example:
John Doe
Software Engineer | 5+ years experience

Skills: React, Node.js, Python, AWS, Docker, PostgreSQL

Experience:
Senior Developer @ TechCorp (2021-Present)
- Built scalable REST APIs using Node.js
- Led team of 4 engineers..."
          />
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>
            {resumeText.length} characters
          </div>
        </div>

        {/* Job Description Input */}
        <div className="ats-input-card">
          <h3><span>💼</span> Job Description</h3>
          <p>Paste the full job description / requirements here</p>
          <textarea
            className="ats-textarea"
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
            placeholder="Paste job description here…

Example:
Senior Software Engineer — HirEx Technologies

We are looking for an experienced developer to join our engineering team.

Requirements:
- 3+ years experience with React or Angular
- Strong knowledge of Node.js and REST API design
- Experience with AWS or cloud platforms
- PostgreSQL or similar RDBMS..."
          />
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>
            {jobDesc.length} characters
          </div>
        </div>
      </div>

      <div className="ats-action-row">
        {result && (
          <button className="ats-btn ats-btn-secondary" onClick={reset}>
            ↩ Reset
          </button>
        )}
        <button
          className="ats-btn"
          onClick={runAts}
          disabled={!canCheck || loading}
        >
          {loading ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Analyzing…
            </>
          ) : (
            <><span>🤖</span> Run ATS Check</>
          )}
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--brand-red-light)', color: 'var(--brand-red)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="ats-result-card">
          <div className="ats-loading">
            <div className="spinner" />
            <p>AI is analyzing resume against job requirements…</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="ats-result-card">
          <div className="ats-result-header">
            <div className="ats-result-title">ATS Analysis Report</div>
            <ScoreRing score={result.overallScore} />
          </div>

          <div className="ats-result-body">
            {/* Score Breakdown */}
            {result.breakdown && (
              <div className="ats-section">
                <div className="ats-section-title">📊 Score Breakdown</div>
                <div className="breakdown-list">
                  {result.breakdown.map((item, i) => (
                    <div key={i} className="breakdown-item">
                      <div className="breakdown-row">
                        <span className="breakdown-label">{item.category}</span>
                        <span className="breakdown-pct" style={{
                          color: item.score >= 70 ? 'var(--brand-green)' :
                                 item.score >= 40 ? 'var(--brand-yellow)' : 'var(--brand-red)'
                        }}>
                          {item.score}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${item.score}%`,
                            background: item.score >= 70 ? 'var(--brand-green)' :
                                        item.score >= 40 ? 'var(--brand-yellow)' : 'var(--brand-red)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid-2" style={{ gap: 20 }}>
              {/* Matched Keywords */}
              {result.matchedKeywords?.length > 0 && (
                <div className="ats-section">
                  <div className="ats-section-title">✅ Matched Keywords ({result.matchedKeywords.length})</div>
                  <div className="keyword-chips">
                    {result.matchedKeywords.map((kw, i) => (
                      <span key={i} className="keyword-chip kw-match">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {result.missingKeywords?.length > 0 && (
                <div className="ats-section">
                  <div className="ats-section-title">❌ Missing Keywords ({result.missingKeywords.length})</div>
                  <div className="keyword-chips">
                    {result.missingKeywords.map((kw, i) => (
                      <span key={i} className="keyword-chip kw-missing">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            {result.suggestions?.length > 0 && (
              <div className="ats-section">
                <div className="ats-section-title">💡 AI Recommendations</div>
                <div className="suggestions-list">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="suggestion-item">
                      <span className="suggestion-icon">→</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {result.summary && (
              <div className="ats-section">
                <div className="ats-section-title">📝 Summary</div>
                <div style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                  {result.summary}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: stats, loading } = useFetch('/api/admin/dashboard');

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Page Header */}
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform management and AI-powered analytics</p>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview'     && stats && <OverviewTab stats={stats} />}
      {activeTab === 'users'        && <UsersTab />}
      {activeTab === 'jobs'         && <JobsTab />}
      {activeTab === 'applications' && <ApplicationsTab />}
    </div>
  );
}
