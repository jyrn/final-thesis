import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminUser, DashboardStats, PendingEmployer, Job, AdminTab } from '../../types/admin';
import { 
  AdminSidebar, 
  AdminHeader, 
  OverviewTab, 
  EmployersTab, 
  JobsTab, 
  SuperAdminJobsTab,
  UsersTab,
  AdminManagementTab,
  AnalyticsTab,
  ReportsTab,
  JobseekersTab,
  JobDemandTab
} from '../../components/admin';
import adminService from '../../services/adminService';
import './SuperAdminDashboard.css';



const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingEmployers, setPendingEmployers] = useState<PendingEmployer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // Check if super admin is authenticated
    const storedAdmin = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    
    if (!storedAdmin || !adminToken) {
      navigate('/admin/auth');
      return;
    }

    const admin = JSON.parse(storedAdmin);
    if (admin.role !== 'admin') {
      navigate('/pesostaff/dashboard');
      return;
    }

    setAdminUser(admin);
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const [statsData, employersData, jobsData, usersResponse] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllEmployers(), // Fetch all employers for admin dashboard
        adminService.getJobs({ limit: 10 }),
        adminService.getAdminUsers() // Fetch all admin users (both pesostaff and admin)
      ]);

      setStats(statsData);
      setPendingEmployers(employersData);
      setJobs(jobsData.jobs || []);
      setAdminUsers(usersResponse || []);
    } catch (error) {    } finally {
      setLoading(false);
    }
  };

  const handleEmployerAction = async (employerId: string, action: 'approve' | 'reject', reason?: string) => {
    try {      setLoading(true);
      await adminService.verifyEmployer(employerId, action, reason);      await fetchDashboardData();    } catch (error) {    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (adminData: any) => {
    try {      const newAdmin = await adminService.createAdmin(adminData);      // Refresh the dashboard data to show the new admin
      await fetchDashboardData();
      
      // Show success message
      alert('Admin user created successfully!');
    } catch (error) {      alert(`Failed to create admin: ${error.message}`);
    }
  };

  const handleEditAdmin = async (adminId: string, adminData: any) => {
    try {      await adminService.updateUser(adminId, adminData);
      
      // Refresh the dashboard data to show the updated admin
      await fetchDashboardData();
      
      // Show success message
      alert('Admin user updated successfully!');
    } catch (error) {      alert(`Failed to update admin: ${error.message}`);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      try {        await adminService.deleteUser(adminId);
        
        // Refresh the dashboard data to remove the deleted admin
        await fetchDashboardData();
        
        // Show success message
        alert('Admin user deleted successfully!');
      } catch (error) {        alert(`Failed to delete admin: ${error.message}`);
      }
    }
  };

  const handleLogout = () => {
    adminService.logout();
    navigate('/admin/auth');
  };

  const getTabInfo = (tab: string) => {
    const tabMap: Record<string, { title: string; subtitle: string }> = {
      'overview': {
        title: 'Dashboard',
        subtitle: 'System overview and key metrics'
      },
      'employer-verification': {
        title: 'Employer Verification',
        subtitle: 'Review and approve employer applications'
      },
      'job-postings': {
        title: 'Job Postings',
        subtitle: 'Manage and monitor job listings'
      },
      'jobseekers': {
        title: 'Jobseekers',
        subtitle: 'Job seeker profiles and management'
      },
      'skills-analytics': {
        title: 'Job Demand Analytics',
        subtitle: 'Job market demand and competition analysis'
      },
      'generate-reports': {
        title: 'Reports',
        subtitle: 'Generate system and performance reports'
      },
      'admin-management': {
        title: 'Admin Management',
        subtitle: 'Manage administrator accounts and permissions'
      },
    };

    return tabMap[tab] || { title: 'Dashboard', subtitle: 'System management' };
  };

  const generateSystemReport = async () => {
    try {
      // Map active tab to report type
      const tabToReportType: { [key: string]: string } = {
        'overview': 'dashboard-overview',
        'employers': 'employer-verification',
        'jobs': 'job-postings',
        'jobseekers': 'jobseekers-summary',
        'admin-management': 'admin-activity',
        'skills-analytics': 'job-demand-analytics'
      };

      const reportType = tabToReportType[activeTab] || 'dashboard-overview';
      
      // Set date range to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Generate PDF report
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          reportType: reportType,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          format: 'pdf',
          includeDetails: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Check if response is PDF or JSON (fallback)
      const contentType = response.headers.get('Content-Type');
      
      if (contentType && contentType.includes('application/pdf')) {
        // Handle PDF response
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-report-${formatDate(endDate)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Handle JSON fallback
        const data = await response.json();        const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-report-${formatDate(endDate)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {      alert('Failed to generate report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="superadmin-dashboard">
      <AdminSidebar 
        adminUser={adminUser!}
        activeTab={activeTab as AdminTab}
        onTabChange={(tab: AdminTab) => setActiveTab(tab)}
        onLogout={handleLogout}
      />

      <div className="admin-main">
        <AdminHeader 
          title={getTabInfo(activeTab).title}
          subtitle={getTabInfo(activeTab).subtitle}
          actions={
            activeTab !== 'generate-reports' ? (
              <button className="report-btn" onClick={generateSystemReport}>
                Generate Report
              </button>
            ) : null
          }
        />

        {activeTab === 'overview' && (
          <OverviewTab 
            stats={stats}
          />
        )}

        {activeTab === 'employer-verification' && (
          <EmployersTab 
            pendingEmployers={pendingEmployers}
            onEmployerAction={handleEmployerAction}
            loading={loading}
          />
        )}

        {activeTab === 'job-postings' && (
          <SuperAdminJobsTab 
            onJobStatusChange={(jobId, status) => {              // Refresh dashboard data if needed
              fetchDashboardData();
            }}
          />
        )}


        {activeTab === 'jobseekers' && (
          <JobseekersTab />
        )}


        {activeTab === 'skills-analytics' && (
          <JobDemandTab />
        )}

        {activeTab === 'generate-reports' && (
          <ReportsTab />
        )}

        {activeTab === 'admin-management' && (
          <AdminManagementTab 
            adminUsers={adminUsers}
            onCreateAdmin={handleCreateAdmin}
            onEditAdmin={handleEditAdmin}
            onDeleteAdmin={handleDeleteAdmin}
          />
        )}


      </div>
    </div>
  );
};

export default SuperAdminDashboard;
