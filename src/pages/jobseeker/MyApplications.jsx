import { useState } from 'react';
import { useFetch } from '../../hooks/useHooks';
import StatusBadge from '../../components/common/StatusBadge';
import ChatWindow from '../../components/chat/ChatWindow';
import './MyApplications.css';

export default function MyApplications() {
  const { data: apps, loading } = useFetch('/api/jobseeker/applications');
  const [activeChat, setActiveChat] = useState(null); // { applicationId, recruiterName }

  if (loading) {
    return <div className="loading">Loading applications...</div>;
  }

  const shortlistedApps = apps?.filter(a => a.status === 'SHORTLISTED' || a.status === 'HIRED') || [];

  const openChat = (app) => {
    setActiveChat({
      applicationId: app.id,
      recruiterName: app.companyName,
    });
  };

  return (
    // Outer wrapper: content area + docked chat panel side by side
    <div className={`apps-page-layout ${activeChat ? 'apps-page-layout--chat-open' : ''}`}>

      {/* ── Left: main content ──────────────────────────────── */}
      <div className="apps-content-area">

        <div className="page-header">
          <h1>My Applications</h1>
          <p>Track all your job applications in one place</p>
        </div>

        {/* Shortlisted banner */}
        {shortlistedApps.length > 0 && (
          <div className="shortlisted-banner">
            <span className="shortlisted-banner-icon">🎉</span>
            <div>
              <strong>Congratulations!</strong> You have been shortlisted or hired for {shortlistedApps.length} position{shortlistedApps.length > 1 ? 's' : ''}.
              Click <strong>"Interact with Recruiter"</strong> to connect directly with the hiring team.
            </div>
          </div>
        )}

        {/* Empty State */}
        {apps?.length === 0 && (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No applications yet</div>
            <div className="empty-subtitle">Browse jobs and start applying to see them here.</div>
          </div>
        )}

        {/* Applications Table */}
        {apps?.length > 0 && (
          <div className="card applications-card">
            <div className="table-wrap">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Applied On</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => (
                    <tr
                      key={app.id}
                      className={
                        (app.status === 'SHORTLISTED' || app.status === 'HIRED' ? 'row-shortlisted' : '') +
                        (activeChat?.applicationId === app.id ? ' row-chat-active' : '')
                      }
                    >
                      <td className="company-cell">{app.companyName}</td>
                      <td className="date-cell">
                        {app.appliedAt
                          ? new Date(app.appliedAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td><StatusBadge status={app.status} /></td>
                      <td>
                        {(app.status === 'SHORTLISTED' || app.status === 'HIRED') && (
                          <button
                            className={`btn-interact ${activeChat?.applicationId === app.id ? 'btn-interact--active' : ''}`}
                            onClick={() =>
                              activeChat?.applicationId === app.id
                                ? setActiveChat(null)   // toggle close
                                : openChat(app)
                            }
                          >
                            💬 {activeChat?.applicationId === app.id ? 'Close Chat' : 'Interact with Recruiter'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: docked chat panel ────────────────────────── */}
      {activeChat && (
        <aside className="apps-chat-panel">
          <ChatWindow
            applicationId={activeChat.applicationId}
            recipientName={activeChat.recruiterName}
            onClose={() => setActiveChat(null)}
            embedded={true}
          />
        </aside>
      )}
    </div>
  );
}
