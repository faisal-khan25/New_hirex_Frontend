import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useHooks';
import api from '../services/api';
import './login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { form, onChange } = useForm({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', form);
      login({ id: res.data.id, name: res.data.name, email: res.data.email, role: res.data.role }, res.data.token);
      const paths = { JOBSEEKER: '/jobseeker/browse', MANAGER: '/manager/jobs', ADMIN: '/admin/dashboard' };
      navigate(paths[res.data.role] || '/');
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }
return (
  <div className="login-wrapper">
    <div className="login-card">

      {/* Left Panel */}
      <aside className="login-left-panel">
        <div className="login-left-content">
          <div className="login-emoji">
            👨‍💼
          </div>

          <div className="login-info-box">
            <h3>On logging in, you can</h3>
          </div>

          <div className="login-benefits">
            <p>✅ View personalised job recommendations</p>
            <p>✅ Track all your job applications</p>
            <p>✅ Get recruiter messages in your inbox</p>
            <p>✅ Access your saved jobs anytime</p>
          </div>
        </div>
      </aside>

      {/* Right Panel */}
      <section className="login-right-panel">

        {/* Mobile Benefits */}
        <div className="mobile-benefits">
          <h4>👨‍💼 On logging in, you can</h4>

          <div className="mobile-benefit-grid">
            <span>✅ Personalised jobs</span>
            <span>✅ Track applications</span>
            <span>✅ Recruiter messages</span>
            <span>✅ Saved jobs</span>
          </div>
        </div>

        <div className="register-text">
          New to HireX?{' '}
          <Link to="/register">
            Register here
          </Link>
        </div>

        <h1 className="login-title">
          Login to your account
        </h1>

        <p className="login-subtitle">
          Search and apply for jobs from India's No.1 Job Platform
        </p>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            {/* <label>Email Address *</label> */}
            <label htmlFor="email">
  Email Address *
</label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="Tell us your Email ID"
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="Enter your password"
              required
            />

            <div className="forgot-password">
              Forgot Password?
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading
              ? 'Logging in...'
              : 'Login'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button className="google-btn">
          <span>G</span>
          Continue with Google
        </button>

        <p className="terms-text">
          By continuing, you agree to
          HireX's Terms of Use and
          Privacy Policy
        </p>
      </section>
    </div>
  </div>
);
}