import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useHooks';
import api from '../services/api';
import './Register.css';
import useSEO from '../hooks/useSeo';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { form, onChange } = useForm({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'JOBSEEKER'
  });

  useSEO({
    title: 'Create Account',
    description: 'Join HireX — India\'s #1 job platform. Create a free profile, apply to 50,000+ jobs, and connect with top recruiters in minutes.',
    url: 'https://hirex.in/register',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/register', form);

      login(
        {
          id: res.data.id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role
        },
        res.data.token
      );

      if (res.data.role === 'MANAGER') {
        navigate('/manager/company');
      } else {
        navigate('/jobseeker/browse');
      }

    } catch (e) {
      setError(
        e.response?.data?.error || 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      <div className="register-card">

        {/* LEFT PANEL */}
        <div className="register-left-panel">

          <div className="left-icon">🚀</div>

          <div className="left-box-title">
            On registering, you can
          </div>

          <div className="left-benefits">
            <p>✅ Build your profile and let recruiters find you</p>
            <p>✅ Get job alerts on email</p>
            <p>✅ Grow your career</p>
            <p>✅ Access lakhs of jobs</p>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="register-right-panel">

          {/* Mobile strip */}
          <div className="mobile-benefits">

            <div className="mobile-title">
              🚀 On registering, you can
            </div>

            <div className="mobile-grid">
              <p>✅ Profile for recruiters</p>
              <p>✅ Job alerts on email</p>
              <p>✅ Grow your career</p>
              <p>✅ Lakhs of jobs</p>
            </div>

          </div>

          {/* Login link */}
          <div className="login-link">
            Already Registered?{' '}
            <Link to="/login">Login here</Link>
          </div>

          <h1 className="title">
            Create your HireX profile
          </h1>

          <p className="subtitle">
            Search & apply to jobs from India's No.1 Job Site
          </p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Role Toggle */}
          <div className="role-toggle">

            {[
              { value: 'JOBSEEKER', label: '👤 Job Seeker' },
              { value: 'MANAGER', label: '🏢 Recruiter' }
            ].map((opt) => (
              <label
                key={opt.value}
                className={`role-btn ${
                  form.role === opt.value
                    ? 'active'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={form.role === opt.value}
                  onChange={onChange}
                />

                {opt.label}
              </label>
            ))}

          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="reg-name">Full name *</label>
              <input
                id="reg-name"
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="What is your name?"
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email ID *</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="Tell us your Email ID"
                autoComplete="email"
                required
              />
              <small>
                We'll send relevant jobs and updates
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password *</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Mobile number *</label>

              <div className="phone-box">

                <span className="country-code">
                  +91
                </span>

                <input
                  id="reg-phone"
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="Enter mobile number"
                  type="tel"
                  autoComplete="tel-national"
                />

              </div>

              <small>
                Recruiters will contact you on this number
              </small>

            </div>

            <button
              type="submit"
              className="btn btn-primary full-btn"
              disabled={loading}
            >
              {loading
                ? 'Creating account...'
                : 'Register now'}
            </button>

          </form>

          {/* OR */}
          <div className="divider">
            <span>Or</span>
          </div>

          <button className="google-btn">
            <span>G</span>
            Continue with Google
          </button>

          <p className="terms">
            By clicking Register, you agree to{' '}
            <span>Terms</span> & <span>Privacy Policy</span>
          </p>

        </div>

      </div>

    </div>
  );
}