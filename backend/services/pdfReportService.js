let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (error) {
  console.error('PDFKit not found. Please install it with: npm install pdfkit');
  PDFDocument = null;
}

const fs = require('fs');
const path = require('path');

class PDFReportService {
  constructor() {
    this.logoPath = path.join(__dirname, '../assets/logo.png'); // Add your logo here
    this.colors = {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#059669',
      danger: '#dc2626',
      warning: '#d97706',
      text: '#374151',
      lightGray: '#f8fafc',
      darkGray: '#1f2937'
    };
  }

  async generateReportPDF(reportData, reportName = 'Report') {
    if (!PDFDocument) {
      throw new Error('PDFKit library not available. Please install it with: npm install pdfkit');
    }
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Add header
        this.addHeader(doc, reportName, reportData.reportMetadata);
        
        // Add content based on report type
        this.addReportContent(doc, reportData);
        
        // Add footer
        this.addFooter(doc, reportData.reportMetadata);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc, reportName, metadata) {
    // Simple header with title and basic info
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fill('#000000')
       .text(reportName, 50, 60);

    doc.fontSize(12)
       .font('Helvetica')
       .fill('#666666')
       .text('Public Employment Service Office (PESO)', 50, 90);

    // Simple report info
    doc.fontSize(10)
       .font('Helvetica')
       .fill('#333333')
       .text(`Generated: ${new Date(metadata.generatedAt).toLocaleDateString()}`, 50, 115)
       .text(`Period: ${metadata.startDate} to ${metadata.endDate}`, 50, 130);
    
    if (metadata.generatedBy) {
      doc.text(`By: ${metadata.generatedBy}`, 50, 145);
    }

    // Add a simple line separator
    doc.moveTo(50, 170)
       .lineTo(doc.page.width - 50, 170)
       .stroke('#cccccc');

    doc.y = 190;
  }

  addReportContent(doc, reportData) {
    const { data } = reportData;
    const reportType = reportData.reportMetadata.reportType;
    
    // Summary Section
    if (data.summary) {
      this.addSummarySection(doc, data.summary);
    }

    // Add report-specific sections
    switch (reportType) {
      case 'registered-jobseekers':
        this.addJobseekerSpecificSections(doc, data);
        break;
      case 'employers-companies':
        this.addEmployerSpecificSections(doc, data);
        break;
      case 'job-postings':
        this.addJobPostingSpecificSections(doc, data);
        break;
      case 'job-demand-analytics':
        this.addJobDemandSpecificSections(doc, data);
        break;
    }

    // Detailed Data Section
    if (data.details && data.details.length > 0) {
      this.addDetailsSection(doc, data.details);
    }
  }

  addSummarySection(doc, summary) {
    if (!summary) return;

    const startY = doc.y + 15;
    
    // Section title
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fill('#000000')
       .text('Summary', 50, startY);

    doc.y = startY + 25;

    // Simple list format
    const summaryItems = Object.entries(summary)
      .filter(([key, value]) => key !== 'memoryUsage' && typeof value !== 'object')
      .map(([key, value]) => ({
        label: this.formatLabel(key),
        value: typeof value === 'number' ? value.toLocaleString() : value
      }));

    summaryItems.forEach((item, index) => {
      doc.fontSize(10)
         .font('Helvetica')
         .fill('#000000')
         .text(`${item.label}: ${item.value}`, 50, doc.y);
      
      doc.y += 16;
    });

    doc.y += 15;
  }

  addTrendsSection(doc, trends, title) {
    const startY = doc.y + 20;
    
    // Section title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text(title, 50, startY);

    doc.y = startY + 40;

    // Simple text-based chart representation
    doc.fontSize(10)
       .font('Helvetica')
       .fill(this.colors.text);

    trends.slice(0, 10).forEach((trend, index) => {
      const date = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}-${String(trend._id.day).padStart(2, '0')}`;
      const role = trend._id.role || 'N/A';
      const count = trend.count;
      
      doc.text(`${date} | ${role.padEnd(12)} | ${'█'.repeat(Math.min(count, 20))} (${count})`, 50, doc.y + 5);
    });

    doc.y += 40;
  }

  addDetailsSection(doc, details) {
    if (!details || details.length === 0) return;
    
    const startY = doc.y + 20;
    
    // Simple section title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill('#000000')
       .text('Detailed Records', 50, startY);

    doc.y = startY + 25;

    // Define proper column headers based on data type
    const sampleItem = details[0];
    const headers = this.getProperHeaders(sampleItem);
    const pageWidth = doc.page.width - 100;
    
    // Calculate simple column widths for better readability
    const columnWidths = this.calculateSimpleColumnWidths(headers, details, pageWidth);
    
    // Table header with better formatting
    const headerY = doc.y;
    
    // Header background
    doc.rect(50, headerY, pageWidth, 25)
       .fill('#f5f5f5')
       .stroke('#cccccc')
       .lineWidth(1);
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill('#000000');

    let currentX = 50;
    headers.forEach((header, index) => {
      doc.text(header.label, currentX + 3, headerY + 8, {
        width: columnWidths[index] - 6,
        ellipsis: true,
        align: 'left'
      });
      
      // Add vertical separators
      if (index < headers.length - 1) {
        doc.moveTo(currentX + columnWidths[index], headerY)
           .lineTo(currentX + columnWidths[index], headerY + 25)
           .stroke('#cccccc')
           .lineWidth(1);
      }
      
      currentX += columnWidths[index];
    });

    doc.y = headerY + 30;

    // Simple data rows with better formatting
    const maxRows = 20;
    details.slice(0, maxRows).forEach((row, rowIndex) => {
      const rowY = doc.y;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fill('#000000');

      let currentX = 50;
      headers.forEach((header, index) => {
        const value = this.extractCellValue(row, header.key);
        
        // Add some padding and ensure proper alignment
        doc.text(value, currentX + 3, rowY, {
          width: columnWidths[index] - 6,
          ellipsis: true,
          align: 'left'
        });
        currentX += columnWidths[index];
      });

      doc.y = rowY + 20;
      
      // Add subtle row separator
      if (rowIndex < maxRows - 1) {
        doc.moveTo(50, doc.y - 2)
           .lineTo(doc.page.width - 50, doc.y - 2)
           .stroke('#eeeeee')
           .lineWidth(0.5);
      }

      // Page break if needed
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        doc.y = 50;
        
        // Re-add table header on new page
        const newHeaderY = doc.y;
        
        // Header background
        doc.rect(50, newHeaderY, pageWidth, 25)
           .fill('#f5f5f5')
           .stroke('#cccccc')
           .lineWidth(1);
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fill('#000000');

        let headerX = 50;
        headers.forEach((header, index) => {
          doc.text(header.label, headerX + 3, newHeaderY + 8, {
            width: columnWidths[index] - 6,
            ellipsis: true,
            align: 'left'
          });
          
          // Add vertical separators
          if (index < headers.length - 1) {
            doc.moveTo(headerX + columnWidths[index], newHeaderY)
               .lineTo(headerX + columnWidths[index], newHeaderY + 25)
               .stroke('#cccccc')
               .lineWidth(1);
          }
          
          headerX += columnWidths[index];
        });

        doc.y = newHeaderY + 30;
      }
    });

    if (details.length > maxRows) {
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .fill(this.colors.secondary)
         .text(`... and ${details.length - maxRows} more records (showing first ${maxRows})`, 50, doc.y + 10);
    }

    doc.y += 40;
  }

  getProperHeaders(sampleItem) {
    // Define proper headers based on the data structure - check job data first
    if (sampleItem.title && sampleItem.totalApplications !== undefined) {
      // Job demand analytics data - has title and totalApplications
      return [
        { key: 'companyName', label: 'Company Name' },
        { key: 'title', label: 'Job Title' },
        { key: 'totalApplications', label: 'Total Applications' }
      ];
    } else if (sampleItem.title && (sampleItem.department !== undefined || sampleItem.salary !== undefined || sampleItem.status !== undefined)) {
      // Job data - has title and job-specific fields
      return [
        { key: 'title', label: 'Job Title' },
        { key: 'companyName', label: 'Company' },
        { key: 'department', label: 'Department' },
        { key: 'status', label: 'Status' },
        { key: 'salary', label: 'Salary' },
        { key: 'createdAt', label: 'Posted Date' }
      ];
    } else if (sampleItem.firstName || sampleItem.lastName) {
      // JobSeeker data
      return [
        { key: 'email', label: 'Email' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'dateOfBirth', label: 'Birthday' },
        { key: 'age', label: 'Age' },
        { key: 'isActive', label: 'Active' },
        { key: 'createdAt', label: 'Registration Date' }
      ];
    } else if (sampleItem.companyName && (sampleItem.industry !== undefined || sampleItem.accountStatus !== undefined)) {
      // Employer data - has companyName and employer-specific fields
      return [
        { key: 'email', label: 'Email' },
        { key: 'companyName', label: 'Company Name' },
        { key: 'industry', label: 'Industry' },
        { key: 'accountStatus', label: 'Status' },
        { key: 'createdAt', label: 'Registration Date' }
      ];
    } else {
      // Generic fallback
      const keys = Object.keys(sampleItem).filter(key => 
        !key.startsWith('_') && 
        key !== '__v' && 
        typeof sampleItem[key] !== 'object'
      ).slice(0, 6);
      
      return keys.map(key => ({
        key: key,
        label: this.formatLabel(key)
      }));
    }
  }

  extractCellValue(row, key) {
    let value = row[key];
    
    // Handle nested objects
    if (key.includes('.')) {
      const keys = key.split('.');
      value = keys.reduce((obj, k) => obj?.[k], row);
    }
    
    // Handle userId population for employer data
    if (key === 'email' && row.userId) {
      value = row.userId.email;
    } else if (key === 'lastLoginAt' && row.userId) {
      value = row.userId.lastLoginAt;
    } else if (key === 'isActive' && row.userId) {
      value = row.userId.isActive;
    }
    
    // Handle jobseeker-specific fields
    if (key === 'phoneNumber' && row.phoneNumber) {
      value = row.phoneNumber;
    } else if (key === 'dateOfBirth' && row.dateOfBirth) {
      value = row.dateOfBirth;
    } else if (key === 'age' && row.dateOfBirth) {
      // Calculate age from dateOfBirth
      const today = new Date();
      const birthDate = new Date(row.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      value = age;
    }
    
    // Handle direct fields for both employer and job data
    if (key === 'companyName' && row.companyName) {
      value = row.companyName;
    } else if (key === 'industry' && row.industry) {
      value = row.industry;
    } else if (key === 'accountStatus' && row.accountStatus) {
      value = row.accountStatus;
    }
    
    // Handle job-specific fields
    if (key === 'title' && row.title) {
      value = row.title;
    } else if (key === 'department' && row.department) {
      value = row.department;
    } else if (key === 'salary' && row.salary) {
      value = row.salary;
    } else if (key === 'totalApplications' && row.totalApplications !== undefined) {
      value = row.totalApplications;
    }
    
    // If value is still undefined, try to get it directly from row
    if (value === undefined) {
      value = row[key];
    }
    
    // Format different data types with better readability
    if (value instanceof Date) {
      return value.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } else if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    } else if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      const items = value.map(item => 
        typeof item === 'object' ? (item.name || item.title || 'Item') : String(item)
      );
      const result = items.slice(0, 2).join(', ');
      return items.length > 2 ? result + `... (+${items.length - 2})` : result;
    } else if (typeof value === 'object' && value !== null) {
      // Handle specific object types
      if (value.name) return value.name;
      if (value.title) return value.title;
      return 'Object';
    } else if (value === null || value === undefined || value === '') {
      return 'N/A';
    } else if (typeof value === 'number') {
      // Format numbers nicely
      if (key === 'salary') {
        return `₱${value.toLocaleString()}`;
      }
      return value.toLocaleString();
    }
    
    // Truncate long strings appropriately
    const str = String(value);
    return str.length > 35 ? str.substring(0, 32) + '...' : str;
  }

  calculateSimpleColumnWidths(headers, details, totalWidth) {
    // Calculate widths based on content and importance
    const minWidth = 60;
    const maxWidth = 140;
    
    // Assign specific widths for better table layout
    const widthMap = {
      'email': 140,
      'firstName': 90,
      'lastName': 90,
      'phoneNumber': 110,
      'dateOfBirth': 95,
      'age': 55,
      'companyName': 110,
      'title': 100,
      'totalApplications': 90,
      'department': 85,
      'industry': 90,
      'salary': 100,
      'status': 70,
      'accountStatus': 70,
      'isActive': 60,
      'createdAt': 90
    };
    
    const calculatedWidths = headers.map(header => {
      return widthMap[header.key] || 80;
    });
    
    // Scale to fit page width if necessary
    const totalCalculated = calculatedWidths.reduce((sum, width) => sum + width, 0);
    if (totalCalculated > totalWidth) {
      const scale = totalWidth / totalCalculated;
      return calculatedWidths.map(width => Math.max(width * scale, minWidth));
    }
    
    return calculatedWidths;
  }

  addAdditionalSections(doc, data, reportType) {
    switch (reportType) {
      case 'system-health':
        if (data.summary && data.summary.memoryUsage) {
          this.addSystemHealthSection(doc, data.summary);
        }
        break;
      
      case 'verification-report':
        this.addVerificationMetrics(doc, data.summary);
        break;
      
      // Add more specific sections as needed
    }
  }

  addSystemHealthSection(doc, summary) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('System Health Metrics', 50, startY);

    doc.y = startY + 30;

    if (summary.memoryUsage) {
      const memory = summary.memoryUsage;
      doc.fontSize(12)
         .font('Helvetica')
         .fill(this.colors.text)
         .text(`Memory Usage:`, 50, doc.y)
         .text(`  RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB`, 70, doc.y + 15)
         .text(`  Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`, 70, doc.y + 30)
         .text(`  Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`, 70, doc.y + 45);
    }

    if (summary.systemUptime) {
      const uptime = Math.floor(summary.systemUptime / 3600);
      doc.text(`System Uptime: ${uptime} hours`, 50, doc.y + 70);
    }

    doc.y += 100;
  }

  addVerificationMetrics(doc, summary) {
    if (!summary) return;

    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Verification Metrics', 50, startY);

    doc.y = startY + 30;

    const total = (summary.pendingEmployers || 0) + (summary.verifiedEmployers || 0) + (summary.rejectedEmployers || 0);
    
    if (total > 0) {
      const pendingRate = ((summary.pendingEmployers || 0) / total * 100).toFixed(1);
      const approvalRate = ((summary.verifiedEmployers || 0) / total * 100).toFixed(1);
      const rejectionRate = ((summary.rejectedEmployers || 0) / total * 100).toFixed(1);

      doc.fontSize(12)
         .font('Helvetica')
         .fill(this.colors.text)
         .text(`Approval Rate: ${approvalRate}%`, 50, doc.y)
         .text(`Rejection Rate: ${rejectionRate}%`, 50, doc.y + 20)
         .text(`Pending Rate: ${pendingRate}%`, 50, doc.y + 40);
    }

    doc.y += 80;
  }

  addFooter(doc, metadata) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 60;

    // Simple footer line
    doc.moveTo(50, footerY)
       .lineTo(doc.page.width - 50, footerY)
       .stroke('#cccccc');

    // Simple footer text
    doc.fontSize(8)
       .font('Helvetica')
       .fill('#666666')
       .text('Public Employment Service Office (PESO)', 50, footerY + 10)
       .text(`Generated: ${new Date(metadata.generatedAt).toLocaleDateString()}`, 50, footerY + 22);
  }

  formatLabel(key) {
    // Convert camelCase to Title Case with proper spacing
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
  }

  formatValue(value) {
    if (typeof value === 'number') {
      // Format numbers with commas and handle decimals
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      }
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return `${value.length} items`;
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  formatCellValue(value) {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      }
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      if (Array.isArray(value)) {
        return `${value.length} items`;
      }
      return JSON.stringify(value).substring(0, 40) + '...';
    }
    const str = String(value);
    return str.length > 50 ? str.substring(0, 47) + '...' : str;
  }

  // Generate multiple reports as a single PDF
  async generateBulkReportsPDF(allReportsData) {
    if (!PDFDocument) {
      throw new Error('PDFKit library not available. Please install it with: npm install pdfkit');
    }
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Cover page
        this.addCoverPage(doc, allReportsData.metadata);

        // Table of contents
        this.addTableOfContents(doc, allReportsData.reports);

        // Individual reports
        allReportsData.reports.forEach((report, index) => {
          if (index > 0) doc.addPage();
          
          const reportName = this.getReportDisplayName(report.reportType);
          this.addHeader(doc, reportName, report.reportMetadata || allReportsData.metadata);
          this.addReportContent(doc, report);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addCoverPage(doc, metadata) {
    const pageWidth = doc.page.width - 100;
    const pageHeight = doc.page.height - 100;

    // Title
    doc.fontSize(32)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('PESO Reports', 50, 150, { align: 'center', width: pageWidth });

    // Subtitle
    doc.fontSize(18)
       .font('Helvetica')
       .fill(this.colors.text)
       .text('Comprehensive Analytics Report', 50, 200, { align: 'center', width: pageWidth });

    // Date range - Dynamic
    doc.fontSize(14)
       .text(`${metadata.dateRange}`, 50, 250, { align: 'center', width: pageWidth });

    // Generated info - Dynamic
    doc.fontSize(12)
       .fill(this.colors.secondary)
       .text(`Generated: ${new Date(metadata.generatedAt).toLocaleString()}`, 50, 300, { align: 'center', width: pageWidth })
       .text(`Total Reports: ${metadata.totalReports}`, 50, 320, { align: 'center', width: pageWidth });
    
    // Add generated by if available
    if (metadata.generatedBy) {
      doc.text(`Generated By: ${metadata.generatedBy}`, 50, 340, { align: 'center', width: pageWidth });
    }
    
    // Add format info
    if (metadata.format) {
      doc.text(`Format: ${metadata.format.toUpperCase()}`, 50, 360, { align: 'center', width: pageWidth });
    }

    doc.addPage();
  }

  addTableOfContents(doc, reports) {
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Table of Contents', 50, 100);

    doc.y = 140;

    reports.forEach((report, index) => {
      const reportName = this.getReportDisplayName(report.reportType);
      const pageNum = index + 3; // Account for cover and TOC pages
      
      doc.fontSize(12)
         .font('Helvetica')
         .fill(this.colors.text)
         .text(`${index + 1}. ${reportName}`, 70, doc.y + 5)
         .text(`${pageNum}`, 500, doc.y + 5);
      
      doc.y += 25;
    });

    doc.addPage();
  }

  addJobseekerSpecificSections(doc, data) {
    // Skip demographics and registration trends as requested
    // Only include summary data which is already handled in addSummarySection
  }

  addEmployerSpecificSections(doc, data) {
    // Only include industry distribution, skip registration trends
    if (data.industryDistribution) {
      this.addIndustryDistributionSection(doc, data.industryDistribution);
    }
  }

  addJobPostingSpecificSections(doc, data) {
    // Status and department distribution
    if (data.statusDistribution) {
      this.addDistributionSection(doc, data.statusDistribution, 'Job Status Distribution');
    }
    
    if (data.departmentDistribution) {
      this.addDistributionSection(doc, data.departmentDistribution, 'Department Distribution');
    }
    
    // Salary analytics
    if (data.salaryAnalytics) {
      this.addSalaryAnalyticsSection(doc, data.salaryAnalytics);
    }
    
    // Success rates
    if (data.successRates) {
      this.addSuccessRatesSection(doc, data.successRates);
    }
  }

  addJobDemandSpecificSections(doc, data) {
    // Skills trends
    if (data.skillsTrends) {
      this.addSkillsTrendsSection(doc, data.skillsTrends);
    }
    
    // Job demand trends
    if (data.jobDemandTrends) {
      this.addJobDemandTrendsSection(doc, data.jobDemandTrends);
    }
    
    // Salary analytics
    if (data.salaryAnalytics) {
      this.addSalaryAnalyticsSection(doc, data.salaryAnalytics);
    }
    
    // Industry trends
    if (data.industryTrends) {
      this.addDistributionSection(doc, data.industryTrends, 'Industry Trends');
    }
  }

  addDemographicsSection(doc, demographics) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Demographics Analysis', 50, startY);

    doc.y = startY + 40;

    // Gender distribution
    if (demographics.byGender && demographics.byGender.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fill(this.colors.text)
         .text('Gender Distribution:', 50, doc.y);

      doc.y += 20;
      doc.fontSize(10).font('Helvetica');

      const totalGender = demographics.byGender.reduce((sum, item) => sum + item.count, 0);
      demographics.byGender.forEach(item => {
        const percentage = totalGender > 0 ? ((item.count / totalGender) * 100).toFixed(1) : 0;
        doc.text(`${item._id || 'Not Specified'}: ${item.count} (${percentage}%)`, 70, doc.y + 5);
      });

      doc.y += 30;
    }

    // Age distribution
    if (demographics.byAge && demographics.byAge.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fill(this.colors.text)
         .text('Age Distribution:', 50, doc.y);

      doc.y += 20;
      doc.fontSize(10).font('Helvetica');

      const totalAge = demographics.byAge.reduce((sum, item) => sum + item.count, 0);
      demographics.byAge.forEach(item => {
        const percentage = totalAge > 0 ? ((item.count / totalAge) * 100).toFixed(1) : 0;
        doc.text(`${item._id}: ${item.count} (${percentage}%)`, 70, doc.y + 5);
      });
    }

    doc.y += 40;
  }

  addIndustryDistributionSection(doc, industryData) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Industry Distribution', 50, startY);

    doc.y = startY + 40;

    const total = industryData.reduce((sum, item) => sum + item.count, 0);
    
    doc.fontSize(10).font('Helvetica').fill(this.colors.text);
    
    industryData.slice(0, 10).forEach(item => {
      const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
      const barLength = Math.min((item.count / Math.max(...industryData.map(i => i.count))) * 200, 200);
      
      // Industry name
      doc.text(`${item._id || 'Not Specified'}`, 50, doc.y + 5);
      
      // Bar representation
      doc.rect(250, doc.y + 2, barLength, 12)
         .fill(this.colors.primary);
      
      // Count and percentage
      doc.fill(this.colors.text)
         .text(`${item.count} (${percentage}%)`, 460, doc.y + 5);
      
      doc.y += 20;
    });

    doc.y += 20;
  }

  addDistributionSection(doc, distributionData, title) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text(title, 50, startY);

    doc.y = startY + 40;

    const total = distributionData.reduce((sum, item) => sum + item.count, 0);
    
    doc.fontSize(10).font('Helvetica').fill(this.colors.text);
    
    distributionData.forEach(item => {
      const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
      doc.text(`${item._id || 'Not Specified'}: ${item.count} (${percentage}%)`, 70, doc.y + 5);
    });

    doc.y += 40;
  }

  addSalaryAnalyticsSection(doc, salaryData) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Salary Analytics', 50, startY);

    doc.y = startY + 40;

    doc.fontSize(10).font('Helvetica').fill(this.colors.text);
    
    salaryData.slice(0, 8).forEach(item => {
      const avgSalary = item.avgSalary ? `₱${item.avgSalary.toLocaleString()}` : 'N/A';
      doc.text(`${item._id || 'Not Specified'}: ${avgSalary} avg (${item.jobCount || 0} jobs)`, 70, doc.y + 5);
    });

    doc.y += 40;
  }

  addSuccessRatesSection(doc, successData) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Job Success Rates by Department', 50, startY);

    doc.y = startY + 40;

    doc.fontSize(10).font('Helvetica').fill(this.colors.text);
    
    successData.forEach(item => {
      const successRate = item.successRate ? `${item.successRate.toFixed(1)}%` : '0%';
      doc.text(`${item._id || 'Not Specified'}: ${successRate} success rate (${item.totalJobs || 0} jobs, ${item.totalApplications || 0} applications)`, 70, doc.y + 5);
    });

    doc.y += 40;
  }

  addSkillsTrendsSection(doc, skillsData) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Top Skills in Demand', 50, startY);

    doc.y = startY + 40;

    doc.fontSize(10).font('Helvetica').fill(this.colors.text);
    
    skillsData.slice(0, 10).forEach((item, index) => {
      const barLength = Math.min((item.count / Math.max(...skillsData.map(s => s.count))) * 150, 150);
      
      // Rank and skill name
      doc.text(`${index + 1}. ${item._id}`, 50, doc.y + 5);
      
      // Bar representation
      doc.rect(200, doc.y + 2, barLength, 12)
         .fill(this.colors.accent);
      
      // Count
      doc.fill(this.colors.text)
         .text(`${item.count}`, 360, doc.y + 5);
      
      doc.y += 20;
    });

    doc.y += 20;
  }

  addJobDemandTrendsSection(doc, demandData) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Job Demand Trends', 50, startY);

    doc.y = startY + 40;

    doc.fontSize(10).font('Helvetica').fill(this.colors.text);
    
    demandData.slice(0, 8).forEach(item => {
      const avgApps = item.avgApplicationsPerJob ? item.avgApplicationsPerJob.toFixed(1) : '0';
      doc.text(`${item._id?.title || 'Not Specified'} (${item._id?.department || 'N/A'}): ${item.totalPostings || 0} postings, ${avgApps} avg applications`, 70, doc.y + 5);
    });

    doc.y += 40;
  }

  getReportDisplayName(reportType) {
    const displayNames = {
      'registered-jobseekers': 'Registered Jobseekers Report',
      'employers-companies': 'Employers/Companies Report',
      'job-postings': 'Job Postings Report',
      'job-demand-analytics': 'Job Demand Analytics Report'
    };
    
    return displayNames[reportType] || reportType;
  }
}

module.exports = new PDFReportService();
