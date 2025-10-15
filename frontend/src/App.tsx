import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RoleSelectionPage from './pages/auth/RoleSelectionPage';
import EmployerAuth from './pages/auth/EmployerAuth';
import JobseekerAuth from './pages/auth/JobseekerAuth';
import EmployerDocuments from './pages/auth/EmployerDocuments';
import VerificationPending from './pages/auth/VerificationPending';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import OTPVerificationPage from './pages/auth/OTPVerificationPage';
import JobSeekerDashboard from './pages/jobseeker/Dashboard';
import EmployerDashboard from './pages/employer/Dashboard';
import AdminAuth from './pages/admin/AdminAuth';
import AdminDashboard from './pages/admin/AdminDashboard';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes without layout */}
        <Route path="/" element={<RoleSelectionPage />} />
        <Route path="/auth" element={<RoleSelectionPage />} />
        <Route path="/auth/employer" element={<EmployerAuth />} />
        <Route path="/auth/employer/documents" element={<EmployerDocuments />} />
        <Route path="/auth/verification-pending" element={<VerificationPending />} />
        <Route path="/auth/jobseeker" element={<JobseekerAuth />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/verify-email" element={<EmailVerificationPage />} />
        <Route path="/auth/verify-otp" element={<OTPVerificationPage />} />

        {/* Admin routes without layout */}
        <Route path="/admin/auth" element={<AdminAuth />} />
        <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/pesostaff/dashboard" element={<AdminDashboard />} />

        {/* Protected routes with layout */}
        <Route path="/" element={<MainLayout />}>
          <Route path="/jobseeker/dashboard" element={<JobSeekerDashboard />} />
          <Route path="/employer/dashboard" element={<EmployerDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
