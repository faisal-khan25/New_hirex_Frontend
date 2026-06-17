import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Contact.css';
import useSEO from '../hooks/useSeo';
import api from '../services/api';

const SUPPORT_CARDS = [
  { icon: '💬', title: 'Live Chat',      desc: 'Connect with an agent instantly during business hours.', cta: 'Start Chat',        href: '#' },
  { icon: '📧', title: 'Email Support',  desc: 'Send a detailed query — we reply within 24 hours.',     cta: 'Send Email',        href: 'mailto:support@hirex.in' },
  { icon: '📞', title: 'Call Us',        desc: 'Speak to our team, Mon–Sat 9 AM – 6 PM IST.',           cta: 'Call Now',          href: 'tel:+918000000000' },
  { icon: '📖', title: 'Help Center',    desc: 'Browse hundreds of guides, FAQs and how-to articles.',  cta: 'Visit Help Center', href: '/#help' },
];

const INFO_ITEMS = [
  { icon: '📧', label: 'Email',       value: 'support@hirex.in',              href: 'mailto:support@hirex.in' },
  { icon: '📞', label: 'Phone',       value: '+91 80000 00000',               href: 'tel:+918000000000' },
  { icon: '🕘', label: 'Hours',       value: 'Mon–Sat, 9 AM – 6 PM IST',     href: null },
  { icon: '📍', label: 'Head Office', value: '4th Floor, Tech Park, Bengaluru — 560001', href: null },
];

const FAQS = [
  { q: 'How do I create an account?',       a: 'Click "Register" at the top right, choose Job Seeker or Recruiter, and complete the form in under 2 minutes.' },
  { q: 'Is HireX free for job seekers?',    a: 'Yes — 100% free. Browse jobs, apply, and track applications at no cost, ever.' },
  { q: 'How long does it take to respond?', a: 'Email queries are answered within 24 business hours. Live chat is immediate during working hours.' },
  { q: 'How do recruiters post jobs?',      a: 'Register as a Manager, log in to your dashboard, and click "Post a Job". Your listing goes live in minutes.' },
];

const OFFICES = [
  { city: 'Bengaluru (HQ)', icon: '🏙️', address: '4th Floor, Tech Park, Outer Ring Road, Bengaluru — 560001', phone: '+91 80000 00000', email: 'support@hirex.in' },
  { city: 'Mumbai',         icon: '🌆', address: '12th Floor, BKC Tower, Bandra Kurla Complex, Mumbai — 400051', phone: '+91 22000 00000', email: 'mumbai@hirex.in' },
  { city: 'Delhi NCR',      icon: '🏛️', address: '8th Floor, Cyber Hub, DLF Phase 2, Gurugram — 122002',        phone: '+91 11000 00000', email: 'delhi@hirex.in' },
];

const FOOTER_COLS = [
  { heading: 'Job Seekers', links: [{ label: 'Browse Jobs', to: '/jobs' }, { label: 'Create Account', to: '/register' }, { label: 'Login', to: '/login' }] },
  { heading: 'Employers',   links: [{ label: 'Post a Job', to: '/register' }, { label: 'Recruiter Login', to: '/login' }] },
  { heading: 'Company',     links: [{ label: 'About Us', to: '/#about' }, { label: 'Features', to: '/#features' }, { label: 'Help Center', to: '/#help' }, { label: 'Privacy Policy', to: '#' }] },
];

export default function Contact() {
  const [openFaq, setOpenFaq] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: '', message: '' });

  const updateField = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  // BUG FIX: this form previously did nothing — onSubmit just called
  // e.preventDefault() and setSubmitted(true), so every "message" typed
  // here was discarded client-side and never reached anyone. It LOOKED
  // like it sent (the success screen even said "Message Sent!"), but no
  // network request was ever made. Now it actually POSTs to the backend.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post('/api/contact', form);
      setSubmitted(true);
    } catch (err) {
      // If the backend endpoint isn't available yet, fall back to opening
      // the user's email client pre-filled with what they wrote, so the
      // message still actually goes somewhere instead of vanishing.
      const status = err.response?.status;
      if (!err.response || status === 404) {
        const body = encodeURIComponent(
          `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nTopic: ${form.topic}\n\n${form.message}`
        );
        window.location.href = `mailto:support@hirex.in?subject=${encodeURIComponent(form.topic || 'Contact form')}&body=${body}`;
        setSubmitted(true);
      } else {
        setSubmitError(err.response?.data?.error || 'Failed to send your message. Please try again or email us directly.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  useSEO({
    title: 'Contact Us',
    description: "Get in touch with the HireX team — email, call, or visit one of our offices across India. We typically respond within 24 hours.",
    url: 'https://hirex.in/contact',
  });

  return (
    <div className="cp-page">

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section className="cp-hero">
        <div className="cp-hero-inner">
          <span className="cp-hero-badge">Contact Us</span>
          <h1>
            We'd love to hear<br />
            <span>from you</span>
          </h1>
          <p>
            Job seeker, recruiter, or partner — our team is ready
            to help every step of the way.
          </p>
          <div className="cp-hero-stats">
            {[{ num: '< 24h', label: 'Response Time' }, { num: '10K+', label: 'Happy Users' }, { num: '4.8★', label: 'Support Rating' }].map(s => (
              <div key={s.label}>
                <p>{s.num}</p>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SUPPORT CHANNELS ════════════════════════════════ */}
      <section className="cp-support">
        <div className="cp-container">
          <div className="cp-support-header">
            <h2 className="cp-section-title">How can we help?</h2>
            <p className="cp-section-sub">Choose the channel that works best for you</p>
          </div>
          <div className="cp-support-grid">
            {SUPPORT_CARDS.map(c => (
              <a key={c.title} href={c.href} className="cp-support-card">
                <span className="cp-support-icon">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <span className="cp-support-cta">{c.cta} →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FORM + DETAILS ══════════════════════════════════ */}
      <section className="cp-main">
        <div className="cp-container cp-main-inner">

          {/* Left */}
          <div className="cp-details">
            <h2>Talk to our team</h2>
            <p className="cp-details-sub">
              Fill in the form or reach us via any channel below.
              We'll reply within one business day.
            </p>
            <ul className="cp-info-list">
              {INFO_ITEMS.map(item => (
                <li key={item.label}>
                  <div className="cp-info-icon-wrap">{item.icon}</div>
                  <div>
                    <strong>{item.label}</strong>
                    {item.href
                      ? <a href={item.href}>{item.value}</a>
                      : <span>{item.value}</span>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="cp-social-row">
              <a href="#" aria-label="LinkedIn"   className="cp-social-btn cp-social-li">in</a>
              <a href="#" aria-label="Twitter"    className="cp-social-btn cp-social-tw">𝕏</a>
              <a href="#" aria-label="Instagram"  className="cp-social-btn cp-social-ig">📷</a>
              <a href="#" aria-label="Facebook"   className="cp-social-btn cp-social-fb">f</a>
            </div>
          </div>

          {/* Right — form */}
          <div className="cp-form-wrap">
            {submitted ? (
              <div className="cp-success">
                <div className="cp-success-icon">✅</div>
                <h3>Message Sent!</h3>
                <p>Thanks for reaching out. Our team will get back to you within 24 business hours.</p>
                <button onClick={() => setSubmitted(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p className="cp-form-title">Send us a message</p>
                <p className="cp-form-hint">Fields marked * are required.</p>
                <div className="cp-form-row">
                  <div className="cp-fg">
                    <label htmlFor="cp-name">Full Name *</label>
                    <input id="cp-name" type="text" placeholder="Rahul Sharma" required
                      value={form.name} onChange={updateField('name')} />
                  </div>
                  <div className="cp-fg">
                    <label htmlFor="cp-email">Email *</label>
                    <input id="cp-email" type="email" placeholder="rahul@example.com" required
                      value={form.email} onChange={updateField('email')} />
                  </div>
                </div>
                <div className="cp-form-row">
                  <div className="cp-fg">
                    <label htmlFor="cp-phone">Phone</label>
                    <input id="cp-phone" type="tel" placeholder="+91 98765 43210"
                      value={form.phone} onChange={updateField('phone')} />
                  </div>
                  <div className="cp-fg">
                    <label htmlFor="cp-subject">Topic *</label>
                    <select id="cp-subject" required value={form.topic} onChange={updateField('topic')}>
                      <option value="">Select a topic</option>
                      <option>Job Seeker Support</option>
                      <option>Recruiter / Employer Support</option>
                      <option>Partnership Enquiry</option>
                      <option>Report a Bug</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="cp-fg">
                  <label htmlFor="cp-msg">Message *</label>
                  <textarea id="cp-msg" rows={5} placeholder="Describe your query in detail…" required
                    value={form.message} onChange={updateField('message')} />
                </div>
                {submitError && <p className="cp-form-error">{submitError}</p>}
                <button type="submit" className="cp-submit-btn" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════ */}
      <section className="cp-faq">
        <div className="cp-container">
          <div className="cp-faq-header">
            <h2 className="cp-section-title">Frequently Asked Questions</h2>
            <p className="cp-section-sub">Quick answers to common queries</p>
          </div>
          <div className="cp-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`cp-faq-item${openFaq === i ? ' open' : ''}`}>
                <button className="cp-faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="cp-faq-icon">+</span>
                </button>
                <div className="cp-faq-answer">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ OFFICES ═════════════════════════════════════════ */}
      <section className="cp-offices">
        <div className="cp-container">
          <div className="cp-offices-header">
            <h2 className="cp-section-title">Our Offices</h2>
            <p className="cp-section-sub">Visit us at any of our locations across India</p>
          </div>
          <div className="cp-offices-grid">
            {OFFICES.map(o => (
              <div key={o.city} className="cp-office-card">
                <div className="cp-office-icon">{o.icon}</div>
                <h3>{o.city}</h3>
                <p>{o.address}</p>
                <a href={`tel:${o.phone.replace(/\s/g,'')}`}>📞 {o.phone}</a>
                <a href={`mailto:${o.email}`}>📧 {o.email}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════ */}
      <footer className="cp-footer">
        <div className="cp-footer-inner">
          <div className="cp-footer-brand">
            <Link to="/" className="cp-footer-logo">Hire<span>X</span></Link>
            <p>India's #1 job platform connecting talent with top companies across every industry.</p>
            <div className="cp-footer-social">
              <a href="#" aria-label="LinkedIn"  className="cp-social-li" style={{width:36,height:36,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',textDecoration:'none'}}>in</a>
              <a href="#" aria-label="Twitter"   className="cp-social-tw" style={{width:36,height:36,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',textDecoration:'none',background:'#1a1a2e'}}>𝕏</a>
              <a href="#" aria-label="Instagram" style={{width:36,height:36,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#fff',textDecoration:'none',background:'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'}}>📷</a>
              <a href="#" aria-label="Facebook"  style={{width:36,height:36,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff',textDecoration:'none',background:'#1877f2'}}>f</a>
            </div>
          </div>
          <div className="cp-footer-links">
            {FOOTER_COLS.map(({ heading, links }) => (
              <div key={heading} className="cp-footer-col">
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
        <div className="cp-footer-bottom">
          <p>© {new Date().getFullYear()} HireX Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="cp-footer-legal">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(t => (
              <a key={t} href="#">{t}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}