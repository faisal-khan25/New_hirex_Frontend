import { Link } from 'react-router-dom';
import { memo } from 'react';
import { useAuth } from '../context/AuthContext';
import './home.css';
import useSEO from '../hooks/useSeo';

/* ── Data ─────────────────────────────────────────────────── */
const STATS = [
  { num: '50K+', label: 'Jobs Posted' },
  { num: '2L+',  label: 'Job Seekers' },
  { num: '10K+', label: 'Recruiters'  },
  { num: '95%',  label: 'Placement Rate' },
];

const JOB_CATEGORIES = [
  { icon: '💻', label: 'Software Dev', count: '12,400+' },
  { icon: '📈', label: 'Sales & Mktg', count: '4,200+'  },
  { icon: '🎨', label: 'Design & UX',  count: '2,800+'  },
];

/* Platform feature cards — illustration emoji + title + desc */
const PLATFORM_FEATURES = [
  {
    illus: '🧑‍💼',
    bg: '#eef0f7',
    title: 'Smart Job Matching',
    desc:  'AI-powered recommendations surface the most relevant roles based on your skills, experience, and preferences.',
  },
  {
    illus: '🔒',
    bg: '#ede9fe',
    title: 'Verified Companies',
    desc:  'Every employer on HireX is verified. Apply with confidence knowing you\'re talking to real recruiters.',
  },
  {
    illus: '🖥️',
    bg: '#e0f2fe',
    title: 'Real-time Tracking',
    desc:  'Track every application in one dashboard — from applied to interview to offer, in real time.',
  },
  {
    illus: '💼',
    bg: '#fef9c3',
    title: 'One-Click Apply',
    desc:  'Your HireX profile doubles as your resume. Apply to any job in a single click, no uploads needed.',
  },
  {
    illus: '📊',
    bg: '#fce7f3',
    title: 'Built-in ATS',
    desc:  'Recruiters get a full applicant tracking system — pipeline views, status updates, and candidate notes.',
  },
  {
    illus: '📬',
    bg: '#d1fae5',
    title: 'Instant Notifications',
    desc:  'Get email and in-app alerts the moment a recruiter views your profile or updates your application.',
  },
];

/* How it works steps */
const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '📝',
    title: 'Create Your Profile',
    desc:  'Sign up in under 2 minutes. Add your skills, experience, and preferred roles — your profile is your resume.',
  },
  {
    step: '02',
    icon: '🔍',
    title: 'Discover Jobs',
    desc:  'Browse thousands of live listings or let our smart engine surface the best matches for you automatically.',
  },
  {
    step: '03',
    icon: '⚡',
    title: 'Apply Instantly',
    desc:  'Hit Apply on any role. Your profile goes straight to the recruiter — no cover letters, no file uploads.',
  },
  {
    step: '04',
    icon: '🎉',
    title: 'Get Hired',
    desc:  'Track responses, schedule interviews, and land your next opportunity — all from one dashboard.',
  },
];

const FOOTER_COLS = [
  { heading: 'Job Seekers', links: [{ label: 'Browse Jobs', to: '/jobs' }, { label: 'Create Account', to: '/register' }, { label: 'Login', to: '/login' }] },
  { heading: 'Employers',   links: [{ label: 'Post a Job', to: '/register' }, { label: 'Recruiter Login', to: '/login' }] },
  { heading: 'Company',     links: [{ label: 'About Us', to: '/#about' }, { label: 'Features', to: '/#features' }, { label: 'Help Center', to: '/#help' }, { label: 'Contact Us', to: '/contact' }, { label: 'Privacy Policy', to: '#' }] },
];

const SOCIAL_LINKS = [
  { label: 'LinkedIn',  icon: 'in', bg: '#0077b5' },
  { label: 'Twitter',   icon: '𝕏',  bg: '#1a1a2e' },
  { label: 'Instagram', icon: '📷', bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' },
  { label: 'Facebook',  icon: 'f',  bg: '#1877f2' },
];

/* ── Sub-components ───────────────────────────────────────── */
const CategoryCard = memo(({ cat }) => (
  <Link to="/jobs" className="category-card" aria-label={`${cat.label} jobs`}>
    <span className="category-icon" aria-hidden="true">{cat.icon}</span>
    <div>
      <h3 className="category-title">{cat.label}</h3>
      <p className="category-count">{cat.count} jobs</p>
    </div>
  </Link>
));

/* ── Page ─────────────────────────────────────────────────── */
export default function Home() {
  const { user } = useAuth();

  useSEO({
    title: "India's #1 Job Platform",
    description: "HireX connects professionals with top companies across India. Browse 50,000+ jobs, apply in one click, and track every application in real time.",
    url: 'https://hirex.in',
  });

  return (
    <main className="home-page">

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section id="home" className="hero">
        <div className="container hero-content">
          <span className="hero-badge">India&apos;s #1 Job Platform</span>
          <h1 className="hero-title">
            Find Your Next<span> Dream Job</span>
          </h1>
          <p className="hero-desc">HireX connects professionals with top companies.</p>
          <div className="hero-buttons">
            <Link to="/jobs" className="btn-primary">Browse Jobs</Link>
            {!user && <Link to="/register" className="btn-secondary">Upload Resume</Link>}
          </div>
        </div>
      </section>

      {/* ══ STATS ═════════════════════════════════════════════ */}
      <section className="stats">
        {STATS.map((s) => (
          <article key={s.label} className="stat-box">
            <h2>{s.num}</h2>
            <p>{s.label}</p>
          </article>
        ))}
      </section>

      {/* ══ CATEGORIES ════════════════════════════════════════ */}
      <section className="categories">
        <div className="section-header">
          <h2>Browse by Category</h2>
          <p>Explore thousands of openings across every industry</p>
        </div>
        <div className="categories-grid">
          {JOB_CATEGORIES.map((cat) => (
            <CategoryCard key={cat.label} cat={cat} />
          ))}
        </div>
      </section>

      {/* ══ PLAT*/}
      <section id="features" className="pf-section">
        <div className="pf-container">
          <div className="section-header centered">
            <span className="info-tag">Platform Features</span>
            <h2>Everything you need to get hired — or hire faster</h2>
            <p>Built for job seekers and recruiters alike, HireX packs the tools that matter most.</p>
          </div>
          <div className="pf-grid">
            {PLATFORM_FEATURES.map((f) => (
              <div key={f.title} className="pf-card">
                <div className="pf-illus" style={{ background: f.bg }}>
                  <span>{f.illus}</span>
                </div>
                <div className="pf-body">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="hiw-section">
        <div className="pf-container">
          <div className="section-header centered">
            <span className="info-tag">How It Works</span>
            <h2>From sign-up to offer in four simple steps</h2>
            <p>No friction. No confusion. Just a clear path to your next role.</p>
          </div>
          <div className="hiw-grid">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="hiw-card">
                <div className="hiw-step-num">{step.step}</div>
                <div className="hiw-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hiw-arrow" aria-hidden="true">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT ═════════════════════════════════════════════ */}
      <section id="about" className="info-section about-section">
        <div className="info-section-inner">
          <div className="info-text">
            <span className="info-tag">About HireX</span>
            <h2>We're on a mission to make hiring human again</h2>
            <p>
              Founded in 2022, HireX was built to bridge the gap between talented
              professionals and the companies that need them. We believe every
              job seeker deserves a fair shot, and every recruiter deserves smarter tools.
            </p>
            <p>
              Today, HireX serves over <strong>2 lakh job seekers</strong> and
              <strong> 10,000+ recruiters</strong> across India — from startups to Fortune 500 companies.
            </p>
            <ul className="about-list">
              <li>✅ DPIIT-recognised startup</li>
              <li>✅ ISO 27001 certified platform</li>
              <li>✅ Trusted by 500+ companies across 30+ cities</li>
            </ul>
          </div>
          <div className="info-visual about-visual" aria-hidden="true">
            <div className="visual-card">🏢 500+ Companies</div>
            <div className="visual-card">🌍 30+ Cities</div>
            <div className="visual-card">🎓 All Experience Levels</div>
            <div className="visual-card">⚡ Founded 2022</div>
          </div>
        </div>
      </section>

      {/* ══ HELP ══════════════════════════════════════════════ */}
      <section id="help" className="info-section help-section">
        <div className="info-section-inner">
          <div className="info-text">
            <span className="info-tag">Help Center</span>
            <h2>We've got answers to your questions</h2>
            <p>Our support team is available Monday–Saturday, 9 AM to 6 PM IST.</p>
          </div>
          <div className="help-faq">
            {[
              { q: 'How do I create an account?',    a: 'Click "Register" on the top right, choose your role, and fill in your details. It takes under 2 minutes.' },
              { q: 'Is HireX free for job seekers?', a: 'Yes, completely free. Browse jobs, apply, and track your applications at no cost — ever.' },
              { q: 'How do I reset my password?',    a: 'Click "Login", then "Forgot Password". Enter your email and follow the instructions sent to your inbox.' },
              { q: 'How can recruiters post a job?', a: 'Register as a Manager, log in, and click "Post a Job". Your listing goes live within minutes.' },
            ].map(({ q, a }) => (
              <details key={q} className="faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTACT ═══════════════════════════════════════════ */}
      <section id="contact" className="info-section contact-section">
        <div className="info-section-inner">
          <div className="info-text">
            <span className="info-tag">Contact Us</span>
            <h2>Get in touch with the HireX team</h2>
            <p>Have a question, partnership inquiry, or just want to say hello? We'd love to hear from you.</p>
            <ul className="contact-details">
              <li>📧 <a href="mailto:support@hirex.in">support@hirex.in</a></li>
              <li>📞 <a href="tel:+918000000000">+91 80000 00000</a></li>
              <li>📍 HireX HQ, 4th Floor, Tech Park, Bengaluru — 560001</li>
              <li>🕘 Mon–Sat, 9 AM – 6 PM IST</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">Hire<span>X</span></Link>
            <p className="footer-tagline">India's #1 job platform connecting talent with top companies across every industry.</p>
            <div className="footer-social">
              {SOCIAL_LINKS.map(({ label, icon, bg }) => (
                <a key={label} href="#" aria-label={label} className="footer-social-btn" style={{ background: bg }}>{icon}</a>
              ))}
            </div>
          </div>
          <div className="footer-links">
            {FOOTER_COLS.map(({ heading, links }) => (
              <div key={heading} className="footer-col">
                <h4>{heading}</h4>
                <ul>
                  {links.map(({ label, to }) => (
                    <li key={label}><Link to={to}>{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} HireX Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="footer-legal">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((t) => (
              <a key={t} href="#">{t}</a>
            ))}
          </div>
        </div>
      </footer>

    </main>
  );
}
