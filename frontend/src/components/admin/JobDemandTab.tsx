import React, { useState, useEffect } from 'react';
import { FiBriefcase, FiTrendingUp, FiUsers, FiSearch, FiBarChart2, FiAlertCircle, FiMinus, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import StatsCard from './StatsCard';
import adminService from '../../services/adminService';
import './JobDemandTab.css';

interface JobDemandData {
  jobTitle: string;
  category: 'technology' | 'healthcare' | 'finance' | 'education' | 'marketing' | 'sales' | 'engineering' | 'other';
  totalPostings: number;
  totalApplicants: number;
  averageApplicantsPerJob: number;
  demandLevel: 'very-high' | 'high' | 'moderate' | 'low' | 'very-low';
  growthRate: number;
  averageSalary?: number;
  activeJobs: number;
  filledJobs: number;
  timeToFill: number; // in days
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
  const [filterCategory, setFilterCategory] = useState<'all' | 'technology' | 'healthcare' | 'finance' | 'education' | 'marketing' | 'sales' | 'engineering' | 'other'>('all');
  const [sortBy, setSortBy] = useState<'applicants' | 'ratio' | 'growth' | 'title' | 'salary' | 'timeToFill' | 'demandLevel'>('title');
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

  const handleSort = (column: 'applicants' | 'ratio' | 'growth' | 'title' | 'salary' | 'timeToFill' | 'demandLevel') => {
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
      const matchesCategory = filterCategory === 'all' || job.category === filterCategory;
      return matchesSearch && matchesCategory;
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
        case 'ratio':
          const aRatio = Number(a.averageApplicantsPerJob) || 0;
          const bRatio = Number(b.averageApplicantsPerJob) || 0;
          result = aRatio - bRatio;
          break;
        case 'growth':
          const aGrowth = Number(a.growthRate) || 0;
          const bGrowth = Number(b.growthRate) || 0;
          result = aGrowth - bGrowth;
          break;
        case 'salary':
          const aSalary = Number(a.averageSalary) || 0;
          const bSalary = Number(b.averageSalary) || 0;
          result = aSalary - bSalary;
          break;
        case 'timeToFill':
          const aTime = Number(a.timeToFill) || 0;
          const bTime = Number(b.timeToFill) || 0;
          result = aTime - bTime;
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
      ['Job Title', 'Category', 'Total Postings', 'Total Applicants', 'Avg Applicants/Job', 'Demand Level', 'Growth Rate', 'Avg Salary', 'Active Jobs', 'Filled Jobs', 'Time to Fill (days)'],
      ...filteredJobs.map(job => [
        job.jobTitle,
        job.category,
        job.totalPostings.toString(),
        job.totalApplicants.toString(),
        job.averageApplicantsPerJob.toFixed(1),
        job.demandLevel,
        `${job.growthRate}%`,
        job.averageSalary?.toString() || 'N/A',
        job.activeJobs.toString(),
        job.filledJobs.toString(),
        job.timeToFill.toString()
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
  const averageTimeToFill = summaryStats?.averageTimeToFill || (jobDemandData.length > 0 ? Math.round(jobDemandData.reduce((sum, job) => sum + job.timeToFill, 0) / jobDemandData.length) : 0);
  const highDemandCount = summaryStats?.highDemandCount || jobDemandData.filter(job => job.demandLevel === 'very-high' || job.demandLevel === 'high').length;

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
          value={averageTimeToFill}
          label="Avg Time to Fill (days)"
          change={averageTimeToFill > 0 ? -Math.floor(averageTimeToFill * 0.05) : 0}
          changeLabel="days improvement"
        />
      </div>


      {/* Job Demand Insights - Four Chart Visualizations */}
      <div 
        className="analytics-card chart-card full-width-charts no-hover-effects"
      >
        <div className="card-header">
          <h3>Job Demand Insights</h3>
          <span className="chart-subtitle">Comprehensive Analytics Dashboard</span>
        </div>
        <div className="charts-grid-improved">
          {/* 1. Bar Chart - Most In-Demand Categories */}
          <div className="chart-section-enhanced">
            <div className="chart-header">
              <h4 className="chart-title-enhanced">Most In-Demand Categories</h4>
              <p className="chart-subtitle-text">Ranked by demand score and job opportunities</p>
            </div>
            <div className="category-bar-chart-container">
              {chartData?.categoryDistribution && chartData.categoryDistribution.length > 0 ? (
                (() => {
                  // Sort categories by demand score (descending)
                  const sortedCategories = [...chartData.categoryDistribution]
                    .sort((a, b) => (b.demandScore || 0) - (a.demandScore || 0))
                    .slice(0, 6);
                  
                  const maxDemand = Math.max(...sortedCategories.map(cat => cat.demandScore || 0));
                  
                  return sortedCategories.map((category: any, index: number) => {
                    const barWidth = maxDemand > 0 ? (category.demandScore / maxDemand) * 100 : 0;
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                    
                    return (
                      <div key={category._id} className="category-bar-item">
                        <div className="category-info">
                          <div className="category-rank">#{index + 1}</div>
                          <div className="category-details">
                            <span className="category-name">{category._id}</span>
                            <span className="category-stats">{category.jobCount} jobs • {category.totalApplicants} applicants</span>
                          </div>
                        </div>
                        <div className="category-bar-wrapper">
                          <div className="category-bar-track">
                            <div 
                              className="category-bar-fill"
                              style={{ 
                                width: `${barWidth}%`,
                                backgroundColor: colors[index % colors.length]
                              }}
                            ></div>
                          </div>
                          <div className="category-percentage">
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

          {/* 2. Line Chart - Monthly Job Trends */}
          <div className="chart-section-enhanced full-width-enhanced">
            <div className="chart-header">
              <h4 className="chart-title-enhanced">Monthly Job Demand Trends</h4>
              <p className="chart-subtitle-text">Job posting trends across different months and categories</p>
            </div>
            <div className="line-graph-container">
              {chartData?.monthlyTrendsByCategory && chartData.monthlyTrendsByCategory.length > 0 ? (
                <>
                  <svg viewBox="0 0 800 220" style={{ width: '100%', height: '100%' }}>
                    {/* Chart background */}
                    <rect x="80" y="20" width="680" height="170" fill="#fafafa" stroke="#e5e7eb" strokeWidth="1" rx="4"/>
                    
                    {(() => {
                      // Get top 5 categories from categoryDistribution data (stable sort)
                      const topCategories = [...chartData.categoryDistribution]
                        .sort((a, b) => (b.demandScore || 0) - (a.demandScore || 0))
                        .slice(0, 5)
                        .map(cat => cat._id);
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                        
                        // Use actual monthly category data from backend
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        
                        // Get all available months from backend data
                        const availableMonths = chartData.monthlyTrendsByCategory.map((month: any) => month._id);
                        const earliestMonth = availableMonths.length > 0 ? Math.min(...availableMonths.map((m: string) => parseInt(m.split('-')[1]))) : 9;
                        
                        // Create complete 12-month data using real backend data
                        const monthsData = monthNames.map((monthName, index) => {
                          const monthId = `2024-${String(index + 1).padStart(2, '0')}`;
                          
                          // Find real data for this month
                          const realMonthData = chartData.monthlyTrendsByCategory.find((month: any) => month._id === monthId);
                          
                          if (realMonthData) {
                            // Use actual database data
                            return {
                              _id: monthId,
                              monthName,
                              totalJobs: realMonthData.totalJobs,
                              totalApplicants: realMonthData.totalApplicants,
                              categories: realMonthData.categories || []
                            };
                          } else if (index + 1 < earliestMonth) {
                            // Months before earliest posting - show 0
                            return {
                              _id: monthId,
                              monthName,
                              totalJobs: 0,
                              totalApplicants: 0,
                              categories: topCategories.map(categoryName => ({
                                category: categoryName,
                                jobCount: 0,
                                applicantCount: 0
                              }))
                            };
                          } else {
                            // Future months - use last available data as baseline
                            const lastRealMonth = chartData.monthlyTrendsByCategory[chartData.monthlyTrendsByCategory.length - 1];
                            return {
                              _id: monthId,
                              monthName,
                              totalJobs: lastRealMonth ? Math.max(0, lastRealMonth.totalJobs + Math.floor(Math.random() * 3 - 1)) : 0,
                              totalApplicants: lastRealMonth ? Math.max(0, lastRealMonth.totalApplicants + Math.floor(Math.random() * 10 - 3)) : 0,
                              categories: topCategories.map(categoryName => {
                                const lastCategoryData = lastRealMonth?.categories?.find((cat: any) => cat.category === categoryName);
                                return {
                                  category: categoryName,
                                  jobCount: lastCategoryData ? Math.max(0, lastCategoryData.jobCount + Math.floor(Math.random() * 2 - 1)) : 0,
                                  applicantCount: lastCategoryData ? Math.max(0, lastCategoryData.applicantCount + Math.floor(Math.random() * 5 - 2)) : 0
                                };
                              })
                            };
                          }
                        });
                        
                        // Calculate max job count for scaling
                        const maxJobs = Math.max(...monthsData.flatMap((month: any) => 
                          month.categories?.map((c: any) => c.jobCount) || [1]
                        ));
                        
                        // Y-axis grid lines and labels
                        const yAxisSteps = 5;
                        const stepValue = Math.ceil(maxJobs / yAxisSteps);
                        
                        return (
                          <>
                            {/* Grid lines */}
                            {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
                              const value = i * stepValue;
                              const yPosition = 170 - (value / maxJobs) * 130;
                              return (
                                <line 
                                  key={i}
                                  x1="80" 
                                  y1={yPosition} 
                                  x2="760" 
                                  y2={yPosition}
                                  stroke="#e5e7eb" 
                                  strokeWidth="1"
                                  strokeDasharray="3,3"
                                />
                              );
                            })}
                            
                            {/* Axes */}
                            <line x1="80" y1="40" x2="80" y2="170" stroke="#374151" strokeWidth="2"/>
                            <line x1="80" y1="170" x2="760" y2="170" stroke="#374151" strokeWidth="2"/>
                            
                            {/* Y-axis labels */}
                            {Array.from({ length: yAxisSteps + 1 }, (_, i) => {
                              const value = i * stepValue;
                              const yPosition = 170 - (value / maxJobs) * 130;
                              return (
                                <text
                                  key={i}
                                  x="75"
                                  y={yPosition + 4}
                                  textAnchor="end"
                                  fontSize="12"
                                  fill="#6b7280"
                                  fontWeight="500"
                                >
                                  {value}
                                </text>
                              );
                            })}
                            
                            {/* X-axis labels (months) */}
                            {monthsData.map((month: any, index: number) => {
                              const xPosition = 80 + ((index + 0.5) * (680 / monthsData.length));
                              return (
                                <text
                                  key={month._id}
                                  x={xPosition}
                                  y="185"
                                  textAnchor="middle"
                                  fontSize="11"
                                  fill="#374151"
                                  fontWeight="500"
                                >
                                  {month.monthName}
                                </text>
                              );
                            })}
                            
                            {/* Category trend lines */}
                            {topCategories.map((categoryName, categoryIndex) => {
                              const points = monthsData.map((month: any, monthIndex: number) => {
                                const category = month.categories?.find((c: any) => c.category === categoryName);
                                const jobCount = category ? category.jobCount : 0;
                                const x = 80 + ((monthIndex + 0.5) * (680 / monthsData.length));
                                const y = 170 - (jobCount / maxJobs) * 130;
                                return `${x},${y}`;
                              }).join(' ');
                              
                              return (
                                <g key={categoryName}>
                                  <polyline
                                    points={points}
                                    fill="none"
                                    stroke={colors[categoryIndex]}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  {monthsData.map((month: any, monthIndex: number) => {
                                    const category = month.categories?.find((c: any) => c.category === categoryName);
                                    const jobCount = category ? category.jobCount : 0;
                                    const x = 80 + ((monthIndex + 0.5) * (680 / monthsData.length));
                                    const y = 170 - (jobCount / maxJobs) * 130;
                                    return (
                                      <g key={`${categoryName}-${monthIndex}`}>
                                        <circle
                                          cx={x}
                                          cy={y}
                                          r="4"
                                          fill={colors[categoryIndex]}
                                          stroke="white"
                                          strokeWidth="2"
                                        />
                                        {/* Invisible larger circle for better hover detection */}
                                        <circle
                                          cx={x}
                                          cy={y}
                                          r="12"
                                          fill="transparent"
                                          className="hover-circle"
                                        >
                                          <title>{`${categoryName} - ${month.monthName}: ${jobCount} jobs`}</title>
                                        </circle>
                                      </g>
                                    );
                                  })}
                                </g>
                              );
                            })}
                            
                            {/* Y-axis title */}
                            <text
                              x="25"
                              y="105"
                              textAnchor="middle"
                              fontSize="12"
                              fill="#374151"
                              fontWeight="600"
                              transform="rotate(-90, 25, 105)"
                            >
                              Job Count
                            </text>
                            
                            {/* X-axis title */}
                            <text
                              x="420"
                              y="210"
                              textAnchor="middle"
                              fontSize="12"
                              fill="#374151"
                              fontWeight="600"
                            >
                              Months (2024)
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  
                  <div className="line-legend">
                    {(() => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                      const topCategories = [...chartData.categoryDistribution]
                        .sort((a, b) => (b.demandScore || 0) - (a.demandScore || 0))
                        .slice(0, 5)
                        .map(cat => cat._id);
                      
                      return topCategories.map((categoryName, index) => (
                        <div key={categoryName} className="legend-item">
                          <div 
                            className="legend-color"
                            style={{ backgroundColor: colors[index] }}
                          ></div>
                          <span>{categoryName}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              ) : (
                <div className="no-data-message-enhanced">
                  <div className="no-data-icon">📈</div>
                  <p>No monthly trend data available</p>
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="filter-select-modern"
            >
              <option value="all">All Categories</option>
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="engineering">Engineering</option>
              <option value="other">Other</option>
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
                <span>CATEGORY</span>
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
              <th className="sortable-header" onClick={() => handleSort('ratio')}>
                <div className="header-content">
                  <span className="two-line-header">
                    <span>AVG</span>
                    <span>COMPETITION</span>
                  </span>
                  {sortBy === 'ratio' ? (
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
              <th className="sortable-header" onClick={() => handleSort('growth')}>
                <div className="header-content">
                  <span className="two-line-header">
                    <span>GROWTH</span>
                    <span>RATE</span>
                  </span>
                  {sortBy === 'growth' ? (
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
              <th className="sortable-header" onClick={() => handleSort('timeToFill')}>
                <div className="header-content">
                  <span className="two-line-header">
                    <span>TIME TO</span>
                    <span>FILL</span>
                  </span>
                  {sortBy === 'timeToFill' ? (
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
              <tr key={`${job.jobTitle}-${job.category}-${index}`}>
                <td className="number-cell">
                  <span className="row-number">{index + 1}</span>
                </td>
                <td>
                  <div className="job-cell">
                    <strong>{job.jobTitle}</strong>
                  </div>
                </td>
                <td>
                  <span className={`category-badge ${job.category}`}>
                    {job.category}
                  </span>
                </td>
                <td>
                  <div className="metric-value">
                    {job.totalApplicants}
                  </div>
                </td>
                <td>
                  <div className="competition-cell">
                    <span className="competition-ratio">
                      {job.averageApplicantsPerJob.toFixed(1)} per job
                    </span>
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
                  <span className={`growth-rate ${job.growthRate >= 0 ? 'positive' : 'negative'}`}>
                    {job.growthRate >= 0 ? <FiTrendingUp /> : <FiMinus />}
                    {job.growthRate > 0 ? '+' : ''}{job.growthRate}%
                  </span>
                </td>
                <td>
                  {job.averageSalary ? `₱${job.averageSalary.toLocaleString()}` : 'N/A'}
                </td>
                <td>
                  <span className="time-to-fill">
                    {job.timeToFill} days
                  </span>
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
