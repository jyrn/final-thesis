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
  AnalyticsTab,
  ReportsTab,
  JobseekersTab,
  JobDemandTab
} from '../../components/admin';
import adminService from '../../services/adminService';
import './AdminDashboard.css';


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingEmployers, setPendingEmployers] = useState<PendingEmployer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // Check if admin is authenticated
    const storedAdmin = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    
    if (!storedAdmin || !adminToken) {
      navigate('/admin/auth');
      return;
    }

    setAdminUser(JSON.parse(storedAdmin));
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const [statsData, employersData, jobsData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllEmployers(), // Fetch all employers for PESO staff dashboard
        adminService.getJobs({ limit: 10 })
      ]);

      setStats(statsData);
      setPendingEmployers(employersData);
      setJobs(jobsData.jobs || []);
    } catch (error) {    } finally {
      setLoading(false);
    }
  };

  const handleEmployerAction = async (employerId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setLoading(true);
      await adminService.verifyEmployer(employerId, action, reason);
      await fetchDashboardData(); // Refresh data
    } catch (error) {    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = async (documentId: string, action: 'approve' | 'reject', reason?: string, notes?: string) => {
    try {
      await adminService.verifyDocument(documentId, action, reason, notes);
      fetchDashboardData(); // Refresh to get updated document statuses
    } catch (error) {    }
  };

  const handleBulkDocumentAction = async (documentIds: string[], action: 'approve' | 'reject', reason?: string) => {
    try {
      // Find the employer ID from the first document (all should belong to same employer)
      const firstDoc = pendingEmployers
        .flatMap(emp => emp.documents || [])
        .find(doc => documentIds.includes(doc._id));
      
      if (firstDoc) {
        await adminService.bulkVerifyDocuments(firstDoc.employerId, documentIds, action, reason);
        fetchDashboardData(); // Refresh to get updated document statuses
      }
    } catch (error) {    }
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
        'skills-analytics': 'job-demand-analytics'
      };

      const reportType = tabToReportType[activeTab] || 'dashboard-overview';
      
      // Set date range to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Generate PDF report
      const response = await fetch('http://localhost:3001/api/admin/reports/generate', {
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

  const handleLogout = () => {
    adminService.logout();
    navigate('/admin/auth');
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="admin-loading">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
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
            onJobStatusChange={(jobId, status) => {
              // Refresh dashboard data if needed
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


      </div>
    </div>
  );
};

export default AdminDashboard;
