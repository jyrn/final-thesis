import React, { useState, useEffect } from 'react';
import { 
  FiDownload, 
  FiCalendar, 
  FiFileText, 
  FiUsers, 
  FiBriefcase, 
  FiTrendingUp, 
  FiBarChart2,
  FiFile,
  FiClock,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import adminService from '../../services/adminService';
import { API_BASE_URL } from '../../config/apiConfig';
import './ReportsTab.css';

// Inject CSS styles for date filter controls
const dateFilterStyles = document.createElement('style');
dateFilterStyles.textContent = `
  .date-filter-controls {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 1.5rem;
    padding: 1rem 1.25rem;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    margin: 1rem 0;
  }

  .date-filter-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .date-filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #495057;
    margin-bottom: 0.25rem;
  }

  .date-filter-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
    width: 140px;
    transition: border-color 0.2s ease;
  }

  .date-filter-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .date-preset-btn {
    padding: 0.5rem 0.875rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
    align-self: flex-end;
    margin-top: 1.5rem;
  }

  .date-preset-btn:hover {
    background: #0056b3;
  }

  .date-clear-btn {
    padding: 0.5rem 0.875rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
    align-self: flex-end;
    margin-top: 1.5rem;
  }

  .date-clear-btn:hover {
    background: #545b62;
  }

  .category-data-table .status-cell {
    width: 120px;
    min-width: 120px;
  }

  .category-data-table .date-cell {
    width: 140px;
    min-width: 140px;
  }

  .status-filter-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .status-filter-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
    width: 140px;
    transition: border-color 0.2s ease;
    cursor: pointer;
  }

  .status-filter-select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .category-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: flex-start;
  }

  .category-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .category-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #212529;
    margin: 0;
  }

  .category-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    .date-filter-controls {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .date-filter-group {
      align-items: stretch;
    }
    
    .date-filter-input {
      width: 100%;
    }

    .date-preset-btn, .date-clear-btn {
      align-self: stretch;
      margin-top: 0;
    }
  }
`;

if (!document.head.contains(dateFilterStyles)) {
  document.head.appendChild(dateFilterStyles);
}

interface ReportFilter {
  reportTypes: string[];
  dateRange: string;
  startDate: string;
  endDate: string;
  format: 'pdf' | 'xlsx';
  includeDetails: boolean;
  statusFilter: string;
}

interface ReportData {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  category: 'employers' | 'jobs' | 'jobseekers' | 'hiring';
}

interface ReportTableData {
  employers: EmployerReportRow[];
  jobs: JobReportRow[];
  jobseekers: JobseekerReportRow[];
  hiring: HiringReportRow[];
}

interface EmployerReportRow {
  id: string;
  companyName: string;
  industry: string;
  email: string;
  status: string;
  dateRegistered: string;
  applicationCount: number;
  jobPostingsCount: number;
}

interface JobReportRow {
  id: string;
  jobTitle: string;
  companyName: string;
  department: string;
  status: string;
  postedDate: string;
  applicationCount: number;
}

interface JobseekerReportRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  registrationDate: string;
}

interface HiringReportRow {
  id: string;
  companyName: string;
  hiredCount: number;
  latestHireDate: string;
}

// Helper functions for report formatting

const formatReportForPDF = (reportData: any, reportName?: string): string => {
  const { reportMetadata, data } = reportData;
  
  let content = `${reportName || 'Report'}\n`;
  content += `${'='.repeat(50)}\n\n`;
  content += `Generated: ${new Date(reportMetadata.generatedAt).toLocaleString()}\n`;
  content += `Date Range: ${reportMetadata.startDate} to ${reportMetadata.endDate}\n`;
  content += `Generated By: ${reportMetadata.generatedBy}\n\n`;
  
  // Add summary
  if (data.summary) {
    content += "SUMMARY\n";
    content += `${'-'.repeat(20)}\n`;
    Object.entries(data.summary).forEach(([key, value]) => {
      content += `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}\n`;
    });
    content += "\n";
  }
  
  // Add detailed data
  if (data.details && Array.isArray(data.details) && data.details.length > 0) {
    content += "DETAILED DATA\n";
    content += `${'-'.repeat(20)}\n`;
    data.details.forEach((item: any, index: number) => {
      content += `Record ${index + 1}:\n`;
      Object.entries(item).forEach(([key, value]) => {
        content += `  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
      });
      content += "\n";
    });
  }
  
  return content;
};

// Helper function to get status options for each category
const getStatusOptions = (category: string) => {
  switch (category) {
    case 'employers':
      return [
        { value: 'all', label: 'All Status' },
        { value: 'verified', label: 'Verified' },
        { value: 'pending', label: 'Pending' },
        { value: 'rejected', label: 'Rejected' }
      ];
    case 'jobs':
      return [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'paused', label: 'Paused' },
        { value: 'removed', label: 'Removed' },
        { value: 'flagged', label: 'Flagged' }
      ];
    case 'jobseekers':
      return [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ];
    case 'hiring':
      return [
        { value: 'all', label: 'All Companies' }
      ];
    default:
      return [{ value: 'all', label: 'All Status' }];
  }
};

const ReportsTab: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilter>({
    reportTypes: [],
    dateRange: '', // Start with empty to show placeholder
    startDate: '',
    endDate: '',
    format: 'pdf',
    includeDetails: true,
    statusFilter: 'all'
  });
  
  const [loading, setLoading] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{current: number, total: number, currentReport: string}>({current: 0, total: 0, currentReport: ''});
  const [selectedCategory, setSelectedCategory] = useState<string>('employers');
  const [reportTableData, setReportTableData] = useState<ReportTableData>({
    employers: [],
    jobs: [],
    jobseekers: [],
    hiring: []
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

  // Sorting function
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const getSortedData = (data: any[]) => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle dates
      if (sortConfig.key.includes('Date') || sortConfig.key.includes('date')) {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Handle strings (fallback)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Sortable header component
  const SortableHeader = ({ column, children, isSortable = false }: { 
    column: string; 
    children: React.ReactNode; 
    isSortable?: boolean;
  }) => {
    if (!isSortable) {
      return <th>{children}</th>;
    }

    const isActive = sortConfig?.key === column;
    const direction = isActive ? sortConfig.direction : null;

    return (
      <th 
        className="sortable-header" 
        onClick={() => handleSort(column)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div className="header-content">
          {children}
          <span className="sort-icon">
            {direction === 'asc' ? <FiChevronUp /> : direction === 'desc' ? <FiChevronDown /> : <FiChevronDown style={{ opacity: 0.3 }} />}
          </span>
        </div>
      </th>
    );
  };

  const reportTypes: ReportData[] = [
    // Registered Jobseekers Report
    {
      id: 'registered-jobseekers',
      name: 'Registered Jobseekers Report',
      description: 'Total registered jobseekers, demographics, profile completeness, and activity status',
      icon: FiUsers,
      category: 'jobseekers'
    },
    
    // Employers/Companies Report
    {
      id: 'employers-companies',
      name: 'Employers/Companies Report',
      description: 'Registered employers, company profiles, verification status, and activity metrics',
      icon: FiBriefcase,
      category: 'employers'
    },
    
    // Job Postings Report
    {
      id: 'job-postings',
      name: 'Job Postings Report',
      description: 'All job postings with status, categories, salary ranges, and success rates',
      icon: FiFileText,
      category: 'jobs'
    },
    
    // Hiring Analytics Report
    {
      id: 'hiring-analytics',
      name: 'Hiring Analytics Report',
      description: 'Companies and their hiring statistics, showing total hired employees per company',
      icon: FiTrendingUp,
      category: 'hiring'
    }
  ];

  const dateRangeOptions = [
    // Placeholder option
    { value: '', label: 'Select Date Range...' },
    // Quick ranges
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    
    // Weekly/Monthly ranges
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    
    // Current periods
    { value: 'thisweek', label: 'This Week' },
    { value: 'thismonth', label: 'This Month' },
    { value: 'thisquarter', label: 'This Quarter' },
    { value: 'thisyear', label: 'This Year' },
    
    // Previous periods
    { value: 'lastweek', label: 'Last Week' },
    { value: 'lastmonth', label: 'Last Month' },
    { value: 'lastquarter', label: 'Last Quarter' },
    { value: 'lastyear', label: 'Last Year' },
    
    // Extended ranges
    { value: 'last3months', label: 'Last 3 Months' },
    { value: 'last6months', label: 'Last 6 Months' },
    
    // Custom
    { value: 'custom', label: 'Custom Range' }
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'xlsx', label: 'Excel Spreadsheet' }
  ];

  useEffect(() => {
    // Only set default date range based on dropdown selection if not custom
    if (filters.dateRange === 'custom') return;
    
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filters.dateRange) {
      case 'today':
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(today),
          endDate: formatDate(today)
        }));
        break;
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(yesterday),
          endDate: formatDate(yesterday)
        }));
        break;
        
      case 'last7days':
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(week),
          endDate: formatDate(today)
        }));
        break;
        
      case 'last30days':
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(month),
          endDate: formatDate(today)
        }));
        break;
        
      case 'thisweek':
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
        startOfWeek.setDate(diff);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(startOfWeek),
          endDate: formatDate(today)
        }));
        break;
        
      case 'thismonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(startOfMonth),
          endDate: formatDate(today)
        }));
        break;
        
      case 'thisquarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(quarterStart),
          endDate: formatDate(today)
        }));
        break;
        
      case 'thisyear':
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(startOfYear),
          endDate: formatDate(today)
        }));
        break;
        
      case 'lastweek':
        const lastWeekEnd = new Date(today);
        const lastWeekStart = new Date(today);
        const dayOfWeek = lastWeekEnd.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as first day
        lastWeekEnd.setDate(lastWeekEnd.getDate() - daysToSubtract - 1);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(lastWeekStart),
          endDate: formatDate(lastWeekEnd)
        }));
        break;
        
      case 'lastmonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(lastMonthStart),
          endDate: formatDate(lastMonthEnd)
        }));
        break;
        
      case 'lastquarter':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const lastQuarterStart = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
        const lastQuarterEnd = new Date(today.getFullYear(), currentQuarter * 3, 0);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(lastQuarterStart),
          endDate: formatDate(lastQuarterEnd)
        }));
        break;
        
      case 'lastyear':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(lastYearStart),
          endDate: formatDate(lastYearEnd)
        }));
        break;
        
      case 'last3months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(threeMonthsAgo),
          endDate: formatDate(today)
        }));
        break;
        
      case 'last6months':
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        setFilters(prev => ({
          ...prev,
          startDate: formatDate(sixMonthsAgo),
          endDate: formatDate(today)
        }));
        break;
    }
  }, [filters.dateRange]);

  // Fetch report table data
  const fetchReportTableData = async (category: string) => {
    setTableLoading(true);
    try {
      // Check if dates are provided
      if (!filters.startDate && !filters.endDate) {
        console.log('No date filters provided, clearing data');
        setReportTableData(prev => ({
          ...prev,
          [category]: []
        }));
        setTableLoading(false);
        return;
      }

      let endpoint = '';
      switch (category) {
        case 'employers':
          endpoint = '/admin/reports/employers-data';
          break;
        case 'jobs':
          endpoint = '/admin/reports/jobs-data';
          break;
        case 'jobseekers':
          endpoint = '/admin/reports/jobseekers-data';
          break;
        case 'hiring':
          endpoint = '/admin/reports/hiring-analytics-data';
          break;
        default:
          return;
      }

      // Add date filters and status filter as query parameters
      const params = new URLSearchParams();
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        params.append('status', filters.statusFilter);
      }
      
      // Debug logging
      console.log('Date filters:', { startDate: filters.startDate, endDate: filters.endDate });
      console.log('API URL:', `${API_BASE_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`);

      const url = `${API_BASE_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      const adminToken = localStorage.getItem('adminToken') || 
                        (process.env.NODE_ENV === 'development' ? 'dev-admin-token' : null);
      
      if (!adminToken) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${category} data`);
      }

      const data = await response.json();
      console.log(`${category} data received:`, data.data?.length || 0, 'records');
      
      setReportTableData(prev => ({
        ...prev,
        [category]: data.data || []
      }));
    } catch (error) {
      console.error(`Error fetching ${category} data:`, error);
      setNotification({type: 'error', message: `Failed to load ${category} data`});
    } finally {
      setTableLoading(false);
    }
  };

  // Load data when category changes or date filters change
  useEffect(() => {
    if (selectedCategory) {
      fetchReportTableData(selectedCategory);
    }
  }, [selectedCategory, filters.startDate, filters.endDate, filters.statusFilter]);

  // Load initial data
  useEffect(() => {
    fetchReportTableData('employers');
  }, []);

  const handleGenerateCategoryReports = async (categoryId: string) => {
    const categoryReports = getCategoryReports(categoryId);
    if (categoryReports.length === 0) {
      setNotification({type: 'error', message: 'No reports available in this category'});
      return;
    }

    if (!filters.startDate || !filters.endDate) {
      setNotification({type: 'error', message: 'Please select date range first'});
      return;
    }

    setLoading(true);
    const reportIds = categoryReports.map(r => r.id);
    
    try {
      if (reportIds.length === 1) {
        // Single report generation
        const reportType = reportIds[0];
        const selectedReport = reportTypes.find(r => r.id === reportType);
        const fileName = `${selectedReport?.name || 'Report'}_${filters.startDate}_to_${filters.endDate}.${filters.format}`;
        
        if (filters.format === 'pdf' || filters.format === 'xlsx') {
          // For PDF/XLSX, make a direct request to get the binary data
          const response = await fetch(`${API_BASE_URL}/admin/reports/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
              reportType: reportType,
              startDate: filters.startDate,
              endDate: filters.endDate,
              format: filters.format,
              includeDetails: filters.includeDetails,
              status: filters.statusFilter && filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
              sortConfig: sortConfig
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to generate ${filters.format.toUpperCase()} report`);
          }

          // Check if response is binary or JSON (fallback)
          const contentType = response.headers.get('Content-Type');
          
          if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))) {
            // Handle binary response (PDF/XLSX)
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            // Handle JSON fallback
            const data = await response.json();
            if (data.pdfError || data.xlsxError) {
              const textContent = formatReportForPDF(data.report, selectedReport?.name);
              const blob = new Blob([textContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName.replace(/\.(pdf|xlsx)$/, '.txt');
              a.click();
              URL.revokeObjectURL(url);
            }
          }
        }

        // Add to generated reports list
        const newReport = {
          id: Date.now().toString(),
          name: selectedReport?.name || 'Report',
          type: reportType,
          dateRange: `${filters.startDate} to ${filters.endDate}`,
          format: filters.format,
          generatedAt: new Date().toISOString(),
          size: '2.3 MB'
        };
        
        setGeneratedReports(prev => [newReport, ...prev]);
        setNotification({type: 'success', message: `${selectedReport?.name} generated successfully!`});
      } else {
        // Multiple reports generation for category
        const fileName = `${categories.find(c => c.id === categoryId)?.name || 'Category'}_Reports_${filters.startDate}_to_${filters.endDate}.${filters.format}`;
        
        if (filters.format === 'pdf' || filters.format === 'xlsx') {
          const response = await fetch(`${API_BASE_URL}/admin/reports/generate-selected`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
              reportTypes: reportIds,
              startDate: filters.startDate,
              endDate: filters.endDate,
              format: filters.format,
              includeDetails: filters.includeDetails
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to generate category ${filters.format.toUpperCase()} reports`);
          }

          const contentType = response.headers.get('Content-Type');
          
          if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            const data = await response.json();
            if (data.pdfError || data.xlsxError) {
              let textContent = `${categories.find(c => c.id === categoryId)?.name.toUpperCase()} REPORTS\n${'='.repeat(50)}\n\n`;
              textContent += `Generated: ${new Date().toLocaleString()}\n`;
              textContent += `Category Reports: ${reportIds.length}\n\n`;
              
              const blob = new Blob([textContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName.replace(/\.(pdf|xlsx)$/, '.txt');
              a.click();
              URL.revokeObjectURL(url);
            }
          }
        }

        const categoryName = categories.find(c => c.id === categoryId)?.name || 'Category';
        setNotification({type: 'success', message: `${categoryName} reports generated successfully!`});
      }
      
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({type: 'error', message: `Failed to generate report: ${error.message}`});
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (filters.reportTypes.length === 0) {
      setNotification({type: 'error', message: 'Please select at least one report type'});
      return;
    }

    setLoading(true);
    try {
      if (filters.reportTypes.length === 1) {
        // Single report generation
        const reportType = filters.reportTypes[0];
        const selectedReport = reportTypes.find(r => r.id === reportType);
        const fileName = `${selectedReport?.name || 'Report'}_${filters.startDate}_to_${filters.endDate}.${filters.format}`;
        
        if (filters.format === 'pdf' || filters.format === 'xlsx') {
          // For PDF/XLSX, make a direct request to get the binary data
          const response = await fetch(`${API_BASE_URL}/admin/reports/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
              reportType: reportType,
              startDate: filters.startDate,
              endDate: filters.endDate,
              format: filters.format,
              includeDetails: filters.includeDetails,
              status: filters.statusFilter && filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
              sortConfig: sortConfig
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to generate ${filters.format.toUpperCase()} report`);
          }

          // Check if response is binary or JSON (fallback)
          const contentType = response.headers.get('Content-Type');
          
          if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))) {
            // Handle binary response (PDF/XLSX)
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            // Handle JSON fallback
            const data = await response.json();
            if (data.pdfError || data.xlsxError) {
              const textContent = formatReportForPDF(data.report, selectedReport?.name);
              const blob = new Blob([textContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName.replace(/\.(pdf|xlsx)$/, '.txt');
              a.click();
              URL.revokeObjectURL(url);
            }
          }
        }

        // Add to generated reports list
        const newReport = {
          id: Date.now().toString(),
          name: selectedReport?.name || 'Report',
          type: reportType,
          dateRange: `${filters.startDate} to ${filters.endDate}`,
          format: filters.format,
          generatedAt: new Date().toISOString(),
          size: '2.3 MB'
        };
        
        setGeneratedReports(prev => [newReport, ...prev]);
        setNotification({type: 'success', message: `${selectedReport?.name} generated successfully!`});
      } else {
        // Multiple reports generation - use bulk generation
        await handleGenerateSelectedReports();
        return;
      }
      
      // Auto-hide notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({type: 'error', message: `Failed to generate report: ${error.message}`});
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSelectedReports = async () => {
    setBulkGenerating(true);
    setBulkProgress({current: 0, total: filters.reportTypes.length, currentReport: 'Initializing...'});
    
    try {
      setNotification({type: 'info', message: `Starting generation of ${filters.reportTypes.length} selected reports...`});
      
      // Generate reports for selected types only
      const fileName = `Selected_Reports_${filters.startDate}_to_${filters.endDate}.${filters.format}`;
      
      if (filters.format === 'pdf' || filters.format === 'xlsx') {
        // For PDF/XLSX, make a direct request to get the binary data
        const response = await fetch('https://skillsync-backend-gwwo.onrender.com/api/admin/reports/generate-selected', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            reportTypes: filters.reportTypes,
            startDate: filters.startDate,
            endDate: filters.endDate,
            format: filters.format,
            includeDetails: filters.includeDetails
          })
        });

        setBulkProgress({current: filters.reportTypes.length, total: filters.reportTypes.length, currentReport: 'Completing...'});

        if (!response.ok) {
          throw new Error(`Failed to generate selected ${filters.format.toUpperCase()} reports`);
        }

        // Check if response is binary or JSON (fallback)
        const contentType = response.headers.get('Content-Type');
        
        if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))) {
          // Handle binary response (PDF/XLSX)
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Handle JSON fallback
          const data = await response.json();
          if (data.pdfError || data.xlsxError) {
            let textContent = `SELECTED REPORTS SUMMARY\n${'='.repeat(50)}\n\n`;
            textContent += `Generated: ${new Date().toLocaleString()}\n`;
            textContent += `Selected Reports: ${filters.reportTypes.length}\n\n`;
            
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.replace(/\.(pdf|xlsx)$/, '.txt');
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }

      setNotification({type: 'success', message: `${filters.reportTypes.length} selected reports generated successfully! 🎉`});
      setTimeout(() => setNotification(null), 5000);

    } catch (error) {
      setNotification({type: 'error', message: `Selected reports generation failed: ${error.message}`});
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setBulkGenerating(false);
      setBulkProgress({current: 0, total: 0, currentReport: ''});
    }
  };

  const getCategoryReports = (category: string) => {
    return reportTypes.filter(report => report.category === category);
  };

  const categories = [
    { id: 'employers', name: 'Employer Reports', icon: FiBriefcase },
    { id: 'jobs', name: 'Job Reports', icon: FiFile },
    { id: 'jobseekers', name: 'Jobseeker Reports', icon: FiUsers },
    { id: 'hiring', name: 'Hiring Analytics Report', icon: FiTrendingUp }
  ];

  const handlePreviewReport = async () => {
    if (filters.reportTypes.length === 0) {
      setNotification({type: 'error', message: 'Please select at least one report type first'});
      return;
    }

    setLoading(true);
    try {
      if (filters.reportTypes.length === 1) {
        // Single report preview
        const reportType = filters.reportTypes[0];
        const previewFilters = {
          reportType: reportType,
          startDate: filters.startDate,
          endDate: filters.endDate,
          format: 'json' as 'json', // Always use JSON format for preview to ensure parseable response
          includeDetails: false, // Preview without detailed data
          status: filters.statusFilter && filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
          sortConfig: sortConfig
        };
        
        const reportData = await adminService.generateReport(previewFilters);
        setPreviewData(reportData.report);
        setShowPreview(true);
        
        const selectedReport = reportTypes.find(r => r.id === reportType);
        setNotification({type: 'info', message: `Preview generated for "${selectedReport?.name}"`});
      } else {
        // Multiple reports preview - generate all and combine
        const previewPromises = filters.reportTypes.map(async (reportType) => {
          const previewFilters = {
            reportType: reportType,
            startDate: filters.startDate,
            endDate: filters.endDate,
            format: 'json' as 'json',
            includeDetails: false,
            status: filters.statusFilter && filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
            sortConfig: sortConfig
          };
          
          try {
            const reportData = await adminService.generateReport(previewFilters);
            const reportInfo = reportTypes.find(r => r.id === reportType);
            return {
              reportType: reportType,
              reportName: reportInfo?.name || reportType,
              data: reportData.report
            };
          } catch (error) {
            return {
              reportType: reportType,
              reportName: reportTypes.find(r => r.id === reportType)?.name || reportType,
              error: error.message
            };
          }
        });

        const allReports = await Promise.all(previewPromises);
        
        // Create combined preview data
        const combinedPreview = {
          reportMetadata: {
            reportType: `Multiple Reports (${filters.reportTypes.length})`,
            startDate: filters.startDate,
            endDate: filters.endDate,
            generatedAt: new Date().toISOString(),
            selectedReports: filters.reportTypes.length
          },
          data: {
            summary: {
              totalReportsSelected: filters.reportTypes.length,
              successfulPreviews: allReports.filter(r => !r.error).length,
              failedPreviews: allReports.filter(r => r.error).length
            }
          },
          multipleReports: allReports
        };

        setPreviewData(combinedPreview);
        setShowPreview(true);
        
        const successCount = allReports.filter(r => !r.error).length;
        const message = `Preview generated for ${successCount} of ${filters.reportTypes.length} selected reports`;
        setNotification({type: 'info', message});
      }
      
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({type: 'error', message: `Failed to generate preview: ${error.message}`});
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return filters.reportTypes.length > 0 && filters.startDate && filters.endDate;
  };

  const handleSelectAll = () => {
    setFilters(prev => ({ ...prev, reportTypes: reportTypes.map(r => r.id) }));
  };

  const handleClearAll = () => {
    setFilters(prev => ({ ...prev, reportTypes: [] }));
  };

  const handleToggleReport = (reportId: string) => {
    setFilters(prev => ({
      ...prev,
      reportTypes: prev.reportTypes.includes(reportId)
        ? prev.reportTypes.filter(id => id !== reportId)
        : [...prev.reportTypes, reportId]
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGenerateAllReports = async () => {
    if (!filters.startDate || !filters.endDate) {
      setNotification({type: 'error', message: 'Please set date range first'});
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({current: 0, total: reportTypes.length, currentReport: 'Initializing...'});
    
    try {
      setNotification({type: 'info', message: `Starting bulk generation of ${reportTypes.length} reports...`});
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setBulkProgress(prev => {
          if (prev.current < prev.total - 1) {
            const nextIndex = prev.current + 1;
            return {
              ...prev,
              current: nextIndex,
              currentReport: reportTypes[nextIndex]?.name || 'Processing...'
            };
          }
          return prev;
        });
      }, 800);

      const fileName = `All_Reports_${filters.startDate}_to_${filters.endDate}.${filters.format}`;
      
      if (filters.format === 'pdf' || filters.format === 'xlsx') {
        // For PDF/XLSX, make a direct request to get the binary data
        const response = await fetch(`${API_BASE_URL}/admin/reports/generate-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            startDate: filters.startDate,
            endDate: filters.endDate,
            format: filters.format,
            includeDetails: filters.includeDetails,
            status: filters.statusFilter && filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
            sortConfig: sortConfig
          })
        });

        clearInterval(progressInterval);
        setBulkProgress({current: reportTypes.length, total: reportTypes.length, currentReport: 'Completing...'});

        if (!response.ok) {
          throw new Error(`Failed to generate bulk ${filters.format.toUpperCase()} reports`);
        }

        // Check if response is binary or JSON (fallback)
        const contentType = response.headers.get('Content-Type');
        
        if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))) {
          // Handle binary response (PDF/XLSX)
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Handle JSON fallback
          const data = await response.json();
          if (data.pdfError || data.xlsxError) {
            let textContent = `ALL REPORTS SUMMARY\n${'='.repeat(50)}\n\n`;
            textContent += `Generated: ${new Date(data.data.metadata.generatedAt).toLocaleString()}\n`;
            textContent += `Date Range: ${data.data.metadata.dateRange}\n`;
            textContent += `Total Reports: ${data.data.metadata.totalReports}\n\n`;
            
            data.data.reports.forEach((report: any) => {
              textContent += `\n${report.reportType.toUpperCase()}\n${'-'.repeat(30)}\n`;
              if (report.data.summary) {
                Object.entries(report.data.summary).forEach(([key, value]) => {
                  textContent += `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}\n`;
                });
              }
              textContent += '\n';
            });
            
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.replace('.pdf', '.txt');
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }

      // Add success message
      let successMessage = 'All reports generated successfully! 🎉';
      
      setNotification({type: 'success', message: successMessage});
      setTimeout(() => setNotification(null), 5000);

    } catch (error) {
      setNotification({type: 'error', message: `Bulk generation failed: ${error.message}`});
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setBulkGenerating(false);
      setBulkProgress({current: 0, total: 0, currentReport: ''});
    }
  };

  return (
    <>
      {/* Notification System */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span>{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Bulk Generation Progress */}
      {bulkGenerating && (
        <div className="bulk-progress">
          <h3>Generating Reports...</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            ></div>
          </div>
          <p className="current-report">
            {bulkProgress.currentReport && `Currently generating: ${bulkProgress.currentReport}`}
          </p>
        </div>
      )}

      {/* Reports Management Container */}
      <div className="reports-management-container">

        {/* Category Filter Tabs */}
        <div className="category-filter-tabs">
          {categories.map(category => {
            const CategoryIcon = category.icon;
            const isActive = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`category-tab ${isActive ? 'active' : ''}`}
              >
                <CategoryIcon className="tab-icon" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Category Report Table */}
        <div className="selected-category-section">
          {selectedCategory && (() => {
            const category = categories.find(c => c.id === selectedCategory);
            const CategoryIcon = category?.icon || FiFile;
            const categoryData = reportTableData[selectedCategory as keyof ReportTableData] || [];
            
            return (
              <div className="category-reports-section">
                {/* Category Header */}
                <div className="category-header">
                  <div className="category-title-row">
                    <h3 className="category-title">{category?.name}</h3>
                    
                    <div className="category-actions">
                      <button 
                        onClick={() => fetchReportTableData(selectedCategory)}
                        disabled={tableLoading}
                        className="control-btn control-btn-outline compact refresh-btn"
                        title="Refresh Data"
                      >
                        {tableLoading ? <FiClock className="spinning" /> : ''}
                        Refresh
                      </button>
                      
                      <button 
                        onClick={() => handleGenerateCategoryReports(selectedCategory)}
                        disabled={loading}
                        className="control-btn control-btn-primary compact category-generate-btn"
                        title={`Generate ${category?.name}`}
                      >
                        {loading ? <FiClock className="spinning" /> : <FiDownload />}
                        Generate Report
                      </button>
                    </div>
                  </div>
                  
                  {/* Date Filter Controls */}
                  <div className="date-filter-controls">
                    <div className="date-filter-group">
                      <label className="date-filter-label">From:</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className="date-filter-input"
                        title="Start Date"
                      />
                    </div>
                    
                    <div className="date-filter-group">
                      <label className="date-filter-label">To:</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="date-filter-input"
                        title="End Date"
                      />
                    </div>
                    
                    <div className="status-filter-group">
                      <label className="date-filter-label">Status:</label>
                      <select
                        value={filters.statusFilter}
                        onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                        className="status-filter-select"
                        title="Filter by Status"
                      >
                        {getStatusOptions(selectedCategory).map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      onClick={() => {
                        const today = new Date();
                        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        setFilters(prev => ({
                          ...prev,
                          startDate: thirtyDaysAgo.toISOString().split('T')[0],
                          endDate: today.toISOString().split('T')[0]
                        }));
                      }}
                      className="date-preset-btn"
                      title="Last 30 Days"
                    >
                      Last 30 Days
                    </button>
                    
                    <button 
                      onClick={() => {
                        setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
                      }}
                      className="date-clear-btn"
                      title="Clear Date Filter"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                
                {/* Category Data Table */}
                <div className="category-table-container">
                  {tableLoading ? (
                    <div className="table-loading">
                      <FiClock className="spinning" />
                      <p>Loading {category?.name.toLowerCase()} data...</p>
                    </div>
                  ) : (
                    <div className="category-table-wrapper">
                      {selectedCategory === 'employers' && (
                        <table className="category-data-table">
                          <thead>
                            <tr>
                              <SortableHeader column="companyName">Company Name</SortableHeader>
                              <SortableHeader column="industry">Industry</SortableHeader>
                              <SortableHeader column="email">Email</SortableHeader>
                              <SortableHeader column="status">Status</SortableHeader>
                              <SortableHeader column="jobPostingsCount" isSortable={true}>Job Postings</SortableHeader>
                              <SortableHeader column="applicationCount" isSortable={true}>Total Applications</SortableHeader>
                              <SortableHeader column="dateRegistered" isSortable={true}>Date Registered</SortableHeader>
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedData(categoryData as EmployerReportRow[]).map((employer) => (
                              <tr key={employer.id}>
                                <td className="company-name-cell">{employer.companyName}</td>
                                <td className="industry-cell">{employer.industry}</td>
                                <td className="email-cell">{employer.email}</td>
                                <td className="status-cell">
                                  <span className={`status-badge status-${employer.status.toLowerCase()}`}>
                                    {employer.status}
                                  </span>
                                </td>
                                <td className="count-cell">
                                  <span className="count-badge">{employer.jobPostingsCount || 0}</span>
                                </td>
                                <td className="count-cell">
                                  <span className="count-badge">{employer.applicationCount}</span>
                                </td>
                                <td className="date-cell">{new Date(employer.dateRegistered).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      
                      {selectedCategory === 'jobs' && (
                        <table className="category-data-table">
                          <thead>
                            <tr>
                              <SortableHeader column="jobTitle">Job Title</SortableHeader>
                              <SortableHeader column="companyName">Company Name</SortableHeader>
                              <SortableHeader column="department">Department</SortableHeader>
                              <SortableHeader column="status">Status</SortableHeader>
                              <SortableHeader column="applicationCount" isSortable={true}>Total Applications</SortableHeader>
                              <SortableHeader column="postedDate" isSortable={true}>Posted Date</SortableHeader>
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedData(categoryData as JobReportRow[]).map((job) => (
                              <tr key={job.id}>
                                <td className="job-title-cell">{job.jobTitle}</td>
                                <td className="company-name-cell">{job.companyName}</td>
                                <td className="department-cell">{job.department}</td>
                                <td className="status-cell">
                                  <span className={`status-badge status-${job.status.toLowerCase()}`}>
                                    {job.status}
                                  </span>
                                </td>
                                <td className="count-cell">
                                  <span className="count-badge">{job.applicationCount}</span>
                                </td>
                                <td className="date-cell">{new Date(job.postedDate).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      
                      {selectedCategory === 'jobseekers' && (
                        <table className="category-data-table">
                          <thead>
                            <tr>
                              <SortableHeader column="firstName">First Name</SortableHeader>
                              <SortableHeader column="lastName">Last Name</SortableHeader>
                              <SortableHeader column="email">Email</SortableHeader>
                              <SortableHeader column="status">Status</SortableHeader>
                              <SortableHeader column="registrationDate" isSortable={true}>Registration Date</SortableHeader>
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedData(categoryData as JobseekerReportRow[]).map((jobseeker) => (
                              <tr key={jobseeker.id}>
                                <td className="name-cell">{jobseeker.firstName}</td>
                                <td className="name-cell">{jobseeker.lastName}</td>
                                <td className="email-cell">{jobseeker.email}</td>
                                <td className="status-cell">
                                  <span className={`status-badge status-${jobseeker.status.toLowerCase()}`}>
                                    {jobseeker.status}
                                  </span>
                                </td>
                                <td className="date-cell">{new Date(jobseeker.registrationDate).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      
                      {selectedCategory === 'hiring' && (
                        <table className="category-data-table">
                          <thead>
                            <tr>
                              <SortableHeader column="companyName">Company Name</SortableHeader>
                              <SortableHeader column="hiredCount" isSortable={true}>Total Hired</SortableHeader>
                              <SortableHeader column="latestHireDate" isSortable={true}>Latest Hire Date</SortableHeader>
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedData(categoryData as HiringReportRow[]).map((hiring) => (
                              <tr key={hiring.id}>
                                <td className="company-name-cell">{hiring.companyName}</td>
                                <td className="hired-count-cell">
                                  <span className="count-badge">{hiring.hiredCount}</span>
                                </td>
                                <td className="date-cell">{new Date(hiring.latestHireDate).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      
                      {categoryData.length === 0 && !tableLoading && (
                        <div className="no-data">
                          {!filters.startDate && !filters.endDate ? (
                            <p>Please select a date range to view {category?.name.toLowerCase()} data</p>
                          ) : (
                            <p>No {category?.name.toLowerCase()} found for the selected date range</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Report Preview Modal */}
      {showPreview && previewData && (
        <div className="preview-modal">
          <div className="preview-content">
            <div className="preview-header">
              <h3>Report Preview</h3>
              <button 
                className="close-preview"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>
            <div className="preview-body">
              <div className="preview-metadata">
                <h4>Report Information</h4>
                <p><strong>Type:</strong> {previewData.reportMetadata?.reportType}</p>
                <p><strong>Date Range:</strong> {previewData.reportMetadata?.startDate} to {previewData.reportMetadata?.endDate}</p>
                <p><strong>Generated:</strong> {new Date(previewData.reportMetadata?.generatedAt).toLocaleString()}</p>
                {previewData.reportMetadata?.selectedReports && (
                  <p><strong>Selected Reports:</strong> {previewData.reportMetadata.selectedReports}</p>
                )}
              </div>
              
              {previewData.data?.summary && (
                <div className="preview-summary">
                  <h4>Summary Data</h4>
                  <div className="summary-grid">
                    {Object.entries(previewData.data.summary).map(([key, value]) => (
                      <div key={key} className="summary-item">
                        <span className="summary-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                        <span className="summary-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multiple Reports Display */}
              {previewData.multipleReports && (
                <div className="multiple-reports-preview">
                  <h4>Individual Report Previews</h4>
                  <div className="reports-accordion">
                    {previewData.multipleReports.map((report: any, index: number) => (
                      <div key={report.reportType} className="report-accordion-item">
                        <div className="report-accordion-header">
                          <h5>
                            {index + 1}. {report.reportName}
                            {report.error && <span className="error-badge">Failed</span>}
                          </h5>
                        </div>
                        <div className="report-accordion-content">
                          {report.error ? (
                            <div className="error-message">
                              <p><strong>Error:</strong> {report.error}</p>
                            </div>
                          ) : (
                            report.data?.data?.summary && (
                              <div className="individual-summary">
                                <div className="summary-grid">
                                  {Object.entries(report.data.data.summary).map(([key, value]) => (
                                    <div key={key} className="summary-item">
                                      <span className="summary-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                                      <span className="summary-value">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="preview-actions">
                <button 
                  onClick={() => {
                    setShowPreview(false);
                    handleGenerateReport();
                  }}
                  className="generate-from-preview-btn"
                >
                  <FiDownload /> Generate Full Report{previewData.multipleReports ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Reports History */}
      {generatedReports.length > 0 && (
        <div className="generated-reports">
          <h3><FiCalendar /> Recent Reports ({generatedReports.length})</h3>
          <div className="reports-list">
            {generatedReports.map(report => (
              <div key={report.id} className="report-item">
                <div className="report-details">
                  <h4>{report.name}</h4>
                  <p>Generated: {new Date(report.generatedAt).toLocaleString()}</p>
                  <p>Date Range: {report.dateRange}</p>
                  <span className="report-format">{report.format.toUpperCase()}</span>
                </div>
                <div className="report-actions">
                  <button className="download-btn">
                    <FiDownload /> Re-download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportsTab;

