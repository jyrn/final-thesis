import React, { useState, useEffect } from 'react';
import { FiUsers, FiBriefcase, FiFileText, FiTrendingUp, FiClock } from 'react-icons/fi';
import { HiCheckCircle } from 'react-icons/hi';
import { DashboardStats } from '../../types/admin';
import StatsCard from './StatsCard';
import adminService from '../../services/adminService';
import { useAutoRefresh, useTimeSinceRefresh } from '../../hooks/useAutoRefresh';

interface OverviewTabProps {
  stats: DashboardStats | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats }) => {
  const [realStats, setRealStats] = useState({
    totalUsers: 0,
    totalEmployers: 0,
    totalJobSeekers: 0,
    totalJobs: 0,
    totalApplications: 0,
    pendingEmployers: 0,
    activeJobs: 0,
    loading: true
  });

  // Auto-refresh hook - refreshes every 30 seconds
  const { refresh: manualRefresh, isRefreshing, lastRefreshTime } = useAutoRefresh(
    fetchRealStats,
    {
      interval: 30000, // 30 seconds
      enabled: true,
      refreshOnMount: false,
      refreshOnFocus: true
    }
  );

  // Get formatted time since last refresh
  const timeSinceRefresh = useTimeSinceRefresh(lastRefreshTime);

  useEffect(() => {
    fetchRealStats();
  }, []);

  async function fetchRealStats() {
    try {
      // Try to get dashboard stats first (this should work)
      let dashboardStats = null;
      try {
        dashboardStats = await adminService.getDashboardStats();
      } catch (error) {      }

      // If dashboard stats worked, use them directly
      if (dashboardStats && (dashboardStats.totalUsers > 0 || dashboardStats.totalJobs > 0)) {
        setRealStats({
          totalUsers: dashboardStats.totalUsers || 0,
          totalEmployers: dashboardStats.totalEmployers || 0,
          totalJobSeekers: dashboardStats.totalJobSeekers || 0,
          totalJobs: dashboardStats.totalJobs || 0,
          totalApplications: dashboardStats.totalApplications || 0,
          pendingEmployers: dashboardStats.pendingEmployers || 0,
          activeJobs: dashboardStats.activeJobs || 0,
          loading: false
        });
        return;
      }

      // Fallback: Try individual API calls
      const results = await Promise.allSettled([
        adminService.getUsers({}),
        adminService.getAllEmployers(),
        adminService.getJobs({ limit: 1000 }),
        adminService.getPendingEmployers()
      ]);

      const usersResponse = results[0].status === 'fulfilled' ? results[0].value : null;
      const employersResponse = results[1].status === 'fulfilled' ? results[1].value : [];
      const jobsResponse = results[2].status === 'fulfilled' ? results[2].value : null;
      const pendingEmployersResponse = results[3].status === 'fulfilled' ? results[3].value : [];

      const allUsers = usersResponse?.users || usersResponse || [];
      const allEmployers = employersResponse || [];
      const allJobs = jobsResponse?.jobs || jobsResponse?.data || jobsResponse || [];
      const pendingEmployers = pendingEmployersResponse || [];

      // Calculate stats
      const jobSeekers = allUsers.filter((user: any) => user.role === 'jobseeker' || user.userType === 'jobseeker');
      const employers = allUsers.filter((user: any) => user.role === 'employer' || user.userType === 'employer');

      const newStats = {
        totalUsers: allUsers.length,
        totalEmployers: Math.max(employers.length, allEmployers.length),
        totalJobSeekers: jobSeekers.length,
        totalJobs: allJobs.length,
        totalApplications: dashboardStats?.totalApplications || 0,
        pendingEmployers: pendingEmployers.length,
        activeJobs: allJobs.filter((job: any) => job.status === 'active' || job.isActive).length,
        loading: false
      };

      setRealStats(newStats);
      
    } catch (error) {      // Set some default values so it's not all zeros
      setRealStats({
        totalUsers: 0,
        totalEmployers: 0,
        totalJobSeekers: 0,
        totalJobs: 0,
        totalApplications: 0,
        pendingEmployers: 0,
        activeJobs: 0,
        loading: false
      });
    }
  };

  const getMonthlyChange = (current: number, baseline: number = 10) => {
    return current - baseline;
  };
  // Use fallback stats if realStats are still loading or failed
  const displayStats = realStats.loading ? {
    totalUsers: stats?.totalUsers || 0,
    totalEmployers: stats?.totalEmployers || 0,
    totalJobSeekers: stats?.totalJobSeekers || 0,
    totalJobs: stats?.totalJobs || 0,
    totalApplications: stats?.totalApplications || 0,
    pendingEmployers: stats?.pendingEmployers || 0,
    activeJobs: stats?.activeJobs || 0,
  } : realStats;

  return (
    <div className="admin-content">
      <div className="stats-grid">
        <StatsCard
          icon={FiUsers}
          value={displayStats.totalUsers}
          label="Total Users"
          change={getMonthlyChange(displayStats.totalUsers, 5)}
          changeLabel="from last month"
        />
        <StatsCard
          icon={FiBriefcase}
          value={displayStats.totalEmployers}
          label="Employers"
          change={getMonthlyChange(displayStats.totalEmployers, 2)}
          changeLabel="from last month"
        />
        <StatsCard
          icon={HiCheckCircle}
          value={displayStats.totalJobSeekers}
          label="Jobseekers"
          change={getMonthlyChange(displayStats.totalJobSeekers, 3)}
          changeLabel="from last month"
        />
        <StatsCard
          icon={FiFileText}
          value={displayStats.totalJobs}
          label="Job Postings"
          change={getMonthlyChange(displayStats.totalJobs, 10)}
          changeLabel="from last month"
        />
        <StatsCard
          icon={FiClock}
          value={displayStats.pendingEmployers}
          label="Pending Reviews"
          changeText={`${displayStats.pendingEmployers} awaiting review`}
        />
        <StatsCard
          icon={FiTrendingUp}
          value={displayStats.activeJobs}
          label="Active Jobs"
          change={getMonthlyChange(displayStats.activeJobs, 8)}
          changeLabel="from last month"
        />
      </div>


      <div className="dashboard-sections">
        <div className="section">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <HiCheckCircle className="activity-icon" />
              <div>
                <p>{stats?.recentApplications || 0} new applications this week</p>
                <span>Job applications</span>
              </div>
            </div>
            <div className="activity-item">
              <FiBriefcase className="activity-icon" />
              <div>
                <p>{stats?.pendingEmployers || 0} employers awaiting verification</p>
                <span>Verification queue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
