const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/authMiddleware');
const Resume = require('../models/Resume');
const MLResume = require('../models/MLResume');
const JobSeeker = require('../models/JobSeeker');
const { getImageUrl, isCloudUrl } = require('../utils/imageUtils');
const cloudStorageService = require('../services/cloudStorageService');

// Transform database resume data to jobseeker format
function transformToJobseekerFormat(resumeData, application) {
  const resumeObj = resumeData.toObject ? resumeData.toObject() : resumeData;
  const personalInfo = resumeObj.personalInfo || {};
  
  return {
    personalInfo: {
      firstName: personalInfo.firstName || personalInfo.fullName?.split(' ')[0] || '',
      lastName: personalInfo.lastName || personalInfo.fullName?.split(' ').slice(1).join(' ') || '',
      email: personalInfo.email || '',
      phone: personalInfo.phone || '',
      address: personalInfo.address || personalInfo.fullAddress || '',
      photo: getImageUrl(personalInfo.photo || ''),
      // Add readable location data for PDF generation
      readableLocationRegion: personalInfo.readableLocation?.region || '',
      readableLocationProvince: personalInfo.readableLocation?.province || '',
      readableLocationCity: personalInfo.readableLocation?.city || '',
      readableLocationBarangay: personalInfo.readableLocation?.barangay || ''
    },
    summary: resumeObj.summary || '',
    experience: (resumeObj.workExperience || resumeObj.experience || []).map(exp => ({
      company: exp.company || '',
      position: exp.position || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      duration: exp.duration || '',
      description: exp.description || ''
    })),
    education: (resumeObj.education || []).map(edu => ({
      degree: edu.degree || '',
      school: edu.school || edu.institution || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      description: edu.description || '',
      location: edu.location || ''
    })),
    skills: resumeObj.skills || [],
    optionalSections: resumeObj.optionalSections || [],
    sectionOrder: resumeObj.sectionOrder || [
      { id: 'personal', type: 'personal', title: 'Personal Information' },
      { id: 'summary', type: 'summary', title: 'Professional Summary' },
      { id: 'experience', type: 'experience', title: 'Work Experience' },
      { id: 'education', type: 'education', title: 'Educational Background' },
      { id: 'skills', type: 'skills', title: 'Skills' }
    ]
  };
}

// Helper function to get location display names (copied from CreateResumeTab)
function getLocationDisplayNames(personalInfo) {
  return {
    regionName: personalInfo.readableLocationRegion || '',
    provinceName: personalInfo.readableLocationProvince || '',
    cityName: personalInfo.readableLocationCity || '',
    barangayName: personalInfo.readableLocationBarangay || ''
  };
}

// Exact PDF generation function copied from CreateResumeTab
function generateJobseekerPDF(resumeData, filename, returnBlob = true) {
  const jsPDF = require('jspdf');
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
  const checkPageBreak = (requiredSpace) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin + 10;
      return true;
    }
    return false;
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
    } catch (error) {
      console.error('Error adding photo to PDF:', error);
    }
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
    const displayNames = getLocationDisplayNames(personalInfo);
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
  const addSectionHeader = (title) => {
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
  const validExperience = experience.filter(exp => exp.company && exp.position);
  if (validExperience.length > 0) {
    addSectionHeader('Experience');
    
    validExperience.forEach((exp, index) => {
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
        const descriptionParts = exp.description.split('\n').filter(part => part.trim());
        
        descriptionParts.forEach(part => {
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
  const validEducation = education.filter(edu => edu.degree && edu.school);
  if (validEducation.length > 0) {
    addSectionHeader('Education');
    
    validEducation.forEach((edu, index) => {
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
  const validSkills = skills.filter(skill => skill && skill.trim() !== '');
  
  if (validSkills.length > 0) {
    addSectionHeader('Skills');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    
    // Display skills in a compact format
    const skillsText = validSkills.join(' • ');
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    
    checkPageBreak(skillLines.length * 4 + 10);
    skillLines.forEach((line) => {
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
}

// @route   GET /api/resumes
// @desc    Get job seeker's resumes
// @access  Private (Job Seeker)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const resumes = await Resume.find({ jobSeekerUid: uid })
      .sort({ uploadedAt: -1 });

    const formattedResumes = resumes.map(resume => ({
      id: resume._id,
      filename: resume.originalName,
      fileUrl: resume.fileUrl,
      fileSize: resume.fileSize,
      processingStatus: resume.processingStatus,
      isActive: resume.isActive,
      uploadedAt: resume.uploadedAt,
      processedAt: resume.processedAt,
      personalInfo: resume.personalInfo,
      summary: resume.summary,
      skills: resume.skills,
      workExperience: resume.workExperience,
      education: resume.education
    }));

    res.json({
      success: true,
      data: formattedResumes
    });

  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resumes'
    });
  }
});

// @route   GET /api/resumes/current
// @desc    Get job seeker's current active resume
// @access  Private (Job Seeker)
router.get('/current', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const resume = await Resume.getActiveResumeForJobSeeker(uid);

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'No active resume found'
      });
    }

    res.json({
      success: true,
      data: {
        id: resume._id,
        filename: resume.originalName,
        fileUrl: resume.fileUrl,
        processingStatus: resume.processingStatus,
        uploadedAt: resume.uploadedAt,
        processedAt: resume.processedAt,
        personalInfo: resume.personalInfo,
        summary: resume.summary,
        skills: resume.skills,
        workExperience: resume.workExperience,
        education: resume.education,
        optionalSections: resume.optionalSections || [],
        sectionOrder: resume.sectionOrder || [
          { id: 'personal', type: 'personal', title: 'Personal Information' },
          { id: 'summary', type: 'summary', title: 'Professional Summary' },
          { id: 'experience', type: 'experience', title: 'Work Experience' },
          { id: 'education', type: 'education', title: 'Educational Background' },
          { id: 'skills', type: 'skills', title: 'Skills' }
        ],
        // Original resume fields
        uploadedResumeUrl: resume.uploadedResumeUrl,
        showUploadedToEmployers: resume.showUploadedToEmployers
      }
    });

  } catch (error) {
    console.error('Error fetching current resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current resume'
    });
  }
});

// @route   POST /api/resumes/create
// @desc    Create a new resume with form data and PDF
// @access  Private (Job Seeker)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { resumeData, pdfData } = req.body;

    if (!resumeData || !pdfData) {
      return res.status(400).json({
        success: false,
        error: 'Resume data and PDF data are required'
      });
    }

    // Find the job seeker
    const jobSeeker = await JobSeeker.findOne({ uid });
    if (!jobSeeker) {
      return res.status(404).json({
        success: false,
        error: 'Job seeker profile not found'
      });
    }

    // Check if user already has an active resume
    let existingResume = await Resume.findOne({ jobSeekerUid: uid, isActive: true });

    // Convert base64 PDF data to buffer
    const pdfBuffer = Buffer.from(pdfData, 'base64');
    
    let filename, filePath, cloudResult;
    
    // Helper function to construct full name
    const constructFullName = (personalInfo) => {
      const { firstName, lastName } = personalInfo;
      return `${firstName || ''} ${lastName || ''}`.trim() || 'Resume';
    };

    // Helper function to convert education dates to years only
    const processEducationDates = (education) => {
      return education.map(edu => ({
        ...edu,
        startDate: edu.startDate ? new Date(edu.startDate + '-01').getFullYear().toString() : '',
        endDate: edu.endDate === 'present' ? 'present' : (edu.endDate ? new Date(edu.endDate + '-01').getFullYear().toString() : '')
      }));
    };

    // Helper function to process work experience (remove duration field)
    const processWorkExperience = (experience) => {
      return experience.map(exp => {
        const { duration, ...expWithoutDuration } = exp;
        return expWithoutDuration;
      });
    };

    // Upload PDF to cloud storage
    const fullName = constructFullName(resumeData.personalInfo);
    const pdfFilename = `${fullName}_Resume_${Date.now()}.pdf`;
    
    try {
      console.log(' Uploading resume PDF to cloud storage...');
      cloudResult = await cloudStorageService.uploadBuffer(
        pdfBuffer,
        pdfFilename,
        `users/${uid}/resumes`,
        'application/pdf'
      );
      console.log(' Resume PDF uploaded to cloud:', cloudResult.publicId);
    } catch (cloudError) {
      console.error(' Cloud upload failed:', cloudError);
      // Continue with local storage as fallback
      cloudResult = null;
    }

    if (existingResume) {
      // Update existing resume - reuse the same filename
      filename = existingResume.filename;
      filePath = path.join(__dirname, '..', 'uploads', 'resumes', filename);
    } else {
      // Create new resume - generate new filename
      filename = `resume-${Date.now()}-${Math.round(Math.random() * 1E9)}.pdf`;
      filePath = path.join(__dirname, '..', 'uploads', 'resumes', filename);
    }
    
    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save PDF file locally as backup (overwrite if updating)
    fs.writeFileSync(filePath, pdfBuffer);

    if (existingResume) {
      // Update existing resume
      const fullName = constructFullName(resumeData.personalInfo);
      existingResume.originalName = `${fullName}_Resume.pdf`;
      existingResume.fileSize = pdfBuffer.length;
      existingResume.processingStatus = 'completed';
      existingResume.personalInfo = {
        fullName: fullName,
        email: resumeData.personalInfo.email,
        phone: resumeData.personalInfo.phone,
        age: resumeData.personalInfo.age,
        birthday: resumeData.personalInfo.birthday,
        photo: resumeData.personalInfo.photo || '', // Cloud URL only
        // Store address and PSGC codes in grouped location object
        address: resumeData.personalInfo.address,
        zipCode: resumeData.personalInfo.zipCode,
        location: {
          region: resumeData.personalInfo.region || '',
          province: resumeData.personalInfo.province || '',
          city: resumeData.personalInfo.city || '',
          barangay: resumeData.personalInfo.barangay || ''
        },
        readableLocation: {
          region: resumeData.personalInfo.regionName || '',
          province: resumeData.personalInfo.provinceName || '',
          city: resumeData.personalInfo.cityName || '',
          barangay: resumeData.personalInfo.barangayName || ''
        }
      };
      
      // Debug: Log what's being stored
      console.log(' BACKEND BARANGAY DEBUG:');
      console.log('  - Received barangay PSGC:', resumeData.personalInfo.barangay, '(type:', typeof resumeData.personalInfo.barangay, ')');
      console.log('  - Received barangay name:', resumeData.personalInfo.barangayName, '(type:', typeof resumeData.personalInfo.barangayName, ')');
      console.log('Storing location data:', {
        psgcCodes: {
          region: resumeData.personalInfo.region,
          province: resumeData.personalInfo.province,
          city: resumeData.personalInfo.city,
          barangay: resumeData.personalInfo.barangay
        },
        readableNames: {
          region: resumeData.personalInfo.regionName,
          province: resumeData.personalInfo.provinceName,
          city: resumeData.personalInfo.cityName,
          barangay: resumeData.personalInfo.barangayName
        }
      });
      
      existingResume.summary = resumeData.summary;
      existingResume.skills = resumeData.skills;
      existingResume.workExperience = processWorkExperience(resumeData.experience);
      existingResume.education = processEducationDates(resumeData.education);
      existingResume.optionalSections = resumeData.optionalSections || [];
      existingResume.sectionOrder = resumeData.sectionOrder || existingResume.sectionOrder;
      existingResume.updatedAt = new Date();
      // Increment version on update
      existingResume.version = (existingResume.version || 1) + 1;
      
      // Update cloud storage fields
      if (cloudResult) {
        existingResume.pdfCloudUrl = cloudResult.url;
        existingResume.pdfPublicId = cloudResult.publicId;
      }
      // Update employer visibility consent (default true if not specified)
      existingResume.showToEmployers = resumeData.showToEmployers !== undefined ? resumeData.showToEmployers : true;
      
      // Update uploaded resume fields if provided
      if (resumeData.uploadedResumeUrl) {
        existingResume.uploadedResumeUrl = resumeData.uploadedResumeUrl;
      }
      existingResume.showUploadedToEmployers = resumeData.showUploadedToEmployers || false;
      
      console.log(' Saving optional sections (UPDATE):', existingResume.optionalSections.length, 'sections');
      console.log(' Section types:', existingResume.optionalSections.map(s => s.type));
      
      await existingResume.save();
      var resume = existingResume;
    } else {
      // Create new resume record
      const fullName = constructFullName(resumeData.personalInfo);
      const newResume = new Resume({
        jobSeekerUid: uid,
        jobSeekerId: jobSeeker._id,
        filename: filename,
        originalName: `${fullName}_Resume.pdf`,
        fileUrl: `/uploads/resumes/${filename}`,
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf',
        processingStatus: 'completed',
        personalInfo: {
          fullName: fullName,
          email: resumeData.personalInfo.email,
          phone: resumeData.personalInfo.phone,
          age: resumeData.personalInfo.age,
          birthday: resumeData.personalInfo.birthday,
          photo: resumeData.personalInfo.photo || '', // Cloud URL only
          // Store address and PSGC codes in grouped location object
          address: resumeData.personalInfo.address,
          zipCode: resumeData.personalInfo.zipCode,
          location: {
            region: resumeData.personalInfo.region || '',
            province: resumeData.personalInfo.province || '',
            city: resumeData.personalInfo.city || '',
            barangay: resumeData.personalInfo.barangay || ''
          },
          readableLocation: {
            region: resumeData.personalInfo.regionName || '',
            province: resumeData.personalInfo.provinceName || '',
            city: resumeData.personalInfo.cityName || '',
            barangay: resumeData.personalInfo.barangayName || ''
          }
        },
        summary: resumeData.summary,
        skills: resumeData.skills,
        workExperience: processWorkExperience(resumeData.experience),
        education: processEducationDates(resumeData.education),
        optionalSections: resumeData.optionalSections || [],
        sectionOrder: resumeData.sectionOrder || [
          { id: 'personal', type: 'personal', title: 'Personal Information' },
          { id: 'summary', type: 'summary', title: 'Professional Summary' },
          { id: 'experience', type: 'experience', title: 'Work Experience' },
          { id: 'education', type: 'education', title: 'Educational Background' },
          { id: 'skills', type: 'skills', title: 'Skills' }
        ],
        version: 1, // Start new resumes at version 1
        isActive: true,
        // Cloud storage fields
        pdfCloudUrl: cloudResult ? cloudResult.url : null,
        pdfPublicId: cloudResult ? cloudResult.publicId : null,
        showToEmployers: resumeData.showToEmployers !== undefined ? resumeData.showToEmployers : true,
        // Uploaded resume fields
        uploadedResumeUrl: resumeData.uploadedResumeUrl || null,
        showUploadedToEmployers: resumeData.showUploadedToEmployers || false
      });

      // Debug: Log what's being stored for new resume
      console.log('Storing NEW resume location data:', {
        psgcCodes: {
          region: resumeData.personalInfo.region,
          province: resumeData.personalInfo.province,
          city: resumeData.personalInfo.city,
          barangay: resumeData.personalInfo.barangay
        },
        readableNames: {
          region: resumeData.personalInfo.regionName,
          province: resumeData.personalInfo.provinceName,
          city: resumeData.personalInfo.cityName,
          barangay: resumeData.personalInfo.barangayName
        }
      });
      
      console.log(' Saving optional sections (NEW):', newResume.optionalSections.length, 'sections');
      console.log(' Section types:', newResume.optionalSections.map(s => s.type));

      await newResume.save();
      var resume = newResume;
    }

    // Update job seeker's current resume reference
    jobSeeker.currentResumeId = resume._id;
    await jobSeeker.save();

    // Sync to ML Resume collection
    try {
      await MLResume.createOrUpdateFromResume(resume);
    } catch (mlError) {
      console.error('Error syncing to ML Resume collection:', mlError);
      // Don't fail the main operation if ML sync fails
    }

    res.status(201).json({
      success: true,
      message: existingResume ? 'Resume updated successfully' : 'Resume created successfully',
      data: {
        resumeId: resume._id,
        filename: resume.originalName,
        fileUrl: resume.fileUrl,
        uploadedAt: resume.uploadedAt,
        processingStatus: resume.processingStatus
      }
    });

  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create resume',
      details: error.message
    });
  }
});

// @route   GET /api/resumes/:id/download
// @desc    Download a resume file
// @access  Private (Job Seeker)
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    // Find the resume
    const resume = await Resume.findOne({ _id: id, jobSeekerUid: uid });
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    const filePath = path.join(__dirname, '..', resume.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.download(filePath, resume.originalName);

  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download resume'
    });
  }
});

// @route   GET /api/resumes/view/:applicationId
// @desc    View resume PDF for an application
// @access  Private (Employer)
router.get('/view/:applicationId', verifyToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { uid } = req.user;

    // Find the application and verify employer access
    const Application = require('../models/Application');
    const application = await Application.findOne({
      _id: applicationId,
      employerUid: uid
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or access denied'
      });
    }

    // Get resume data from database and generate PDF on-the-fly
    const JobSeeker = require('../models/JobSeeker');
    const jobSeeker = await JobSeeker.findOne({ uid: application.jobSeekerUid });
    
    let resumeData = null;
    
    // Try to get resume data from JobSeeker's current resume
    if (jobSeeker && jobSeeker.currentResumeId) {
      const resume = await Resume.findById(jobSeeker.currentResumeId);
      if (resume) {
        resumeData = resume;
        console.log(' Found resume data via JobSeeker.currentResumeId');
      }
    }
    
    // Fallback: Get resume data from application
    if (!resumeData && application.resumeData) {
      resumeData = {
        personalInfo: application.resumeData.personalInfo,
        summary: application.resumeData.summary,
        skills: application.resumeData.skills,
        workExperience: application.resumeData.experience,
        education: application.resumeData.education
      };
      console.log(' Using resume data from application');
    }
    
    // Fallback: Find any resume for this job seeker
    if (!resumeData) {
      const anyResume = await Resume.findOne({ 
        jobSeekerUid: application.jobSeekerUid,
        isActive: true 
      }).sort({ uploadedAt: -1 });
      
      if (anyResume) {
        resumeData = anyResume;
        console.log(' Found resume data via any active resume');
      }
    }

    if (!resumeData) {
      console.log(' No resume data found for application:', {
        applicationId,
        jobSeekerUid: application.jobSeekerUid,
        hasJobSeeker: !!jobSeeker,
        hasCurrentResumeId: !!jobSeeker?.currentResumeId,
        hasApplicationResumeData: !!application.resumeData
      });
      
      return res.status(404).json({
        success: false,
        error: 'Resume data not found'
      });
    }

    // Check if user has consented to show resume to employers
    if (resumeData.showToEmployers === false) {
      return res.status(403).json({
        success: false,
        error: 'Resume visibility restricted by job seeker'
      });
    }

    // Check if we have cloud URLs for resumes
    const hasGeneratedResume = !!resumeData.pdfCloudUrl;
    const hasUploadedResume = resumeData.showUploadedToEmployers && !!resumeData.uploadedResumeUrl;
    
    if (hasGeneratedResume || hasUploadedResume) {
      return res.json({
        success: true,
        useCloudUrl: true,
        resumes: {
          generated: hasGeneratedResume ? {
            url: resumeData.pdfCloudUrl,
            label: 'Generated Resume'
          } : null,
          uploaded: hasUploadedResume ? {
            url: resumeData.uploadedResumeUrl,
            label: 'Original Resume'
          } : null
        },
        applicantName: resumeData.personalInfo?.fullName || resumeData.personalInfo?.name || 'Applicant'
      });
    }

    // Fallback: Transform resume data to match jobseeker format for frontend PDF generation
    const jobseekerFormat = transformToJobseekerFormat(resumeData, application);
    
    // Return resume data as JSON for frontend PDF generation
    const applicantName = resumeData.personalInfo?.fullName || resumeData.personalInfo?.name || 'Applicant';
    
    console.log(' Returning resume data for PDF generation:', {
      applicantName,
      hasPersonalInfo: !!jobseekerFormat.personalInfo,
      hasExperience: !!jobseekerFormat.experience?.length,
      hasEducation: !!jobseekerFormat.education?.length,
      hasSkills: !!jobseekerFormat.skills?.length
    });
    
    res.json({
      success: true,
      generatePDF: true,
      resumeData: jobseekerFormat,
      applicantName: applicantName
    });

  } catch (error) {
    console.error('Error viewing resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to view resume'
    });
  }
});

// @route   GET /api/resumes/download/:applicationId
// @desc    Download resume PDF for an application
// @access  Private (Employer)
router.get('/download/:applicationId', verifyToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { uid } = req.user;

    // Find the application and verify employer access
    const Application = require('../models/Application');
    const application = await Application.findOne({
      _id: applicationId,
      employerUid: uid
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or access denied'
      });
    }

    // Get resume data from database and generate PDF on-the-fly
    const JobSeeker = require('../models/JobSeeker');
    const jobSeeker = await JobSeeker.findOne({ uid: application.jobSeekerUid });
    
    let resumeData = null;
    
    // Try to get resume data from JobSeeker's current resume
    if (jobSeeker && jobSeeker.currentResumeId) {
      const resume = await Resume.findById(jobSeeker.currentResumeId);
      if (resume) {
        resumeData = resume;
        console.log(' Found resume data for download via JobSeeker.currentResumeId');
      }
    }
    
    // Fallback: Get resume data from application
    if (!resumeData && application.resumeData) {
      resumeData = {
        personalInfo: application.resumeData.personalInfo,
        summary: application.resumeData.summary,
        skills: application.resumeData.skills,
        workExperience: application.resumeData.experience,
        education: application.resumeData.education
      };
      console.log(' Using resume data from application for download');
    }
    
    // Fallback: Find any resume for this job seeker
    if (!resumeData) {
      const anyResume = await Resume.findOne({ 
        jobSeekerUid: application.jobSeekerUid,
        isActive: true 
      }).sort({ uploadedAt: -1 });
      
      if (anyResume) {
        resumeData = anyResume;
        console.log(' Found resume data for download via any active resume');
      }
    }

    if (!resumeData) {
      console.log(' No resume data found for download for application:', {
        applicationId,
        jobSeekerUid: application.jobSeekerUid,
        hasJobSeeker: !!jobSeeker,
        hasCurrentResumeId: !!jobSeeker?.currentResumeId,
        hasApplicationResumeData: !!application.resumeData
      });
      
      return res.status(404).json({
        success: false,
        error: 'Resume data not found'
      });
    }

    // Check if user has consented to show resume to employers
    if (resumeData.showToEmployers === false) {
      return res.status(403).json({
        success: false,
        error: 'Resume visibility restricted by job seeker'
      });
    }

    // Check if we have cloud URLs for resumes
    const hasGeneratedResume = !!resumeData.pdfCloudUrl;
    const hasUploadedResume = resumeData.showUploadedToEmployers && !!resumeData.uploadedResumeUrl;
    
    if (hasGeneratedResume || hasUploadedResume) {
      console.log(' Returning cloud-stored resume URLs for download:', {
        generated: resumeData.pdfCloudUrl,
        uploaded: hasUploadedResume ? resumeData.uploadedResumeUrl : null
      });
      
      return res.json({
        success: true,
        useCloudUrl: true,
        resumes: {
          generated: hasGeneratedResume ? {
            url: resumeData.pdfCloudUrl,
            label: 'Generated Resume'
          } : null,
          uploaded: hasUploadedResume ? {
            url: resumeData.uploadedResumeUrl,
            label: 'Original Resume'
          } : null
        },
        applicantName: resumeData.personalInfo?.fullName || resumeData.personalInfo?.name || 'Applicant'
      });
    }

    // Fallback: Transform resume data to match jobseeker format
    const jobseekerFormat = transformToJobseekerFormat(resumeData, application);
    
    // Return resume data as JSON for frontend PDF generation and download
    const applicantName = resumeData.personalInfo?.fullName || resumeData.personalInfo?.name || 'Applicant';
    
    console.log(' Returning resume data for PDF download:', {
      applicantName,
      hasPersonalInfo: !!jobseekerFormat.personalInfo,
      hasExperience: !!jobseekerFormat.experience?.length,
      hasEducation: !!jobseekerFormat.education?.length,
      hasSkills: !!jobseekerFormat.skills?.length
    });
    
    res.json({
      success: true,
      downloadPDF: true,
      resumeData: jobseekerFormat,
      applicantName: applicantName
    });

  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download resume'
    });
  }
});

// Resume parsing endpoint
router.post('/parse', verifyToken, async (req, res) => {
  try {
    const multer = require('multer');
    const resumeParsingService = require('../services/resumeParsingService');
    const EnhancedResumeParser = require('../services/enhancedResumeParser');
    const enhancedResumeParser = new EnhancedResumeParser();
    console.log(' Routes loaded with enhanced parser v2.0.1');
    
    // Configure multer for memory storage
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit to support multi-page resumes
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      }
    }).single('resume');

    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No PDF file uploaded'
        });
      }

      try {
        console.log('Processing uploaded resume:', req.file.originalname);
        
        // Try enhanced parsing first, fallback to original if needed
        let parseResult;
        try {
          console.log(' Attempting enhanced parsing...');
          parseResult = await enhancedResumeParser.parseResume(req.file.buffer);
          console.log(' Enhanced parsing successful');
        } catch (enhancedError) {
          console.log(' Enhanced parsing failed, using fallback:', enhancedError.message);
          parseResult = await resumeParsingService.parseResume(req.file.buffer);
        }
        
        if (parseResult.success) {
          console.log(' Sending parsed data to frontend:', {
            dataKeys: Object.keys(parseResult.data),
            personalInfo: parseResult.data.personalInfo,
            educationCount: parseResult.data.education?.length || 0,
            educationSample: parseResult.data.education?.[0] || null,
            educationAll: parseResult.data.education || [],
            experienceCount: parseResult.data.experience?.length || 0,
            experienceSample: parseResult.data.experience?.[0] || null,
            projectsCount: parseResult.data.projects?.length || 0,
            skillsCount: parseResult.data.skills?.length || 0,
            optionalSectionsCount: parseResult.data.optionalSections?.length || 0,
            optionalSectionTypes: parseResult.data.optionalSections?.map(s => s.type) || []
          });
          
          console.log(' DEBUG: Optional Sections Details:', parseResult.data.optionalSections);
          
          res.json({
            success: true,
            message: 'Resume parsed successfully',
            data: parseResult.data,
            rawText: parseResult.rawText?.substring(0, 1000) // Limit raw text for response size
          });
        } else {
          res.status(500).json({
            success: false,
            error: parseResult.error || 'Resume parsing failed'
          });
        }
        
      } catch (parseError) {
        console.error('Resume parsing error:', parseError);
        res.status(500).json({
          success: false,
          error: 'Failed to parse resume content'
        });
      }
    });

  } catch (error) {
    console.error('Resume parsing endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// @route   PUT /api/resumes/original-visibility
// @desc    Update original resume visibility to employers
// @access  Private (Job Seeker)
router.put('/original-visibility', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { showUploadedToEmployers } = req.body;

    if (typeof showUploadedToEmployers !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'showUploadedToEmployers must be a boolean value'
      });
    }

    // Find the active resume for this job seeker
    const resume = await Resume.findOne({ 
      jobSeekerUid: uid, 
      isActive: true 
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'No active resume found'
      });
    }

    // Update the visibility setting
    resume.showUploadedToEmployers = showUploadedToEmployers;
    await resume.save();

    res.json({
      success: true,
      message: `Original resume visibility ${showUploadedToEmployers ? 'enabled' : 'disabled'}`,
      data: {
        showUploadedToEmployers: resume.showUploadedToEmployers
      }
    });

  } catch (error) {
    console.error('Error updating original resume visibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update resume visibility'
    });
  }
});

module.exports = router;
