import { useState, useEffect } from 'react';
import { useFetch, useForm } from '../../hooks/useHooks';
import api from '../../services/api';
import './CompanyProfile.css';

export default function CompanyProfile() {

  const {
    data: company,
    loading
  } = useFetch('/api/manager/company');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const {
    form,
    setForm,
    onChange
  } = useForm({
    name: '',
    description: '',
    website: '',
    location: '',
    industry: '',
    logoUrl: '',
    size: ''
  });

  // LOAD COMPANY DATA
  useEffect(() => {

    if (company) {

      setForm({
        name: company.name || '',
        description: company.description || '',
        website: company.website || '',
        location: company.location || '',
        industry: company.industry || '',
        logoUrl: company.logoUrl || '',
        size: company.size || ''
      });
    }

  }, [company, setForm]);

  // SAVE
  const handleSave = async (e) => {

    e.preventDefault();

    try {

      await api.post(
        '/api/manager/company',
        {
          ...form,
          size: Number(form.size)
        }
      );

      setSuccess(
        'Company profile saved successfully'
      );

      setError('');

    } catch (e) {

      setError(
        e.response?.data?.error ||
        'Failed to save company'
      );

      setSuccess('');
    }
  };

  return (

    <div className="company-profile">

      {/* HEADER */}

      <div className="page-header">

        <h1>Company Profile</h1>

        <p>
          Manage your company details
        </p>

      </div>

      {/* CARD */}

      <div className="profile-card">

        {/* PREVIEW */}

        {form.name && (

          <div className="preview-banner">

            <div className="logo-box">
              🏢
            </div>

            <div>

              <div className="company-name">
                {form.name}
              </div>

              <div className="company-meta">

                {[
                  form.industry,
                  form.location
                ]
                  .filter(Boolean)
                  .join(' • ')}

              </div>

            </div>

          </div>
        )}

        {/* ALERTS */}

        {success && (
          <div className="alert-success">
            {success}
          </div>
        )}

        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        {/* FORM */}

        {loading ? (

          <div className="loading">
            Loading profile...
          </div>

        ) : (

          <form onSubmit={handleSave}>

            <div className="form-group">

             <label htmlFor="name">
                Company Name *
            </label>

   
   
 <input
    id="name"
    name="name"
    value={form.name}
    onChange={onChange}
    required
  />
              

            </div>

            <div className="grid-2">

              <div className="form-group">

                 <label htmlFor="industry">
    Industry
  </label>

  <input
    id="industry"
    name="industry"
    value={form.industry}
    onChange={onChange}
  />

              </div>

              <div className="form-group">

                <label htmlFor="location">
                  Location
                </label>

                <input
                 id="location"
                  name="location"
                  value={form.location}
                  onChange={onChange}
                />

              </div>

            </div>

            <div className="grid-2">

              <div className="form-group">

                <label htmlFor="website">
                  Website
                </label>

                <input
                 id="website"
                  name="website"
                  value={form.website}
                  onChange={onChange}
                />

              </div>

              <div className="form-group">

                <label htmlFor="team-size">
                  Team Size
                </label>

                <input
                 id="team-size"
                  type="number"
                  name="size"
                  value={form.size}
                  onChange={onChange}
                />

              </div>

            </div>

            <div className="form-group">

              <label htmlFor="logo-url">
                Logo URL
              </label>

              <input
               id="logo-url"
                name="logoUrl"
                value={form.logoUrl}
                onChange={onChange}
              />

            </div>

            <div className="form-group">

              <label htmlFor="about-company">
                About Company
              </label>

              <textarea
              id="about-company"
                name="description"
                value={form.description}
                onChange={onChange}
                rows={4}
              />

            </div>

            <button
              className="btn btn-primary"
              type="submit"
            >
              Save Profile
            </button>

          </form>
        )}

      </div>

    </div>
  );
}