import jsPDF from 'jspdf';

// PDF Generation utility - copied from CreateResumeTab
export const generateResumePDF = (resumeData: any, filename?: string, returnBlob = false) => {
  try {
    const doc = new jsPDF();
    const { personalInfo, summary, experience, education, skills } = resumeData;
  
  // Page margins and layout
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = 20;
  
  // Colors
  const blackColor = [0, 0, 0];
  const blueColor = [0, 100, 200]; // Blue for name
  const grayColor = [100, 100, 100]; // Gray for secondary text
  
  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin + 10;
      return true;
    }
    return false;
  };
  
  // Helper function to get location display names
  const getLocationDisplayNames = () => {
    return {
      regionName: personalInfo.readableLocationRegion || '',
      provinceName: personalInfo.readableLocationProvince || '',
      cityName: personalInfo.readableLocationCity || '',
      barangayName: personalInfo.readableLocationBarangay || ''
    };
  };
  
  // Header section with photo and name layout like the sample
  const photoWidth = 35; // Bigger photo - approximately 1.4 inches
  const photoHeight = 35; // Bigger photo - approximately 1.4 inches
  let hasPhoto = false;
  
  if (personalInfo.photo) {
    try {
      // Position photo on the top left - 2x2 ID picture format
      doc.addImage(personalInfo.photo, 'JPEG', margin, yPosition, photoWidth, photoHeight);
      hasPhoto = true;
    } catch (error) {    }
  }
  
  // Name - positioned next to photo, large and bold in blue
  const nameX = hasPhoto ? margin + photoWidth + 8 : margin;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim() || 'Your Name';
  doc.text(fullName.toUpperCase(), nameX, yPosition + 8);
  
  // Contact information positioned next to name (right side of header)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  
  let contactY = yPosition + 8;
  
  // Construct address
  let regionName = '', provinceName = '', cityName = '', barangayName = '';
  if (personalInfo.readableLocationRegion) {
    regionName = personalInfo.readableLocationRegion;
    provinceName = personalInfo.readableLocationProvince || '';
    cityName = personalInfo.readableLocationCity || '';
    barangayName = personalInfo.readableLocationBarangay || '';
  } else {
    const displayNames = getLocationDisplayNames();
    regionName = displayNames.regionName;
    provinceName = displayNames.provinceName;
    cityName = displayNames.cityName;
    barangayName = displayNames.barangayName;
  }
  
  const addressParts = [];
  if (personalInfo.address) addressParts.push(personalInfo.address);
  if (barangayName) addressParts.push(barangayName);
  if (cityName) addressParts.push(cityName);
  if (provinceName) addressParts.push(provinceName);
  
  // Address
  if (addressParts.length > 0) {
    doc.text(`Address: ${addressParts.join(', ')}`, nameX, contactY + 5);
    contactY += 4;
  }
  
  // Phone
  if (personalInfo.phone) {
    doc.text(`Phone: ${personalInfo.phone}`, nameX, contactY + 5);
    contactY += 4;
  }
  
  // Email
  if (personalInfo.email) {
    doc.text(`Email: ${personalInfo.email}`, nameX, contactY + 5);
    contactY += 4;
  }
  
  // Adjust yPosition to account for header
  yPosition = Math.max(yPosition + photoHeight + 10, contactY + 10);
  
  // Helper function to add section headers - plain with underline
  const addSectionHeader = (title: string) => {
    checkPageBreak(20);
    
    // Add spacing before section
    yPosition += 8;
    
    // Section header - blue text with underline to match name color
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.text(title.toUpperCase(), margin, yPosition);
    
    // Add underline - extend to the end of the page margin with blue color
    doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 8;
  };
  
  // Professional Summary
  if (summary) {
    addSectionHeader('Summary');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    const summaryLines = doc.splitTextToSize(summary, contentWidth);
    checkPageBreak(summaryLines.length * 4 + 10);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 4 + 5;
  }
  
  // Work Experience
  const validExperience = experience?.filter((exp: any) => exp.company && exp.position) || [];
  if (validExperience.length > 0) {
    addSectionHeader('Experience');
    
    validExperience.forEach((exp: any, index: number) => {
      // Calculate space needed for this experience entry
      const descLines = exp.description ? doc.splitTextToSize(exp.description, contentWidth - 8) : [];
      const spaceNeeded = 15 + (descLines.length * 4);
      checkPageBreak(spaceNeeded);
      
      // Job title - bold
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.text(exp.position, margin, yPosition);
      
      // Duration (right aligned)
      let durationText = '';
      if (exp.startDate && exp.endDate && exp.endDate !== 'present') {
        const startDate = new Date(exp.startDate + '-01');
        const endDate = new Date(exp.endDate + '-01');
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        durationText = `${startMonth} - ${endMonth}`;
      } else if (exp.startDate) {
        const startDate = new Date(exp.startDate + '-01');
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        durationText = `${startMonth} - Present`;
      } else if (exp.duration) {
        durationText = exp.duration;
      }
      
      if (durationText) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const durationWidth = doc.getTextWidth(durationText);
        doc.text(durationText, pageWidth - margin - durationWidth, yPosition);
      }
      yPosition += 4;
      
      // Company name - italic
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(exp.company, margin, yPosition);
      yPosition += 4;
      
      // Description with bullet points
      if (exp.description) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
        
        // Split description into bullet points if it contains line breaks
        const descriptionParts = exp.description.split('\n').filter((part: string) => part.trim());
        
        descriptionParts.forEach((part: string) => {
          const bulletText = `• ${part.trim()}`;
          const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 8);
          checkPageBreak(bulletLines.length * 4 + 2);
          doc.text(bulletLines, margin + 8, yPosition);
          yPosition += bulletLines.length * 4;
        });
        yPosition += 5;
      }
      
      // Add spacing between experiences
      if (index < validExperience.length - 1) {
        yPosition += 8;
      }
    });
  }
  
  // Educational Background
  const validEducation = education?.filter((edu: any) => edu.degree && edu.school) || [];
  if (validEducation.length > 0) {
    addSectionHeader('Education');
    
    validEducation.forEach((edu: any, index: number) => {
      checkPageBreak(25);
      
      // Degree (bold) with cleaner typography
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.text(edu.degree, margin, yPosition);
      
      // Duration (right aligned) - format from start and end dates
      let durationText = '';
      if (edu.startDate && edu.endDate && edu.endDate !== 'present') {
        const startDate = new Date(edu.startDate + '-01');
        const endDate = new Date(edu.endDate + '-01');
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        durationText = `${startYear} — ${endYear}`;
      } else if (edu.startDate) {
        const startDate = new Date(edu.startDate + '-01');
        const startYear = startDate.getFullYear();
        durationText = `${startYear} — Present`;
      }
      
      if (durationText) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
        const durationWidth = doc.getTextWidth(durationText);
        doc.text(durationText, pageWidth - margin - durationWidth, yPosition);
      }
      yPosition += 4;
      
      // School name (italic)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.text(edu.school, margin, yPosition);
      yPosition += 6;
    });
  }
  
  // Skills section
  const validSkills = skills?.filter((skill: string) => skill && skill.trim() !== '') || [];
  
  if (validSkills.length > 0) {
    addSectionHeader('Skills');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    
    // Display skills in a compact format
    const skillsText = validSkills.join(' • ');
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    
    checkPageBreak(skillLines.length * 4 + 10);
    skillLines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 4;
    });
    yPosition += 5;
  }
  
  // Return blob for database storage or save file for download
  if (returnBlob) {
    return doc.output('blob');
  } else {
    // Use provided filename or generate a consistent one
    const fullName = `${personalInfo.firstName || ''}_${personalInfo.lastName || ''}`.replace(/\s+/g, '_') || 'Resume';
    const defaultFileName = `${fullName}_Resume.pdf`;
    const fileName = filename || defaultFileName;
    doc.save(fileName);
    return undefined;
  }
  
  } catch (error) {    // Return a simple test PDF if there's an error
    if (returnBlob) {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Error generating resume PDF', 20, 30);
      doc.text('Please try again or contact support', 20, 50);
      return doc.output('blob');
    }
    return undefined;
  }
};
