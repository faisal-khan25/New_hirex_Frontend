import { useState, useMemo, useEffect, useRef } from 'react';
import { useFetch, useForm } from '../../hooks/useHooks';
import api from '../../services/api';
import './ManageJobs.css';

const EMPTY_JOB = {
  title:       '',
  description: '',
  skills:      '',
  salary:      '',
  location:    '',
  jobType:     'Full Time',
};

const TYPE_CLASS = {
  'Full Time':  'mj-type-full',
  'Part Time':  'mj-type-part',
  'Internship': 'mj-type-intern',
  'Contract':   'mj-type-contract',
};

/* Relative date */
const timeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7)  return `${diff} days ago`;
  return `${Math.floor(diff / 7)}w ago`;
};

export default function ManageJobs() {
  const { data, loading, refetch } = useFetch('/api/manager/jobs');
  const [jobs, setJobs] = useState([]);
  const deletedIds = useRef(new Set()); // track locally deleted IDs

  useEffect(() => {
    if (data) {
      // Filter out any IDs the user already deleted this session
      setJobs(data.filter(j => !deletedIds.current.has(j.id)));
    }
  }, [data]); // eslint-disable-line

  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [deleting,   setDeleting]   = useState(null); // id being deleted
  const { form, setForm, onChange, reset } = useForm(EMPTY_JOB);

  /* stats */
  const totalApps   = jobs.reduce((s, j) => s + (j.applicationCount || 0), 0);
  const activeCount = jobs.length;

  /* filtered list */
  const filtered = useMemo(() =>
    search.trim()
      ? jobs.filter(j =>
          j.title?.toLowerCase().includes(search.toLowerCase()) ||
          j.location?.toLowerCase().includes(search.toLowerCase())
        )
      : jobs,
  [jobs, search]);

  const openNew = () => { reset(); setEditingId(null); setShowForm(true); setError(''); };

  const openEdit = (job) => {
    setForm({ ...job, skills: job.skills || '', description: job.description || '' });
    setEditingId(job.id);
    setShowForm(true);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/api/manager/jobs/${editingId}`, form);
      } else {
        await api.post('/api/manager/jobs', form);
      }
      setShowForm(false);
      refetch(); // re-fetch list from server — no page reload
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save job. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this job posting? This cannot be undone.')) return;

    setDeleting(id);

    // Mark this ID as deleted so refetch won't bring it back
    deletedIds.current.add(id);

    // Remove from UI immediately
    setJobs(prev => prev.filter(j => j.id !== id));

    try {
      await api.delete(`/api/manager/jobs/${id}`);
    } catch (err) {
      console.error('Delete failed:', err.response?.status, err.response?.data);
      // Undo — remove from deleted set and restore
      deletedIds.current.delete(id);
      setJobs(data?.filter(j => !deletedIds.current.has(j.id)) || []);
      alert(
        `Delete failed (${err.response?.status || 'network error'}): ` +
        (err.response?.data?.error || err.message || 'Please try again.')
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mj-page">
      <div className="mj-inner">

        {/* ── Topbar ──────────────────────────────────────── */}
        <div className="mj-topbar">
          <div className="mj-topbar-left">
            <h1>Job Postings</h1>
            <p>
              {loading ? 'Loading…' : `${activeCount} active posting${activeCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="mj-post-btn" onClick={openNew}>
            + Post New Job
          </button>
        </div>

        {/* ── Stats strip ─────────────────────────────────── */}
        {!loading && (
          <div className="mj-stats">
            <div className="mj-stat-card">
              <div className="mj-stat-icon">📋</div>
              <div>
                <div className="mj-stat-num">{activeCount}</div>
                <div className="mj-stat-label">Active Postings</div>
              </div>
            </div>
            <div className="mj-stat-card">
              <div className="mj-stat-icon">👥</div>
              <div>
                <div className="mj-stat-num">{totalApps}</div>
                <div className="mj-stat-label">Total Applications</div>
              </div>
            </div>
            <div className="mj-stat-card">
              <div className="mj-stat-icon">🎯</div>
              <div>
                <div className="mj-stat-num">
                  {activeCount > 0 ? Math.round(totalApps / activeCount) : 0}
                </div>
                <div className="mj-stat-label">Avg. per Job</div>
              </div>
            </div>
          </div>
        )}

        {/* ── List card ───────────────────────────────────── */}
        <div className="mj-list-card">
          <div className="mj-list-header">
            <h2>All Jobs</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search jobs…"
                className="mj-search-input-inline"
              />
              <span className="mj-badge">{filtered.length}</span>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mj-loading">
              <div className="mj-spinner" /> Loading jobs…
            </div>
          )}

          {/* Empty */}
          {!loading && jobs.length === 0 && (
            <div className="mj-empty">
              <div className="mj-empty-icon">📋</div>
              <h3>No job postings yet</h3>
              <p>Create your first job posting to start receiving applications.</p>
              <button className="mj-post-btn" onClick={openNew}>+ Post First Job</button>
            </div>
          )}

          {/* No search results */}
          {!loading && jobs.length > 0 && filtered.length === 0 && (
            <div className="mj-empty">
              <div className="mj-empty-icon">🔍</div>
              <h3>No matches</h3>
              <p>Try a different search term.</p>
            </div>
          )}

          {/* Job rows */}
          {!loading && filtered.map((job) => (
            <div key={job.id} className="mj-job-row">

              <div className="mj-job-icon">💼</div>

              <div className="mj-job-info">
                <h3 className="mj-job-title">{job.title}</h3>
                <div className="mj-job-meta">
                  {job.location && <span>📍 {job.location}</span>}
                  {job.salary   && <span>💰 {job.salary}</span>}
                  {job.applicationCount !== undefined && (
                    <span>👥 {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}</span>
                  )}
                  {job.createdAt && <span>🕒 {timeAgo(job.createdAt)}</span>}
                </div>
                {job.skills && (
                  <div className="mj-skills">
                    {job.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} className="mj-skill">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              <span className={`mj-type-badge ${TYPE_CLASS[job.jobType] || 'mj-type-full'}`}>
                {job.jobType || 'Full Time'}
              </span>

              <div className="mj-actions">
                <button className="mj-edit-btn"   onClick={() => openEdit(job)}>✏️ Edit</button>
                <button
                  className="mj-delete-btn"
                  onClick={() => handleDelete(job.id)}
                  disabled={deleting === job.id}
                >
                  {deleting === job.id ? '…' : '🗑 Delete'}
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* ── Modal ───────────────────────────────────────────── */}
      {showForm && (
        <div className="mj-overlay" onClick={() => setShowForm(false)}>
          <div className="mj-modal" onClick={e => e.stopPropagation()}>

            <div className="mj-modal-head">
              <h2 className="mj-modal-title">
                {editingId ? '✏️ Edit Job Posting' : '+ Post New Job'}
              </h2>
              <button className="mj-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            <div className="mj-modal-divider" />

            {error && <div className="mj-error">{error}</div>}

            <form className="mj-form" onSubmit={handleSave}>

              <div className="mj-fg">
                <label>Job Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="e.g. Senior React Developer"
                  required
                />
              </div>

              <div className="mj-form-row">
                <div className="mj-fg">
                  <label>Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={onChange}
                    placeholder="e.g. Bengaluru / Remote"
                  />
                </div>
                <div className="mj-fg">
                  <label>Salary</label>
                  <input
                    name="salary"
                    value={form.salary}
                    onChange={onChange}
                    placeholder="e.g. ₹8–12 LPA"
                  />
                </div>
              </div>

              <div className="mj-form-row">
                <div className="mj-fg">
                  <label>Job Type</label>
                  <select name="jobType" value={form.jobType} onChange={onChange}>
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Internship</option>
                    <option>Contract</option>
                  </select>
                </div>
                <div className="mj-fg">
                  <label>Skills <span style={{fontWeight:400,color:'#94a3b8',fontSize:12}}>(comma separated)</span></label>
                  <input
                    name="skills"
                    value={form.skills}
                    onChange={onChange}
                    placeholder="React, Node.js, SQL"
                  />
                </div>
              </div>

              <div className="mj-fg">
                <label>Job Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={5}
                  placeholder="Describe responsibilities, requirements, and what makes this role exciting…"
                />
              </div>

              <div className="mj-modal-actions">
                <button type="button" className="mj-modal-cancel" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="mj-modal-submit">
                  {editingId ? 'Update Job' : 'Post Job'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
