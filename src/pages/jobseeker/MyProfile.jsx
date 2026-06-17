import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFetch, useForm } from '../../hooks/useHooks';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './MyProfile.css';

const initialForm = {
  skills:     '',
  experience: '',
  resumeUrl:  '',
  bio:        '',
  location:   '',
  education:  '',
};

const calcCompletion = (form) => {
  const filled = Object.values(form).filter(v => v && v.trim() !== '').length;
  return Math.round((filled / Object.keys(form).length) * 100);
};

export default function MyProfile() {
  const { user } = useAuth();
  const { data: profile, loading } = useFetch('/api/jobseeker/profile');

  const [success,        setSuccess]        = useState('');
  const [error,          setError]          = useState('');
  const [saving,         setSaving]         = useState(false);

  // Resume file upload states
  const [resumeFile,     setResumeFile]     = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadSuccess,  setUploadSuccess]  = useState('');
  const [uploadError,    setUploadError]    = useState('');
  const [existingResume, setExistingResume] = useState(null);
  const fileInputRef = useRef(null);

  const { form, setForm, onChange } = useForm(initialForm);

  useEffect(() => {
    if (profile) {
      setForm({
        skills:     profile.skills     || '',
        experience: profile.experience || '',
        resumeUrl:  profile.resumeUrl  || '',
        bio:        profile.bio        || '',
        location:   profile.location   || '',
        education:  profile.education  || '',
      });
    }
  }, [profile, setForm]);

  // Load existing resume info
  useEffect(() => {
    api.get('/api/resume/my')
      .then(res => setExistingResume(res.data))
      .catch(() => setExistingResume(null));
  }, []);

  const completion = useMemo(() => calcCompletion(form), [form]);
  const skillList  = useMemo(
    () => form.skills.split(',').map(s => s.trim()).filter(Boolean),
    [form.skills]
  );
  const avatarLetters = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  /* Save profile */
  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true); setSuccess(''); setError('');
    try {
      await api.post('/api/jobseeker/profile', form);
      setSuccess('Profile saved successfully!');
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form]);

  /* Upload resume file */
  const handleResumeUpload = useCallback(async () => {
    if (!resumeFile) return;
    setUploading(true); setUploadSuccess(''); setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', resumeFile);
      await api.post('/api/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess('Resume uploaded successfully!');
      setResumeFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Refresh existing resume info
      api.get('/api/resume/my')
        .then(res => setExistingResume(res.data))
        .catch(() => {});
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to upload resume. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }, [resumeFile]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setResumeFile(f);
      setUploadSuccess('');
      setUploadError('');
    }
  };

  /* Loading */
  if (loading) {
    return (
      <div className="mp-page">
        <div className="mp-inner">
          <div className="mp-loading"><div className="mp-spinner" />Loading your profile…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-page">
      <div className="mp-inner">

        {/* Header */}
        <div className="mp-header">
          <div>
            <h1>My Profile</h1>
            <p>Keep your profile updated to get better job recommendations</p>
          </div>
        </div>

        {/* Hero card */}
        <div className="mp-hero-card">
          <div className="mp-avatar">{avatarLetters}</div>
          <div className="mp-hero-info">
            <div className="mp-hero-name">{user?.name || 'Your Name'}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{user?.email}</div>
            <div className="mp-hero-meta">
              {form.location   && <span>📍 {form.location}</span>}
              {form.experience && <span>💼 {form.experience}</span>}
              {form.education  && <span>🎓 {form.education}</span>}
            </div>
          </div>
          <div className="mp-completion">
            <div className="mp-completion-label">Profile Strength</div>
            <div className="mp-completion-pct">{completion}%</div>
            <div className="mp-bar-track">
              <div className="mp-bar-fill" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="mp-tip">
          <div className="mp-tip-icon">💡</div>
          <div>
            <div className="mp-tip-title">Complete your profile to stand out</div>
            <div className="mp-tip-text">
              Profiles with all fields filled get <strong>3× more views</strong> from recruiters.
              {completion < 100 && ` You're ${100 - completion}% away from a complete profile.`}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {success && <div className="mp-alert mp-alert-success">✅ {success}</div>}
        {error   && <div className="mp-alert mp-alert-error">⚠️ {error}</div>}

        {/* ── RESUME FILE UPLOAD CARD ── */}
        <div className="mp-form-card" style={{ marginBottom: 20 }}>
          <p className="mp-section-label">Resume Upload</p>
          <div className="mp-section-heading"><span>📄</span> Upload Your Resume</div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Upload a PDF or DOCX file. Managers will see your resume and run ATS scoring on it.
          </p>

          {existingResume && (
            <div className="mp-resume-saved" style={{ marginBottom: 12 }}>
              <span>✅ Current resume: <strong>{existingResume.fileName}</strong></span>
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                Uploaded {new Date(existingResume.uploadedAt).toLocaleDateString()}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="resume-file-input" className="mp-visually-hidden">
              Choose resume file (PDF or DOCX)
            </label>
            <input
              id="resume-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              style={{ flex: 1, minWidth: 200, fontSize: 13 }}
            />
            <button
              type="button"
              className="mp-save-btn"
              style={{ width: 'auto', padding: '10px 20px' }}
              onClick={handleResumeUpload}
              disabled={!resumeFile || uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Resume'}
            </button>
          </div>

          {resumeFile && (
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
              Selected: <strong>{resumeFile.name}</strong> ({(resumeFile.size / 1024).toFixed(1)} KB)
            </p>
          )}

          {uploadSuccess && <div className="mp-alert mp-alert-success" style={{ marginTop: 10 }}>✅ {uploadSuccess}</div>}
          {uploadError   && <div className="mp-alert mp-alert-error"   style={{ marginTop: 10 }}>⚠️ {uploadError}</div>}
        </div>

        {/* Form */}
        <div className="mp-form-card">
          <p className="mp-section-label">Profile Details</p>
          <form className="mp-form" onSubmit={handleSave}>

            {/* Skills */}
            <div className="mp-section-heading"><span>🛠️</span> Skills</div>
            <div className="mp-fg">
              <label htmlFor="skills">
                Your Skills <span className="mp-label-note">(comma separated)</span>
              </label>
              <input id="skills" name="skills" value={form.skills} onChange={onChange}
                placeholder="React, Node.js, Java, MySQL…" autoComplete="off" />
              {skillList.length > 0 && (
                <div className="mp-skills-preview">
                  {skillList.map(s => <span key={s} className="mp-skill-tag">{s}</span>)}
                </div>
              )}
            </div>

            <div className="mp-divider" />

            {/* Work & Education */}
            <div className="mp-section-heading"><span>💼</span> Work &amp; Education</div>
            <div className="mp-row">
              <div className="mp-fg">
                <label htmlFor="experience">Experience</label>
                <input id="experience" name="experience" value={form.experience}
                  onChange={onChange} placeholder="e.g. 2 years" autoComplete="off" />
              </div>
              <div className="mp-fg">
                <label htmlFor="location">Location</label>
                <input id="location" name="location" value={form.location}
                  onChange={onChange} placeholder="e.g. Bengaluru, India" autoComplete="address-level2" />
              </div>
            </div>
            <div className="mp-fg">
              <label htmlFor="education">Education</label>
              <input id="education" name="education" value={form.education}
                onChange={onChange} placeholder="e.g. B.Tech Computer Science, VIT University"
                autoComplete="organization-title" />
            </div>

            <div className="mp-divider" />

            {/* Resume URL (optional) */}
            <div className="mp-section-heading"><span>🔗</span> Resume URL (Optional)</div>
            <div className="mp-fg">
              <label htmlFor="resumeUrl">Public Resume Link</label>
              <input id="resumeUrl" name="resumeUrl" value={form.resumeUrl}
                onChange={onChange}
                placeholder="https://drive.google.com/your-resume"
                inputMode="url" />
              <p className="mp-resume-hint">
                Optionally paste a public link to your resume (Google Drive, Dropbox, etc.).
              </p>
              {form.resumeUrl && (
                <div className="mp-resume-saved">
                  <span>✅ Resume URL saved —</span>
                  <a href={form.resumeUrl} target="_blank" rel="noopener noreferrer">
                    Preview ↗
                  </a>
                </div>
              )}
            </div>

            <div className="mp-divider" />

            {/* Bio */}
            <div className="mp-section-heading"><span>👤</span> About Me</div>
            <div className="mp-fg">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={onChange} rows={5}
                placeholder="Write a short summary about yourself, your goals, and what you're looking for…" />
            </div>

            <button type="submit" className="mp-save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}