import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import { lazy, Suspense } from 'react';

// Layouts (kept eager — small, always needed)
import JobSeekerLayout from './components/jobseeker/JobSeekerLayout';
import ManagerLayout from './components/manager/ManagerLayout';
import AdminLayout from './components/admin/AdminLayout';

// Lazy-loaded pages
const Home            = lazy(() => import('./pages/Home'));
const Login           = lazy(() => import('./pages/Login'));
const Register        = lazy(() => import('./pages/Register'));
const Contact         = lazy(() => import('./pages/Contact'));
const BrowseJobs      = lazy(() => import('./pages/jobseeker/BrowseJobs'));
const MyApplications  = lazy(() => import('./pages/jobseeker/MyApplications'));
const MyProfile       = lazy(() => import('./pages/jobseeker/MyProfile'));
const CompanyProfile  = lazy(() => import('./pages/manager/CompanyProfile'));
const ManageJobs      = lazy(() => import('./pages/manager/ManageJobs'));
const Applicants      = lazy(() => import('./pages/manager/Applicants'));
const AtsChecker      = lazy(() => import('./pages/manager/AtsChecker'));
const RecruiterChat   = lazy(() => import('./pages/manager/RecruiterChat'));
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'));

const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    flexDirection: 'column',
    gap: '12px',
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading…</span>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"         element={<Home />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/jobs"     element={<BrowseJobs />} />
            <Route path="/contact"  element={<Contact />} />

            {/* Jobseeker routes */}
            <Route path="/jobseeker/*" element={
              <ProtectedRoute role="JOBSEEKER">
                <JobSeekerLayout>
                  <Routes>
                    <Route path="browse"       element={<BrowseJobs />} />
                    <Route path="applications" element={<MyApplications />} />
                    <Route path="profile"      element={<MyProfile />} />
                    <Route path="*"            element={<Navigate to="browse" replace />} />
                  </Routes>
                </JobSeekerLayout>
              </ProtectedRoute>
            } />

            {/* Manager routes */}
            <Route path="/manager/*" element={
              <ProtectedRoute role="MANAGER">
                <ManagerLayout>
                  <Routes>
                    <Route path="company"    element={<CompanyProfile />} />
                    <Route path="jobs"       element={<ManageJobs />} />
                    <Route path="applicants" element={<Applicants />} />
                    <Route path="ats"        element={<AtsChecker />} />
                    <Route path="chat"       element={<RecruiterChat />} />
                    <Route path="*"          element={<Navigate to="jobs" replace />} />
                  </Routes>
                </ManagerLayout>
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute role="ADMIN">
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="*"         element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;