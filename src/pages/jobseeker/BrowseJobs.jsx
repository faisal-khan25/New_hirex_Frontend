import { useState } from 'react';
import { useFetch } from '../../hooks/useHooks';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import useSEO from '../../hooks/useSeo';
import './BrowseJobs.css';

const QUICK_FILTERS = ['Full Time', 'Remote', 'Fresher', '0-1 Years', '1-3 Years', 'Work From Home'];

const FILTER_GROUPS = [
  { label: 'Experience', options: ['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5+ Years'] },
  { label: 'Job Type',   options: ['Full Time', 'Part Time', 'Contract', 'Internship'] },
  { label: 'Work Mode',  options: ['On-site', 'Remote', 'Hybrid'] },
];

/* Company initials logo fallback */
const CompanyLogo = ({ name }) => {
  const initials = name ? name.slice(0, 2).toUpperCase() : '??';
  return <div className="bj-logo">{initials[0]}</div>;
};

/* Relative time helper */
const timeAgo = (dateStr) => {
  if (!dateStr) return 'Recently';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}m ago`;
};

const SKILLS_MAP = {
  'Software Dev': ['React', 'Node.js', 'Java'],
  'Data':         ['Python', 'SQL', 'ML'],
  'Design':       ['Figma', 'Adobe XD', 'CSS'],
  'Sales':        ['CRM', 'B2B', 'Negotiation'],
};
const getSkills = (title = '') => {
  const key = Object.keys(SKILLS_MAP).find(k => title.toLowerCase().includes(k.toLowerCase()));
  return key ? SKILLS_MAP[key] : ['Communication', 'Teamwork'];
};

export default function BrowseJobs() {
  const { user } = useAuth();

  useSEO({
    title: 'Browse Jobs',
    description: 'Browse 50,000+ live job openings across India on HireX. Filter by experience, job type, and work mode, then apply in one click.',
    url: 'https://hirex.in/jobs',
  });

  const [keyword,     setKeyword]     = useState('');
  const [searched,    setSearched]    = useState('');
  const [activeQF,    setActiveQF]    = useState('');
  const [applyModal,  setApplyModal]  = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applyMsg,    setApplyMsg]    = useState('');

  const url = `/api/jobs/browse${searched ? `?keyword=${encodeURIComponent(searched)}` : ''}`;
  const { data: jobs, loading } = useFetch(url, [searched]);

  const handleSearch = (e) => { e.preventDefault(); setSearched(keyword); };

  const handleQuickFilter = (f) => {
    const next = activeQF === f ? '' : f;
    setActiveQF(next);
    setKeyword(next);
    setSearched(next);
  };

  const handleApply = async () => {
    try {
      const res = await api.post(`/api/jobseeker/apply/${applyModal.id}`, { coverLetter });
      setApplyMsg(res.data?.message || res.data || 'Applied successfully');
    } catch (e) {
      setApplyMsg(e.response?.data?.error || 'Failed to apply');
    }
  };

  const isSuccess = applyMsg && (
    applyMsg.toLowerCase().includes('success') ||
    applyMsg.toLowerCase().includes('applied')
  );

  return (
    <div className="bj-page">
      <div className="bj-inner">

        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <aside className="bj-sidebar">
          <p className="bj-sidebar-title">Filters</p>

          {FILTER_GROUPS.map(({ label, options }) => (
            <div key={label} className="bj-filter-group">
              <h4>{label}</h4>
              {options.map(opt => (
                <label key={opt}>
                  <input type="checkbox" onChange={() => {
                    setKeyword(opt); setSearched(opt);
                  }} />
                  {opt}
                </label>
              ))}
              <div className="bj-sidebar-divider" />
            </div>
          ))}

          <button className="bj-clear-btn" onClick={() => { setSearched(''); setKeyword(''); setActiveQF(''); }}>
            Clear all filters
          </button>
        </aside>

        {/* ── MAIN ────────────────────────────────────────── */}
        <div className="bj-main">

          {/* Top bar */}
          <div className="bj-topbar">
            <div>
              <h1>Browse Jobs</h1>
              <p className="bj-count">
                {loading ? 'Loading…' : `${jobs?.length || 0} jobs found${searched ? ` for "${searched}"` : ''}`}
              </p>
            </div>
            <div className="bj-sort">
              <label htmlFor="bj-sort-select">Sort by</label>
              <select id="bj-sort-select">
                <option>Most Relevant</option>
                <option>Newest First</option>
                <option>Salary: High to Low</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <form className="bj-search-form" onSubmit={handleSearch}>
            <div className="bj-search-box">
              <span className="bj-search-icon">🔍</span>
              <input
                className="bj-search-input"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Search by job title, skill, or keyword…"
              />
              {searched && (
                <button type="button" className="bj-clear-x" onClick={() => { setSearched(''); setKeyword(''); setActiveQF(''); }}>×</button>
              )}
              <button type="submit" className="bj-search-btn">Search</button>
            </div>
          </form>

          {/* Quick filters */}
          <div className="bj-quick-filters">
            {QUICK_FILTERS.map(f => (
              <button
                key={f}
                className={`bj-qf-btn${activeQF === f ? ' active' : ''}`}
                onClick={() => handleQuickFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="bj-loading">
              <div className="bj-spinner" />
              Fetching jobs…
            </div>
          )}

          {/* Empty */}
          {!loading && jobs?.length === 0 && (
            <div className="bj-empty">
              <div className="bj-empty-icon">🔍</div>
              <h3>No jobs found</h3>
              <p>Try a different keyword or remove some filters</p>
            </div>
          )}

          {/* Job cards */}
          {!loading && jobs?.length > 0 && (
            <div className="bj-grid">
              {jobs.map((job, idx) => {
                const skills  = getSkills(job.title);
                const isNew   = idx < 3;
                return (
                  <div key={job.id} className="bj-card">

                    {/* Top row */}
                    <div className="bj-card-top">
                      <div className="bj-card-left">
                        <CompanyLogo name={job.companyName} />
                        <div className="bj-card-info">
                          <h3 className="bj-job-title">{job.title}</h3>
                          <p className="bj-company">{job.companyName}</p>
                          <p className="bj-posted">{timeAgo(job.createdAt)}</p>
                        </div>
                      </div>
                      <div className="bj-card-badges">
                        <span className="bj-badge bj-badge-type">{job.jobType || 'Full Time'}</span>
                        {isNew && <span className="bj-badge bj-badge-new">New</span>}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="bj-meta">
                      <div className="bj-meta-item"><span>📍</span><span>{job.location || 'India'}</span></div>
                      <div className="bj-meta-item"><span>💼</span><span>{job.experience || 'Any experience'}</span></div>
                      {job.salary && <div className="bj-meta-item"><span>💰</span><span>{job.salary}</span></div>}
                    </div>

                    {/* Skills */}
                    <div className="bj-skills">
                      {skills.map(s => <span key={s} className="bj-skill">{s}</span>)}
                    </div>

                    {/* Footer */}
                    <div className="bj-card-footer">
                      <span className="bj-salary">{job.salary || 'Salary not disclosed'}</span>
                      <div className="bj-card-actions">
                        <button className="bj-save-btn">🔖 Save</button>
                        {user?.role === 'JOBSEEKER' && (
                          <button
                            className="bj-apply-btn"
                            onClick={() => { setApplyModal(job); setApplyMsg(''); setCoverLetter(''); }}
                          >
                            Apply Now
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── APPLY MODAL ─────────────────────────────────── */}
      {applyModal && (
        <div className="bj-modal-overlay" onClick={() => setApplyModal(null)}>
          <div className="bj-modal" onClick={e => e.stopPropagation()}>

            <div className="bj-modal-head">
              <div className="bj-modal-logo">🏢</div>
              <div>
                <h2>{applyModal.title}</h2>
                <p>{applyModal.companyName}</p>
              </div>
              <button className="bj-modal-close" onClick={() => setApplyModal(null)}>×</button>
            </div>

            <div className="bj-modal-divider" />

            {applyMsg ? (
              <div className={`bj-alert ${isSuccess ? 'bj-alert-success' : 'bj-alert-error'}`}>
                {applyMsg}
              </div>
            ) : (
              <>
                <label className="bj-modal-label">
                  Cover Letter <span>(optional)</span>
                </label>
                <textarea
                  rows={5}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  placeholder="Tell the recruiter why you're a great fit for this role…"
                />
                <div className="bj-modal-actions">
                  <button className="bj-modal-cancel" onClick={() => setApplyModal(null)}>Cancel</button>
                  <button className="bj-modal-submit" onClick={handleApply}>Submit Application</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}