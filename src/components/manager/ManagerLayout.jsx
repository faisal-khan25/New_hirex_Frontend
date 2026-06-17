import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function ManagerLayout({ children }) {

  const { user } = useAuth();
  // PERF FIX: was previously running its own independent 15s polling
  // interval against /api/chat/manager/unread-count — duplicating the
  // same request already made by NotificationContext (30s) and, before
  // this fix, by JobSeekerLayout (10s) too. Now reads from the single
  // shared context instead of firing its own network requests.
  const { unreadCount: unread } = useNotifications();

  return (
    <div className="manager-layout">

      {/* SIDEBAR */}
      <aside className="manager-sidebar">

        {/* PROFILE CARD */}
        <div className="manager-profile-card">

          <div className="manager-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'R'}
          </div>

          <div>
            <h4>
              {user?.name?.split(' ')[0]}
            </h4>

            <p>Recruiter</p>
          </div>

        </div>

        {/* TITLE */}
        <div className="sidebar-title">
          Recruiter Tools
        </div>

        {/* NAVIGATION */}

        <NavLink
          to="/manager/jobs"
          className={({ isActive }) =>
            isActive
              ? 'manager-link active'
              : 'manager-link'
          }
        >
          <span>💼</span>
          <span>Manage Jobs</span>
        </NavLink>

        <NavLink
          to="/manager/applicants"
          className={({ isActive }) =>
            isActive
              ? 'manager-link active'
              : 'manager-link'
          }
        >
          <span>👥</span>
          <span>Applicants</span>
        </NavLink>

        <NavLink
          to="/manager/company"
          className={({ isActive }) =>
            isActive ? 'manager-link active' : 'manager-link'
          }
        >
          <span>🏢</span>
          <span>Company Profile</span>
        </NavLink>

        <NavLink
          to="/manager/ats"
          className={({ isActive }) =>
            isActive ? 'manager-link active' : 'manager-link'
          }
        >
          <span>🤖</span>
          <span>ATS Analysis</span>
        </NavLink>

        <NavLink
          to="/manager/chat"
          className={({ isActive }) =>
            isActive ? 'manager-link active' : 'manager-link'
          }
        >
          <span className="nav-icon-wrap">
            💬
            {unread > 0 && (
              <span className="nav-icon-badge">{unread > 99 ? '99+' : unread}</span>
            )}
          </span>
          <span>Conversations</span>
        </NavLink>

      </aside>

      {/* MAIN CONTENT */}
      <main className="manager-main">
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-nav">

        <NavLink
          to="/manager/jobs"
          className={({ isActive }) =>
            isActive
              ? 'mobile-link active'
              : 'mobile-link'
          }
        >
          <span>💼</span>
          <small>Jobs</small>
        </NavLink>

        <NavLink
          to="/manager/applicants"
          className={({ isActive }) =>
            isActive
              ? 'mobile-link active'
              : 'mobile-link'
          }
        >
          <span>👥</span>
          <small>Applicants</small>
        </NavLink>

        <NavLink
          to="/manager/company"
          className={({ isActive }) =>
            isActive ? 'mobile-link active' : 'mobile-link'
          }
        >
          <span>🏢</span>
          <small>Company</small>
        </NavLink>

        <NavLink
          to="/manager/ats"
          className={({ isActive }) =>
            isActive ? 'mobile-link active' : 'mobile-link'
          }
        >
          <span>🤖</span>
          <small>ATS</small>
        </NavLink>

        <NavLink
          to="/manager/chat"
          className={({ isActive }) =>
            isActive ? 'mobile-link active' : 'mobile-link'
          }
        >
          <span className="nav-icon-wrap">
            💬
            {unread > 0 && (
              <span className="nav-icon-badge">{unread > 99 ? '99+' : unread}</span>
            )}
          </span>
          <small>Chat</small>
        </NavLink>

      </nav>

    </div>
  );
}