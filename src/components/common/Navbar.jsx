import { memo, useCallback, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Home',       type: 'scroll', id: 'home'     },
  { label: 'Features',   type: 'scroll', id: 'features' },
  { label: 'About',      type: 'scroll', id: 'about'    },
  { label: 'Help',       type: 'scroll', id: 'help'     },
  { label: 'Contact Us', type: 'route',  to: '/contact' },
];

const DASH_PATH = {
  JOBSEEKER: '/jobseeker/browse',
  MANAGER:   '/manager/jobs',
  ADMIN:     '/admin/dashboard',
};

// Chat path per role (where the chat/conversations page lives)
const CHAT_PATH = {
  JOBSEEKER: '/jobseeker/applications',
  MANAGER:   '/manager/applicants',
};

function Navbar() {
  const { user, logout }                   = useAuth();
  const { unreadCount }                    = useNotifications();
  const navigate                           = useNavigate();
  const location                           = useLocation();
  const [scrolled, setScrolled]            = useState(false);
  const [menuOpen, setMenuOpen]            = useState(false);

  /* shrink / glass effect on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close mobile menu on route change */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleScroll = useCallback((id) => (e) => {
    e.preventDefault();
    setMenuOpen(false);
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${id}`);
    }
  }, [location.pathname, navigate]);

  const isActive = (link) => {
    if (link.type === 'route') return location.pathname === link.to;
    return false;
  };

  // Badge: only show for roles that have chat
  const showBadge = user && unreadCount > 0 && (user.role === 'JOBSEEKER' || user.role === 'MANAGER');
  const chatPath  = user ? (CHAT_PATH[user.role] || DASH_PATH[user.role]) : '/';

  return (
    <>
      <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
        <div className="navbar__inner">

          {/* ── Logo ── */}
          <Link to="/" className="navbar__logo" aria-label="HireX Home">
            Hire<span>X</span>
          </Link>

          {/* ── Center links (desktop) ── */}
          <ul className="navbar__links">
            {NAV_LINKS.map((link) =>
              link.type === 'scroll' ? (
                <li key={link.id}>
                  <a
                    href={`/#${link.id}`}
                    onClick={handleScroll(link.id)}
                    className={`navbar__link${isActive(link) ? ' navbar__link--active' : ''}`}
                  >
                    {link.label}
                  </a>
                </li>
              ) : (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`navbar__link${isActive(link) ? ' navbar__link--active' : ''}`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            )}
          </ul>

          {/* ── Right auth section (desktop) ── */}
          <div className="navbar__auth">
            {!user ? (
              <>
                <Link to="/login" className="navbar__login">Login</Link>
                <Link to="/register" className="navbar__register">Get Started</Link>
              </>
            ) : (
              <>
                {/* ── Notification bell ── */}
                <Link
                  to={chatPath}
                  className="navbar__notif-btn"
                  aria-label={unreadCount > 0 ? `${unreadCount} unread messages` : 'Messages'}
                  title={unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Messages'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {showBadge && (
                    <span className="navbar__notif-badge" aria-live="polite">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="navbar__user">
                  <div className="navbar__avatar">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="navbar__username">Hi, {user.name?.split(' ')[0]}</span>
                </div>
                <Link to={DASH_PATH[user.role]} className="navbar__login">Dashboard</Link>
                <button className="navbar__register" onClick={handleLogout}>Logout</button>
              </>
            )}
          </div>

          {/* ── Hamburger (mobile) ── */}
          <button
            className={`navbar__hamburger${menuOpen ? ' navbar__hamburger--open' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {/* Notification dot on hamburger for mobile */}
            {showBadge && <span className="navbar__hamburger-dot" aria-hidden="true" />}
            <span /><span /><span />
          </button>

        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      <div className={`navbar__drawer${menuOpen ? ' navbar__drawer--open' : ''}`}>
        <ul className="navbar__drawer-links">
          {NAV_LINKS.map((link) =>
            link.type === 'scroll' ? (
              <li key={link.id}>
                <a href={`/#${link.id}`} onClick={handleScroll(link.id)} className="navbar__drawer-link">
                  {link.label}
                </a>
              </li>
            ) : (
              <li key={link.to}>
                <Link to={link.to} className="navbar__drawer-link" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              </li>
            )
          )}
        </ul>

        <div className="navbar__drawer-auth">
          {!user ? (
            <>
              <Link to="/login"    className="navbar__drawer-login"    onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="navbar__drawer-register" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          ) : (
            <>
              {/* Messages link with badge in drawer */}
              <Link
                to={chatPath}
                className="navbar__drawer-messages"
                onClick={() => setMenuOpen(false)}
              >
                💬 Messages
                {showBadge && (
                  <span className="navbar__drawer-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
              <Link to={DASH_PATH[user.role]} className="navbar__drawer-login" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button className="navbar__drawer-register" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </div>

      {/* overlay */}
      {menuOpen && <div className="navbar__overlay" onClick={() => setMenuOpen(false)} />}
    </>
  );
}

export default memo(Navbar);