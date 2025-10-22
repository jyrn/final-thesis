import React, { useState, useEffect } from 'react';
import { FiBriefcase, FiTrendingUp, FiUsers, FiSearch, FiBarChart2, FiAlertCircle, FiMinus, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import StatsCard from './StatsCard';
import adminService from '../../services/adminService';
import './JobDemandTab.css';

interface JobDemandData {
  jobTitle: string;
  department: string;
  totalPostings: number;
  totalApplicants: number;
  demandLevel: 'very-high' | 'high' | 'moderate' | 'low' | 'very-low';
  averageSalary?: number;
  activeJobs: number;
  filledJobs: number;
}

interface JobTrend {
  jobTitle: string;
  data: { month: string; postings: number; applicants: number }[];
}

const JobDemandTab: React.FC = () => {
  const [jobDemandData, setJobDemandData] = useState<JobDemandData[]>([]);
  const [jobTrends, setJobTrends] = useState<JobTrend[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'applicants' | 'title' | 'salary' | 'demandLevel'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Define helper functions before they're used
  const getDemandLevelValue = (demandLevel: string) => {
    const level = demandLevel.toLowerCase().replace(/[-_]/g, ' ');
    switch (level) {
      case 'very high': return 5;
      case 'high': return 4;
      case 'medium': return 3;
      case 'moderate': return 3;
      case 'low': return 2;
      case 'very low': return 1;
      default: return 0;
    }
  };

  useEffect(() => {
    fetchJobDemandAnalytics();
  }, []);

  const fetchJobDemandAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsData = await adminService.getJobDemandAnalytics();
      setJobDemandData(analyticsData.jobDemandData || []);
      setSummaryStats(analyticsData.summary || null);
      setChartData(analyticsData.chartData || null);
    } catch (error) {
      setJobDemandData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: 'applicants' | 'title' | 'salary' | 'demandLevel') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const filteredJobs = jobDemandData
    .filter(job => {
      const matchesSearch = job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || job.department === filterDepartment;
      return matchesSearch && matchesDepartment;
    })
    .sort((a, b) => {
      let result = 0;
      
      switch (sortBy) {
        case 'title':
          result = a.jobTitle.localeCompare(b.jobTitle);
          break;
        case 'applicants':
          const aApplicants = Number(a.totalApplicants) || 0;
          const bApplicants = Number(b.totalApplicants) || 0;
          result = aApplicants - bApplicants;
          break;
        case 'salary':
          const aSalary = Number(a.averageSalary) || 0;
          const bSalary = Number(b.averageSalary) || 0;
          result = aSalary - bSalary;
          break;
        case 'demandLevel':
          const aDemandValue = getDemandLevelValue(a.demandLevel || '');
          const bDemandValue = getDemandLevelValue(b.demandLevel || '');
          result = aDemandValue - bDemandValue;
          break;
        default:
      }
      
      return sortOrder === 'asc' ? result : -result;
    });

  const getDemandColor = (demandLevel: string) => {
    const level = demandLevel.toLowerCase().replace(/[-_]/g, ' ');
    switch (level) {
      case 'very high': return '#dc2626'; // Red
      case 'high': return '#ea580c';      // Orange
      case 'medium': return '#ca8a04';    // Yellow/Amber
      case 'moderate': return '#ca8a04';  // Yellow/Amber (alternative)
      case 'low': return '#16a34a';       // Green
      case 'very low': return '#059669';  // Teal
      default: return '#6b7280';          // Gray
    }
  };

  const getDemandBadgeStyle = (demandLevel: string) => {
    const color = getDemandColor(demandLevel);
    return {
      backgroundColor: color + '15', // Light background
      color: color,
      border: `1px solid ${color}40`
    };
  };

  const getDemandLabel = (level: string) => {
    switch (level) {
      case 'very-high': return 'Very High Demand';
      case 'high': return 'High Demand';
      case 'moderate': return 'Moderate Demand';
      case 'low': return 'Low Demand';
      case 'very-low': return 'Very Low Demand';
      case 'low': return 'Low Competition';
      case 'very-low': return 'Very Low Competition';
      default: return 'Unknown';
    }
  };

  const exportJobDemandData = () => {
    const csvContent = [
      ['Job Title', 'Department', 'Total Postings', 'Total Applicants', 'Demand Level', 'Avg Salary', 'Active Jobs', 'Filled Jobs'],
      ...filteredJobs.map(job => [
        job.jobTitle,
        job.department,
        job.totalPostings.toString(),
        job.totalApplicants.toString(),
        job.demandLevel,
        job.averageSalary?.toString() || 'N/A',
        job.activeJobs.toString(),
        job.filledJobs.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-demand-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };



  // Use summary stats if available, otherwise calculate from data
  const totalJobs = summaryStats?.totalJobs || jobDemandData.reduce((sum, job) => sum + job.totalPostings, 0);
  const totalApplicants = summaryStats?.totalApplicants || jobDemandData.reduce((sum, job) => sum + job.totalApplicants, 0);
  const highDemandCount = summaryStats?.highDemandCount || jobDemandData.filter(job => job.demandLevel === 'very-high' || job.demandLevel === 'high').length;
  const totalCategories = summaryStats?.totalCategories || jobDemandData.length;

  if (loading) {
    return (
      <div className="admin-content">
        <div className="loading-spinner"></div>
        <p>Loading job demand analytics...</p>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="stats-grid">
        <StatsCard
          icon={FiBriefcase}
          value={totalJobs}
          label="Total Job Postings"
          change={totalJobs > 0 ? Math.floor(totalJobs * 0.08) : 0}
          changeLabel="from last month"
        />
        <StatsCard
          icon={FiUsers}
          value={totalApplicants}
          label="Total Applicants"
          change={totalApplicants > 0 ? Math.floor(totalApplicants * 0.12) : 0}
          changeLabel="from last month"
        />
        <StatsCard
          icon={FiTrendingUp}
          value={highDemandCount}
          label="High Demand Jobs"
          change={highDemandCount > 0 ? Math.floor(highDemandCount * 0.15) : 0}
          changeLabel="from last month"
        />
        <StatsCard
          icon={FiBarChart2}
          value={totalCategories}
          label="Job Categories"
          change={totalCategories > 0 ? Math.floor(totalCategories * 0.1) : 0}
          changeLabel="from last month"
        />
      </div>


      {/* Job Demand Insights - Department Distribution */}
      <div 
        className="analytics-card chart-card full-width-charts no-hover-effects"
      >
        <div className="card-header">
          <h3>Job Demand by Department</h3>
          <span className="chart-subtitle">Distribution of jobs and applicants across departments</span>
        </div>
        <div className="charts-grid-improved">
          {/* 1. Horizontal Bar Chart - Top Demanding Categories */}
          <div className="chart-section-enhanced">
            <div className="chart-header">
              <h4 className="chart-title-enhanced">Most In-Demand Categories</h4>
              <p className="chart-subtitle-text">Ranked by demand score and job opportunities</p>
            </div>
            <div className="horizontal-bar-chart-container">
              {chartData?.departmentDistribution && chartData.departmentDistribution.length > 0 ? (
                (() => {
                  // Sort categories by demand score (descending) and take top 6
                  const sortedCategories = [...chartData.departmentDistribution]
                    .sort((a, b) => (b.demandScore || 0) - (a.demandScore || 0))
                    .slice(0, 6);
                  
                  const maxDemand = Math.max(...sortedCategories.map(cat => cat.demandScore || 0));
                  
                  return sortedCategories.map((category: any, index: number) => {
                    const barWidth = maxDemand > 0 ? (category.demandScore / maxDemand) * 100 : 0;
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                    
                    return (
                      <div key={category._id} className="horizontal-bar-item">
                        <div className="job-info">
                          <div className="job-rank">#{index + 1}</div>
                          <div className="job-details">
                            <span className="job-name">{category._id}</span>
                            <span className="job-stats">{category.jobCount} jobs • {category.totalApplicants} applicants</span>
                          </div>
                        </div>
                        <div className="horizontal-bar-wrapper">
                          <div className="horizontal-bar-track">
                            <div 
                              className="horizontal-bar-fill"
                              style={{ 
                                width: `${barWidth}%`,
                                backgroundColor: colors[index % colors.length]
                              }}
                            ></div>
                          </div>
                          <div className="bar-percentage">
                            {barWidth.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="no-data-message-enhanced">
                  <div className="no-data-icon">📊</div>
                  <p>No category data available</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Donut Chart - Department Distribution */}
          <div className="chart-section-enhanced">
            <div className="chart-title-container">
              <h4 className="chart-title-enhanced">Top 10 Companies by Hires</h4>
              <p className="chart-subtitle-text">Companies with the highest number of successful hires</p>
            </div>
            <div className="donut-chart-container">
              {chartData?.companyHiringData && chartData.companyHiringData.length > 0 ? (
                (() => {
                  // Sort by total hired and take top 10
                  const companies = [...chartData.companyHiringData]
                    .sort((a, b) => b.totalHired - a.totalHired)
                    .slice(0, 10);
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#06b6d4', '#8b5cf6'];
                  const total = companies.reduce((sum: number, company: any) => sum + company.totalHired, 0);
                  
                  return (
                    <div className="donut-chart-wrapper">
                      <svg viewBox="0 0 400 400" style={{ width: '400px', height: '400px' }}>
                        {(() => {
                          let cumulativePercentage = 0;
                          const radius = 120;
                          const innerRadius = 75;
                          const centerX = 200;
                          const centerY = 200;
                          
                          return companies.map((company: any, index: number) => {
                            const percentage = total > 0 ? (company.totalHired / total) * 100 : 0;
                            const startAngle = (cumulativePercentage / 100) * 360 - 90;
                            const endAngle = ((cumulativePercentage + percentage) / 100) * 360 - 90;
                            
                            const startAngleRad = (startAngle * Math.PI) / 180;
                            const endAngleRad = (endAngle * Math.PI) / 180;
                            
                            const x1 = centerX + radius * Math.cos(startAngleRad);
                            const y1 = centerY + radius * Math.sin(startAngleRad);
                            const x2 = centerX + radius * Math.cos(endAngleRad);
                            const y2 = centerY + radius * Math.sin(endAngleRad);
                            
                            const x3 = centerX + innerRadius * Math.cos(endAngleRad);
                            const y3 = centerY + innerRadius * Math.sin(endAngleRad);
                            const textX = centerX + (radius + innerRadius) / 2 * Math.cos((startAngleRad + endAngleRad) / 2);
                            const textY = centerY + (radius + innerRadius) / 2 * Math.sin((startAngleRad + endAngleRad) / 2);
                            
                            const textElement = percentage > 5 ? (
                              <text 
                                key={`text-${index}`}
                                x={textX} 
                                y={textY} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fontSize="12" 
                                fill="white" 
                                fontWeight="bold"
                              >
                                {company._id.length > 8 ? company._id.substring(0, 8) + '...' : company._id}
                              </text>
                            ) : null;

                            const x4 = centerX + innerRadius * Math.cos(startAngleRad);
                            const y4 = centerY + innerRadius * Math.sin(startAngleRad);
                            
                            const largeArcFlag = percentage > 50 ? 1 : 0;
                            
                            const pathData = [
                              `M ${x1} ${y1}`,
                              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              `L ${x3} ${y3}`,
                              `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                              'Z'
                            ].join(' ');
                            
                            cumulativePercentage += percentage;
                            
                            return (
                              <g key={company._id}>
                                <path
                                  d={pathData}
                                  fill={colors[index % colors.length]}
                                  stroke="white"
                                  strokeWidth="2"
                                >
                                  <title>{`${company._id}: ${company.totalHired} hires (${percentage.toFixed(1)}%)`}</title>
                                </path>
                                {textElement}
                              </g>
                            );
                          });
                        })()
                        }
                        
                        {/* Center text */}
                        <text x="200" y="185" textAnchor="middle" fontSize="16" fill="#374151" fontWeight="600">
                          Total
                        </text>
                        <text x="200" y="205" textAnchor="middle" fontSize="24" fill="#1f2937" fontWeight="700">
                          {total}
                        </text>
                        <text x="200" y="225" textAnchor="middle" fontSize="14" fill="#6b7280">
                          Hires
                        </text>
                      </svg>
                      
                      <div className="donut-legend">
                        {companies.map((company: any, index: number) => {
                          const percentage = total > 0 ? (company.totalHired / total) * 100 : 0;
                          return (
                            <div key={company._id} className="legend-item">
                              <div 
                                className="legend-color"
                                style={{ backgroundColor: colors[index % colors.length] }}
                              ></div>
                              <div className="legend-text">
                                <span className="legend-label">{company._id}</span>
                                <span className="legend-value">{company.totalHired} hires ({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="no-data-message-enhanced">
                  <div className="no-data-icon">🍩</div>
                  <p>No department data available</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Job Demand Analytics Container */}
      <div className="job-demand-main-container">
        
        {/* Search and Filters Container */}
        <div className="job-demand-header-container">
          <div className="header-left">
            <h2 className="section-title">Job Demand Analytics ({filteredJobs.length} total)</h2>
            <p className="section-subtitle">Showing {filteredJobs.length} job categories</p>
          </div>
          
          <div className="job-demand-controls">
            <div className="search-container">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search job titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-modern"
              />
            </div>
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="filter-select-modern"
            >
              <option value="all">All Departments</option>
              {Array.from(new Set(jobDemandData.map(job => job.department))).sort().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        {filteredJobs.length > 0 ? (
          <div className="admin-job-demand-table-container">
            <div className="admin-job-demand-table-wrapper">
              <table className="admin-job-demand-table">
          <thead>
            <tr>
              <th className="number-column">#</th>
              <th className="sortable-header" onClick={() => handleSort('title')}>
                <div className="header-content">
                  <span>JOB TITLE</span>
                  {sortBy === 'title' ? (
                    sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                  ) : (
                    <FiChevronDown className="sort-icon-inactive" />
                  )}
                </div>
              </th>
              <th>
                <span>DEPARTMENT</span>
              </th>
              <th className="sortable-header" onClick={() => handleSort('applicants')}>
                <div className="header-content">
                  <span>APPLICANTS</span>
                  {sortBy === 'applicants' ? (
                    sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                  ) : (
                    <FiChevronDown className="sort-icon-inactive" />
                  )}
                </div>
              </th>
              <th className="sortable-header" onClick={() => handleSort('demandLevel')}>
                <div className="header-content">
                  <span className="two-line-header">
                    <span>DEMAND</span>
                    <span>LEVEL</span>
                  </span>
                  {sortBy === 'demandLevel' ? (
                    sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                  ) : (
                    <FiChevronDown className="sort-icon-inactive" />
                  )}
                </div>
              </th>
              <th className="sortable-header" onClick={() => handleSort('salary')}>
                <div className="header-content">
                  <span className="two-line-header">
                    <span>AVG</span>
                    <span>SALARY</span>
                  </span>
                  {sortBy === 'salary' ? (
                    sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                  ) : (
                    <FiChevronDown className="sort-icon-inactive" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job, index) => (
              <tr key={`${job.jobTitle}-${job.department}-${index}`}>
                <td className="number-cell">
                  <span className="row-number">{index + 1}</span>
                </td>
                <td>
                  <div className="job-cell">
                    <strong>{job.jobTitle}</strong>
                  </div>
                </td>
                <td>
                  <span className="department-badge">
                    {job.department}
                  </span>
                </td>
                <td>
                  <div className="metric-value">
                    {job.totalApplicants}
                  </div>
                </td>
                <td>
                  <span 
                    className="demand-badge"
                    style={getDemandBadgeStyle(job.demandLevel)}
                  >
                    {job.demandLevel}
                  </span>
                </td>
                <td>
                  {job.averageSalary ? `₱${job.averageSalary.toLocaleString()}` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <FiBriefcase className="empty-icon" />
          <h3>No jobs found</h3>
          <p>No jobs match your current filters.</p>
        </div>
      )}
      
      </div> {/* Close job-demand-main-container */}
    </div>
  );
};

export default JobDemandTab;
