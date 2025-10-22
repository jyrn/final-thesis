let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (error) {  PDFDocument = null;
}

const fs = require('fs');
const path = require('path');

class PDFReportService {
  constructor() {
    this.logoPath = path.join(__dirname, '../../frontend/public/peso-logo.png');
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

  async generateReportPDF(reportData, reportName = 'Report', sortConfig = null) {
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
        this.addReportContent(doc, reportData, sortConfig);
        
        // Add footer
        this.addFooter(doc, reportData.reportMetadata);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc, reportName, metadata) {
    const pageWidth = doc.page.width;
    const logoSize = 80;
    const logoX = pageWidth - logoSize - 50;
    const logoY = 30;
    
    // Add PESO logo
    try {
      if (fs.existsSync(this.logoPath)) {
        doc.image(this.logoPath, logoX, logoY, { width: logoSize, height: logoSize });
      } else {
        // Fallback placeholder if logo not found
        doc.rect(logoX, logoY, logoSize, logoSize)
           .stroke('#cccccc')
           .lineWidth(1);
        
        doc.fontSize(8)
           .font('Helvetica')
           .fill('#666666')
           .text('PESO\nLOGO', logoX + 15, logoY + 25);
      }
    } catch (error) {
      // Logo loading failed, show placeholder
      doc.rect(logoX, logoY, logoSize, logoSize)
         .stroke('#cccccc')
         .lineWidth(1);
      
      doc.fontSize(8)
         .font('Helvetica')
         .fill('#666666')
         .text('PESO\nLOGO', logoX + 15, logoY + 25);
    }
    
    // Report title - larger and bold
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fill('#000000')
       .text(reportName, 50, 35);
    
    // Office name - smaller, below title
    doc.fontSize(14)
       .font('Helvetica')
       .fill('#333333')
       .text('Public Employment Service Office (PESO)', 50, 60);
    
    // Generation details
    if (metadata) {
      const generatedDate = new Date(metadata.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      doc.fontSize(10)
         .font('Helvetica')
         .fill('#666666')
         .text(`Generated: ${generatedDate}`, 50, 85)
         .text(`Period: ${metadata.startDate} to ${metadata.endDate}`, 50, 100);
      
      if (metadata.generatedBy) {
        doc.text(`By: ${metadata.generatedBy}`, 50, 115);
      }
    }

    // Header separator line
    doc.moveTo(50, 140)
       .lineTo(doc.page.width - 50, 140)
       .stroke('#cccccc')
       .lineWidth(1);

    doc.y = 160;
  }

  addReportContent(doc, reportData, sortConfig = null) {
    const { data } = reportData;
    const reportType = reportData.reportMetadata.reportType;
    
    // Only add the data table - skip all other sections
    if (data.details && data.details.length > 0) {
      this.addDetailsSection(doc, data.details, sortConfig);
    } else {
      // If no details, show a simple message
      doc.fontSize(12)
         .font('Helvetica')
         .fill('#666666')
         .text('No data available for the selected date range and filters.', 50, doc.y + 20);
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

  addDetailsSection(doc, details, sortConfig = null) {
    if (!details || details.length === 0) return;
    
    // Sort details data - use custom sortConfig if provided, otherwise use default sorting
    const sortedDetails = sortConfig ? this.applySortConfig(details, sortConfig) : this.sortDetailsData(details);
    
    const startY = doc.y + 20;
    
    // Simple section title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill('#000000')
       .text('Detailed Records', 50, startY);

    doc.y = startY + 25;

    // Define proper column headers based on data type
    const sampleItem = sortedDetails[0];
    const headers = this.getProperHeaders(sampleItem);
    const pageWidth = doc.page.width - 100;
    
    // Calculate simple column widths for better readability
    const columnWidths = this.calculateSimpleColumnWidths(headers, sortedDetails, pageWidth);
    
    // Table header with better formatting
    const headerY = doc.y;
    
    // Header background
    doc.rect(50, headerY, pageWidth, 35)
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

    doc.y = headerY + 40;

    // Simple data rows with better formatting
    const maxRows = 20;
    sortedDetails.slice(0, maxRows).forEach((row, rowIndex) => {
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

      doc.y = rowY + 30;
      
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

    if (sortedDetails.length > maxRows) {
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .fill(this.colors.secondary)
         .text(`... and ${sortedDetails.length - maxRows} more records (showing first ${maxRows})`, 50, doc.y + 10);
    }

    doc.y += 40;
  }

  sortDetailsData(details) {
    if (!details || details.length === 0) return details;
    
    // Create a copy to avoid mutating original data
    const sortedDetails = [...details];
    
    // Determine data type and apply appropriate sorting
    const sampleItem = details[0];
    
    // For hiring analytics data (has totalHired field)
    if (sampleItem.totalHired !== undefined) {
      return sortedDetails.sort((a, b) => {
        // Primary sort: totalHired (descending)
        if (b.totalHired !== a.totalHired) {
          return b.totalHired - a.totalHired;
        }
        // Secondary sort: totalApplications (descending)
        if (b.totalApplications !== a.totalApplications) {
          return b.totalApplications - a.totalApplications;
        }
        // Tertiary sort: company name (ascending)
        return (a.companyName || '').localeCompare(b.companyName || '');
      });
    }
    
    // For employer data (has accountStatus field)
    if (sampleItem.accountStatus !== undefined) {
      return sortedDetails.sort((a, b) => {
        // Primary sort: createdAt (descending - newest first)
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // Secondary sort: company name (ascending)
        return (a.companyName || '').localeCompare(b.companyName || '');
      });
    }
    
    // For job data (has status field and title)
    if (sampleItem.status !== undefined && sampleItem.title !== undefined) {
      return sortedDetails.sort((a, b) => {
        // Primary sort: postedDate or createdAt (descending - newest first)
        const dateA = new Date(a.postedDate || a.createdAt || 0);
        const dateB = new Date(b.postedDate || b.createdAt || 0);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // Secondary sort: job title (ascending)
        return (a.title || '').localeCompare(b.title || '');
      });
    }
    
    // For jobseeker data (has firstName/lastName or email)
    if (sampleItem.firstName !== undefined || sampleItem.email !== undefined) {
      return sortedDetails.sort((a, b) => {
        // Primary sort: createdAt or registrationDate (descending - newest first)
        const dateA = new Date(a.createdAt || a.registrationDate || 0);
        const dateB = new Date(b.createdAt || b.registrationDate || 0);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // Secondary sort: name or email (ascending)
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || '';
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email || '';
        return nameA.localeCompare(nameB);
      });
    }
    
    // For application data (has appliedDate)
    if (sampleItem.appliedDate !== undefined || sampleItem.applicationDate !== undefined) {
      return sortedDetails.sort((a, b) => {
        // Primary sort: appliedDate (descending - newest first)
        const dateA = new Date(a.appliedDate || a.applicationDate || a.createdAt || 0);
        const dateB = new Date(b.appliedDate || b.applicationDate || b.createdAt || 0);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // Secondary sort: applicant name (ascending)
        return (a.applicantName || a.name || '').localeCompare(b.applicantName || b.name || '');
      });
    }
    
    // Default sorting: by createdAt (descending) or first available date field
    return sortedDetails.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }

  applySortConfig(details, sortConfig) {
    if (!details || details.length === 0 || !sortConfig) return details;
    
    console.log('PDF Service - Applying sort config:', sortConfig);
    console.log('PDF Service - Sample data keys:', Object.keys(details[0] || {}));
    console.log('PDF Service - Sample data item:', JSON.stringify(details[0], null, 2));
    
    // Create a copy to avoid mutating original data
    const sortedDetails = [...details];
    
    return sortedDetails.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle specific column mappings for common report fields
      // Check all possible field variations
      if (sortConfig.key === 'totalApplications' || sortConfig.key === 'applicationCount') {
        aValue = a.totalApplications || a.applicationCount || a.applications || 0;
        bValue = b.totalApplications || b.applicationCount || b.applications || 0;
      }
      
      if (sortConfig.key === 'totalHired' || sortConfig.key === 'hiredCount') {
        aValue = a.totalHired || a.hiredCount || a.hired || 0;
        bValue = b.totalHired || b.hiredCount || b.hired || 0;
      }
      
      if (sortConfig.key === 'registrationDate' || sortConfig.key === 'createdAt') {
        aValue = a.registrationDate || a.createdAt || a.registeredAt || a.dateRegistered;
        bValue = b.registrationDate || b.createdAt || b.registeredAt || b.dateRegistered;
      }
      
      if (sortConfig.key === 'postedDate' || sortConfig.key === 'datePosted') {
        aValue = a.postedDate || a.datePosted || a.createdAt || a.publishedAt;
        bValue = b.postedDate || b.datePosted || b.createdAt || b.publishedAt;
      }
      
      if (sortConfig.key === 'latestHired' || sortConfig.key === 'lastHiredDate') {
        aValue = a.latestHired || a.lastHiredDate || a.recentHire || a.mostRecentHire;
        bValue = b.latestHired || b.lastHiredDate || b.recentHire || b.mostRecentHire;
      }
      
      console.log(`PDF Service - Sorting by ${sortConfig.key}: ${aValue} vs ${bValue} (after mapping)`);
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        console.log(`PDF Service - Number sort result: ${result}`);
        return result;
      }
      
      // Handle dates
      if (sortConfig.key.includes('Date') || sortConfig.key.includes('date') || 
          sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt' ||
          sortConfig.key === 'registrationDate' || sortConfig.key === 'postedDate' || 
          sortConfig.key === 'latestHired') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        const result = sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        console.log(`PDF Service - Date sort result: ${result}`);
        return result;
      }
      
      // Handle strings (fallback)
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getProperHeaders(sampleItem) {
    // Check for hiring analytics data first
    if (sampleItem.totalHired !== undefined) {
      return [
        { key: 'companyName', label: 'Company Name' },
        { key: 'totalHired', label: 'Total Hired' },
        { key: 'latestHired', label: 'Latest Hired' }
      ];
    }
    // Check for job data
    else if (sampleItem.jobTitle !== undefined) {
      return [
        { key: 'jobTitle', label: 'Job Title' },
        { key: 'companyName', label: 'Company Name' },
        { key: 'department', label: 'Department' },
        { key: 'status', label: 'Status' },
        { key: 'totalApplications', label: 'Total Applications' },
        { key: 'postedDate', label: 'Posted Date' }
      ];
    }
    // Check for jobseeker data
    else if (sampleItem.firstName !== undefined && sampleItem.lastName !== undefined) {
      return [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'status', label: 'Status' },
        { key: 'registrationDate', label: 'Registration Date' }
      ];
    }
    // Check for employer data
    else if (sampleItem.companyName !== undefined && sampleItem.industry !== undefined) {
      return [
        { key: 'companyName', label: 'Company Name' },
        { key: 'industry', label: 'Industry' },
        { key: 'email', label: 'Email' },
        { key: 'status', label: 'Status' },
        { key: 'totalApplications', label: 'Total Applications' },
        { key: 'dateRegistered', label: 'Date Registered' }
      ];
    }
    // Generic fallback
    else {
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
      'createdAt': 90,
      // Employer-specific fields
      'contactPerson.firstName': 85,
      'contactPerson.lastName': 85,
      'contactPerson.position': 95,
      'contactPerson.email': 130,
      'contactPerson.phoneNumber': 105,
      'companySize': 80,
      'address.city': 85,
      'address.province': 85,
      'address.street': 120,
      'website': 120,
      'totalJobPostings': 75,
      'activeJobPostings': 75,
      'expiredJobPostings': 75
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
    const footerY = pageHeight - 40;

    // Minimal footer with just generation date
    doc.fontSize(8)
       .font('Helvetica')
       .fill('#999999')
       .text(`Generated: ${new Date(metadata.generatedAt).toLocaleDateString()}`, 50, footerY, { align: 'center', width: doc.page.width - 100 });
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

        // Individual reports only - skip cover page and table of contents
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
    
    // Add detailed employer cards instead of table
    if (data.details && data.details.length > 0) {
      this.addEmployerDetailCards(doc, data.details);
    }
  }
  
  addEmployerDetailCards(doc, employers) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Detailed Company Information', 50, startY);

    doc.y = startY + 30;

    const maxEmployers = 15; // Show up to 15 employers in detail
    employers.slice(0, maxEmployers).forEach((employer, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 280) {
        doc.addPage();
        doc.y = 50;
      }
      
      const cardY = doc.y;
      const cardHeight = 250;
      const cardWidth = doc.page.width - 100;
      
      // Card background
      doc.rect(50, cardY, cardWidth, cardHeight)
         .fill('#f9fafb')
         .stroke('#e5e7eb')
         .lineWidth(1);
      
      // Company name header
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fill(this.colors.primary)
         .text(employer.companyName || 'N/A', 60, cardY + 10, { width: cardWidth - 20, ellipsis: true });
      
      doc.fontSize(9)
         .font('Helvetica')
         .fill(this.colors.text);
      
      let currentY = cardY + 35;
      const leftCol = 60;
      const rightCol = 310;
      const labelWidth = 75;
      const valueWidth = 160;
      
      // Left column - Company Info
      doc.font('Helvetica-Bold').text('Industry:', leftCol, currentY, { width: labelWidth });
      doc.font('Helvetica').text(employer.industry || 'N/A', leftCol + labelWidth, currentY, { width: valueWidth, ellipsis: true });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Company Size:', leftCol, currentY, { width: labelWidth });
      doc.font('Helvetica').text(employer.companySize || 'N/A', leftCol + labelWidth, currentY, { width: valueWidth });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Status:', leftCol, currentY, { width: labelWidth });
      doc.font('Helvetica').text(employer.accountStatus || 'N/A', leftCol + labelWidth, currentY, { width: valueWidth });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Website:', leftCol, currentY, { width: labelWidth });
      const website = employer.website || 'N/A';
      doc.font('Helvetica').text(website, leftCol + labelWidth, currentY, { width: valueWidth, ellipsis: true });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Location:', leftCol, currentY, { width: labelWidth });
      const location = [employer.address?.city, employer.address?.province].filter(Boolean).join(', ') || 'N/A';
      doc.font('Helvetica').text(location, leftCol + labelWidth, currentY, { width: valueWidth, ellipsis: true });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Email:', leftCol, currentY, { width: labelWidth });
      doc.font('Helvetica').text(employer.email || 'N/A', leftCol + labelWidth, currentY, { width: valueWidth, ellipsis: true });
      
      // Right column - Contact Person
      currentY = cardY + 35;
      doc.font('Helvetica-Bold').text('Contact Person:', rightCol, currentY, { width: 240 });
      currentY += 18;
      
      const contactName = [employer.contactPerson?.firstName, employer.contactPerson?.lastName].filter(Boolean).join(' ') || 'N/A';
      doc.font('Helvetica-Bold').text('Name:', rightCol, currentY, { width: 50 });
      doc.font('Helvetica').text(contactName, rightCol + 50, currentY, { width: 190, ellipsis: true });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Position:', rightCol, currentY, { width: 50 });
      doc.font('Helvetica').text(employer.contactPerson?.position || 'N/A', rightCol + 50, currentY, { width: 190, ellipsis: true });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Email:', rightCol, currentY, { width: 50 });
      const contactEmail = employer.contactPerson?.email || 'N/A';
      doc.font('Helvetica').text(contactEmail, rightCol + 50, currentY, { width: 190, ellipsis: true });
      currentY += 18;
      
      doc.font('Helvetica-Bold').text('Phone:', rightCol, currentY, { width: 50 });
      doc.font('Helvetica').text(employer.contactPerson?.phoneNumber || 'N/A', rightCol + 50, currentY, { width: 190 });
      currentY += 18;
      
      // Business Registration (if available)
      if (employer.businessRegistrationNumber) {
        doc.font('Helvetica-Bold').text('Bus. Reg:', rightCol, currentY, { width: 50 });
        doc.font('Helvetica').text(employer.businessRegistrationNumber, rightCol + 50, currentY, { width: 190, ellipsis: true });
      }
      
      // Bottom row - Job Statistics
      currentY = cardY + cardHeight - 60;
      doc.font('Helvetica-Bold').fontSize(9).fill(this.colors.text).text('Job Postings:', leftCol, currentY);
      doc.font('Helvetica').text(`Total: ${employer.totalJobPostings || 0} | Active: ${employer.activeJobPostings || 0} | Expired: ${employer.expiredJobPostings || 0}`, leftCol + 75, currentY);
      
      currentY += 15;
      doc.font('Helvetica-Bold').text('Hired Applicants:', leftCol, currentY);
      doc.font('Helvetica').fill(this.colors.accent).text(`${employer.hiredApplicantsCount || 0} applicants hired`, leftCol + 95, currentY);
      
      currentY += 15;
      doc.font('Helvetica-Oblique').fontSize(8).fill(this.colors.secondary);
      const regDate = employer.createdAt ? new Date(employer.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
      doc.text(`Registered: ${regDate}`, leftCol, currentY);
      
      // Verification status
      if (employer.verifiedAt) {
        const verDate = new Date(employer.verifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        doc.text(`Verified: ${verDate}`, rightCol, currentY);
      }
      
      doc.y = cardY + cardHeight + 15;
    });
    
    if (employers.length > maxEmployers) {
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .fill(this.colors.secondary)
         .text(`... and ${employers.length - maxEmployers} more companies (showing first ${maxEmployers})`, 50, doc.y + 10);
    }

    doc.y += 40;
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
    // Ensure we start on a fresh page for better organization
    this.ensurePageSpace(doc, 150);
    
    // Category Distribution Table
    if (data.chartData && data.chartData.categoryDistribution) {
      this.addCategoryDistributionTable(doc, data.chartData.categoryDistribution);
      this.ensurePageSpace(doc, 100);
    }
    
    // Top Demanding Jobs Table
    if (data.chartData && data.chartData.topDemandingJobs) {
      this.addTopDemandingJobsTable(doc, data.chartData.topDemandingJobs);
      this.ensurePageSpace(doc, 100);
    }
    
    // Monthly Trends Table
    if (data.chartData && data.chartData.monthlyTrends) {
      this.addMonthlyTrendsTable(doc, data.chartData.monthlyTrends);
      this.ensurePageSpace(doc, 100);
    }
    
    // Job demand trends with proper data
    if (data.chartData && data.chartData.categoryDistribution) {
      this.addJobDemandTrendsSection(doc, data.chartData.categoryDistribution);
      this.ensurePageSpace(doc, 80);
    }
    
    // Skills trends
    if (data.skillsTrends) {
      this.addSkillsTrendsSection(doc, data.skillsTrends);
      this.ensurePageSpace(doc, 80);
    }
    
    // Salary analytics
    if (data.salaryAnalytics) {
      this.addSalaryAnalyticsSection(doc, data.salaryAnalytics);
      this.ensurePageSpace(doc, 80);
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

  addJobDemandTrendsSection(doc, categoryData) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Job Demand Trends Analysis', 50, startY);

    doc.y = startY + 40;

    doc.fontSize(10).font('Helvetica').fill(this.colors.text);
    
    // Sort by demand score and take top 8
    const topCategories = [...categoryData]
      .sort((a, b) => (b.demandScore || 0) - (a.demandScore || 0))
      .slice(0, 8);
    
    topCategories.forEach((category, index) => {
      const demandScore = category.demandScore ? category.demandScore.toFixed(1) : '0';
      const jobCount = category.jobCount || 0;
      const applicantCount = category.totalApplicants || 0;
      const ratio = jobCount > 0 ? (applicantCount / jobCount).toFixed(1) : '0';
      
      doc.text(
        `${index + 1}. ${category._id || 'Not Specified'}: ${demandScore}% demand score (${jobCount} jobs, ${applicantCount} applicants, ${ratio} applicants/job)`, 
        70, 
        doc.y + 5
      );
    });

    doc.y += 50;
  }

  addCategoryDistributionTable(doc, categoryData) {
    // Ensure enough space for the table
    this.ensurePageSpace(doc, 300);
    
    const startY = doc.y + 20;
    
    // Section title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Category Distribution', 50, startY);

    doc.y = startY + 40;

    // Table headers
    const headers = ['Rank', 'Category', 'Job Count', 'Total Applicants', 'Demand Score'];
    const columnWidths = [60, 150, 80, 100, 90];
    const pageWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    
    // Header background
    doc.rect(50, doc.y, pageWidth, 25)
       .fill('#f5f5f5')
       .stroke('#cccccc')
       .lineWidth(1);
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill('#000000');

    let currentX = 50;
    headers.forEach((header, index) => {
      doc.text(header, currentX + 3, doc.y + 8, {
        width: columnWidths[index] - 6,
        align: 'center'
      });
      currentX += columnWidths[index];
    });

    doc.y += 30;

    // Data rows
    const sortedCategories = [...categoryData]
      .sort((a, b) => (b.demandScore || 0) - (a.demandScore || 0))
      .slice(0, 10);

    sortedCategories.forEach((category, index) => {
      // Check if we need a new page for this row
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        doc.y = 50;
        
        // Re-add header on new page
        this.addTableHeader(doc, headers, columnWidths, 'Category Distribution (continued)');
      }
      
      const rowY = doc.y;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fill('#000000');

      const rowData = [
        (index + 1).toString(),
        category._id || 'N/A',
        (category.jobCount || 0).toString(),
        (category.totalApplicants || 0).toString(),
        `${Math.round(category.demandScore || 0)}%`
      ];

      let currentX = 50;
      rowData.forEach((data, colIndex) => {
        doc.text(data, currentX + 3, rowY, {
          width: columnWidths[colIndex] - 6,
          align: colIndex === 0 || colIndex >= 2 ? 'center' : 'left',
          ellipsis: true
        });
        currentX += columnWidths[colIndex];
      });

      doc.y = rowY + 30;
      
      // Add row separator
      if (index < sortedCategories.length - 1) {
        doc.moveTo(50, doc.y - 2)
           .lineTo(50 + pageWidth, doc.y - 2)
           .stroke('#eeeeee')
           .lineWidth(0.5);
      }
    });

    doc.y += 30;
  }

  addTopDemandingJobsTable(doc, jobsData) {
    // Ensure enough space for the table
    this.ensurePageSpace(doc, 300);
    
    const startY = doc.y + 20;
    
    // Section title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Top Demanding Jobs', 50, startY);

    doc.y = startY + 40;

    // Table headers
    const headers = ['Rank', 'Job Title', 'Department', 'Job Count', 'Applicants', 'Demand Score'];
    const columnWidths = [50, 120, 100, 70, 80, 80];
    const pageWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    
    // Header background
    doc.rect(50, doc.y, pageWidth, 25)
       .fill('#f5f5f5')
       .stroke('#cccccc')
       .lineWidth(1);
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill('#000000');

    let currentX = 50;
    headers.forEach((header, index) => {
      doc.text(header, currentX + 3, doc.y + 8, {
        width: columnWidths[index] - 6,
        align: 'center'
      });
      currentX += columnWidths[index];
    });

    doc.y += 30;

    // Data rows
    const topJobs = jobsData.slice(0, 10);

    topJobs.forEach((job, index) => {
      // Check if we need a new page for this row
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        doc.y = 50;
        
        // Re-add header on new page
        this.addTableHeader(doc, headers, columnWidths, 'Top Demanding Jobs (continued)');
      }
      
      const rowY = doc.y;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fill('#000000');

      const rowData = [
        (index + 1).toString(),
        job._id || 'N/A',
        job.department || 'N/A',
        (job.totalJobs || 0).toString(),
        (job.totalApplicants || 0).toString(),
        `${Math.round(job.demandScore || 0)}%`
      ];

      let currentX = 50;
      rowData.forEach((data, colIndex) => {
        doc.text(data, currentX + 3, rowY, {
          width: columnWidths[colIndex] - 6,
          align: colIndex === 0 || colIndex >= 3 ? 'center' : 'left',
          ellipsis: true
        });
        currentX += columnWidths[colIndex];
      });

      doc.y = rowY + 30;
      
      // Add row separator
      if (index < topJobs.length - 1) {
        doc.moveTo(50, doc.y - 2)
           .lineTo(50 + pageWidth, doc.y - 2)
           .stroke('#eeeeee')
           .lineWidth(0.5);
      }
    });

    doc.y += 30;
  }

  addMonthlyTrendsTable(doc, trendsData) {
    // Ensure enough space for the table
    this.ensurePageSpace(doc, 300);
    
    const startY = doc.y + 20;
    
    // Section title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fill(this.colors.primary)
       .text('Monthly Job Trends', 50, startY);

    doc.y = startY + 40;

    // Table headers
    const headers = ['Month', 'Total Jobs', 'Total Applicants', 'Top Department', 'Dept Jobs'];
    const columnWidths = [80, 80, 100, 120, 80];
    const pageWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    
    // Header background
    doc.rect(50, doc.y, pageWidth, 25)
       .fill('#f5f5f5')
       .stroke('#cccccc')
       .lineWidth(1);
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill('#000000');

    let currentX = 50;
    headers.forEach((header, index) => {
      doc.text(header, currentX + 3, doc.y + 8, {
        width: columnWidths[index] - 6,
        align: 'center'
      });
      currentX += columnWidths[index];
    });

    doc.y += 30;

    // Data rows
    const sortedTrends = [...trendsData].sort((a, b) => a._id.localeCompare(b._id));

    sortedTrends.forEach((trend, index) => {
      // Check if we need a new page for this row
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        doc.y = 50;
        
        // Re-add header on new page
        this.addTableHeader(doc, headers, columnWidths, 'Monthly Job Trends (continued)');
      }
      
      const rowY = doc.y;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fill('#000000');

      // Find top department for this month
      const topDept = trend.departments && trend.departments.length > 0 
        ? trend.departments.reduce((max, dept) => dept.jobCount > max.jobCount ? dept : max)
        : null;

      const monthName = new Date(trend._id + '-01').toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });

      const rowData = [
        monthName,
        (trend.totalJobs || 0).toString(),
        (trend.totalApplicants || 0).toString(),
        topDept ? topDept.department : 'N/A',
        topDept ? topDept.jobCount.toString() : '0'
      ];

      let currentX = 50;
      rowData.forEach((data, colIndex) => {
        doc.text(data, currentX + 3, rowY, {
          width: columnWidths[colIndex] - 6,
          align: colIndex === 0 || colIndex === 3 ? 'left' : 'center',
          ellipsis: true
        });
        currentX += columnWidths[colIndex];
      });

      doc.y = rowY + 30;
      
      // Add row separator
      if (index < sortedTrends.length - 1) {
        doc.moveTo(50, doc.y - 2)
           .lineTo(50 + pageWidth, doc.y - 2)
           .stroke('#eeeeee')
           .lineWidth(0.5);
      }
    });

    doc.y += 30;
  }

  ensurePageSpace(doc, requiredSpace) {
    if (doc.y + requiredSpace > doc.page.height - 100) {
      doc.addPage();
      doc.y = 50;
    }
  }

  addTableHeader(doc, headers, columnWidths, title = null) {
    if (title) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fill(this.colors.primary)
         .text(title, 50, doc.y);
      doc.y += 30;
    }

    const pageWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    
    // Header background
    doc.rect(50, doc.y, pageWidth, 25)
       .fill('#f5f5f5')
       .stroke('#cccccc')
       .lineWidth(1);
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill('#000000');

    let currentX = 50;
    headers.forEach((header, index) => {
      doc.text(header, currentX + 3, doc.y + 8, {
        width: columnWidths[index] - 6,
        align: 'center'
      });
      currentX += columnWidths[index];
    });

    doc.y += 30;
  }

  getReportDisplayName(reportType) {
    const displayNames = {
      'registered-jobseekers': 'Registered Jobseekers Report',
      'employers-companies': 'Employers & Companies Report',
      'job-postings': 'Job Postings Report',
      'job-demand-analytics': 'Job Demand Analytics Report'
    };
    
    return displayNames[reportType] || 'Report';
  }
}

module.exports = new PDFReportService();
