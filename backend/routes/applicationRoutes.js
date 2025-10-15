const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { verifyToken } = require('../middleware/authMiddleware');
const path = require('path');


// @route   POST /api/applications
// @desc    Create a new job application
// @access  Private
router.post('/', verifyToken, async (req, res) => {
  try {
    const { jobId, resumeData, coverLetter } = req.body;
    const { uid } = req.user;

    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Job ID is required' });
    }

    if (!uid) {
      return res.status(401).json({ success: false, error: 'User authentication failed' });
    }

    const Job = require('../models/Job');
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Prevent duplicate applications
    const existingApplication = await Application.findOne({ jobId, jobSeekerUid: uid });
    if (existingApplication) {
      return res.status(400).json({ success: false, error: 'You have already applied to this job' });
    }

    // Resolve employer identifier
    let employerIdentifier = job.employerUid || job.employerId || 'unknown';

    // Fetch Job Seeker profile
    const JobSeeker = require('../models/JobSeeker');
    const jobSeekerProfile = await JobSeeker.findOne({ uid });

    const mapEducationData = (educationLevel) => {
      if (!educationLevel) return {};
      return {
        institution: educationLevel.school || educationLevel.institution || '',
        degree: educationLevel.major || educationLevel.degree || '',
        year: educationLevel.ay || educationLevel.year || ''
      };
    };




    console.log(`� Education processing for user ${uid}:`, {
      originalEducation: resumeData.education,
      isArray: Array.isArray(resumeData.education)
    });

    // Enhanced resume
    const enhancedResumeData = {
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        name:
          resumeData.personalInfo?.name ||
          (jobSeekerProfile ? `${jobSeekerProfile.firstName} ${jobSeekerProfile.lastName}` : 'Unknown Applicant'),
        email: resumeData.personalInfo?.email || jobSeekerProfile?.email || ''
      },
      education: resumeData.education || []
    };

    // Fetch actual resume data from Resume collection
    const Resume = require('../models/Resume');
    let resumeFileInfo = null;
    let actualResumeData = null;
    
    console.log(` Looking for Resume data for user ${uid}, currentResumeId: ${jobSeekerProfile?.currentResumeId}`);
    
    if (jobSeekerProfile?.currentResumeId) {
      const resume = await Resume.findById(jobSeekerProfile.currentResumeId);
      console.log(` Found resume by currentResumeId:`, !!resume);
      if (resume) {
        console.log(`� Resume education data:`, resume.education);
        // Get file info
        if (resume.fileUrl) {
          resumeFileInfo = {
            fileName: resume.originalName || resume.filename,
            filePath: resume.fileUrl,
            fileSize: resume.fileSize
          };
        }
        // Get actual resume content (skills, experience, etc.)
        const resumeEducation = resume.education || [];
        console.log(`� Processed education:`, { resumeEducation });
        
        actualResumeData = {
          personalInfo: resume.personalInfo,
          summary: resume.summary,
          skills: resume.skills || [],
          workExperience: resume.workExperience || [],
          education: resumeEducation
        };
      }
    } else {
      const recentResume = await Resume.findOne({
        $or: [{ jobSeekerUid: uid }, { uid: uid }],
        isActive: true
      }).sort({ uploadedAt: -1 });
      
      console.log(` Found recent resume by uid search:`, !!recentResume);
      if (recentResume) {
        console.log(`� Recent resume education data:`, recentResume.education);
        // Get file info
        if (recentResume.fileUrl) {
          resumeFileInfo = {
            fileName: recentResume.originalName || recentResume.filename,
            filePath: recentResume.fileUrl,
            fileSize: recentResume.fileSize
          };
        }
        // Get actual resume content (skills, experience, etc.)
        const recentResumeEducation = recentResume.education || [];
        console.log(`� Processed recent education:`, { recentResumeEducation });
        
        actualResumeData = {
          personalInfo: recentResume.personalInfo,
          summary: recentResume.summary,
          skills: recentResume.skills || [],
          workExperience: recentResume.workExperience || [],
          education: recentResumeEducation
        };
      }
    }

    // Use actual resume data from Resume collection if available, otherwise fall back to submitted data
    const finalResumeData = actualResumeData ? {
      ...enhancedResumeData,
      skills: actualResumeData.skills,
      workExperience: actualResumeData.workExperience,
      education: actualResumeData.education,
      summary: actualResumeData.summary,
      personalInfo: {
        ...enhancedResumeData.personalInfo,
        ...actualResumeData.personalInfo,
        // Ensure name is properly mapped from Resume collection
        name: actualResumeData.personalInfo?.fullName || actualResumeData.personalInfo?.name || enhancedResumeData.personalInfo?.name,
        email: actualResumeData.personalInfo?.email || enhancedResumeData.personalInfo?.email,
        phone: actualResumeData.personalInfo?.phone || enhancedResumeData.personalInfo?.phone,
        address: actualResumeData.personalInfo?.fullAddress || actualResumeData.personalInfo?.address || enhancedResumeData.personalInfo?.address
      }
    } : enhancedResumeData;

    // Ensure education field is always present, even if empty
    if (!finalResumeData.education) {
      finalResumeData.education = [];
    }

    console.log(` Final resume data for application:`, {
      hasEducation: !!finalResumeData.education,
      educationData: finalResumeData.education
    });

    const application = new Application({
      jobId,
      jobSeekerUid: uid,
      employerUid: employerIdentifier,
      resumeData: finalResumeData,
      coverLetter,
      status: 'pending',
      applicantName: finalResumeData.personalInfo.name,
      applicantEmail: finalResumeData.personalInfo.email,
      applicantPhone: finalResumeData.personalInfo.phone || jobSeekerProfile?.phone || '',
      applicantAddress: finalResumeData.personalInfo.address || jobSeekerProfile?.address || '',
      resumeFile: resumeFileInfo
    });

    await application.save();

    // Increment job application count
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { applicationId: application._id, status: application.status, appliedDate: application.appliedDate }
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ success: false, error: 'Failed to submit application', details: error.message });
  }
});

// ------------------ EMPLOYER GET APPLICATIONS ------------------
router.get('/employer', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { status, jobId } = req.query;

    const query = { employerUid: uid };
    if (status) query.status = status;
    if (jobId) query.jobId = jobId;

    const applications = await Application.find(query)
      .populate('jobId', 'title location type salary companyName')
      .sort({ appliedDate: -1 });

    const Resume = require('../models/Resume');
    const User = require('../models/User');
    const JobSeeker = require('../models/JobSeeker');
    
    // Filter out applications from deactivated jobseekers
    const activeApplications = [];
    for (const app of applications) {
      const jobSeeker = await JobSeeker.findOne({ uid: app.jobSeekerUid });
      // Only include applications from active jobseekers
      if (jobSeeker && jobSeeker.isActive) {
        activeApplications.push(app);
      }
    }
    
    const formattedApplications = await Promise.all(activeApplications.map(async (app) => {
      // Try to get fresh resume data from Resume collection
      let currentResumeData = app.resumeData;
      
      // Get fresh resume data from Resume collection FIRST (needed for fallback)
      let latestResume = null;
      try {
        latestResume = await Resume.findOne({
          jobSeekerUid: app.jobSeekerUid,
          isActive: true
        }).sort({ uploadedAt: -1 });
        
        if (latestResume) {
          // Use fresh data from Resume collection
          currentResumeData = {
            ...app.resumeData,
            skills: latestResume.skills || [],
            workExperience: latestResume.workExperience || [],
            education: latestResume.education || [],
            summary: latestResume.summary || '',
            personalInfo: {
              // Prioritize Resume collection data over Application data
              ...latestResume.personalInfo,
              // Handle both name formats (fullName from Resume vs name from Application)
              name: latestResume.personalInfo?.fullName || latestResume.personalInfo?.name || app.resumeData?.personalInfo?.name,
              email: latestResume.personalInfo?.email || app.resumeData?.personalInfo?.email,
              phone: latestResume.personalInfo?.phone || app.resumeData?.personalInfo?.phone,
              address: latestResume.personalInfo?.fullAddress || latestResume.personalInfo?.address || app.resumeData?.personalInfo?.address
            }
          };
        }
      } catch (resumeError) {
        console.log('Could not fetch latest resume for application:', app._id, resumeError);
        // Fall back to stored resume data
      }
      
      // Get profile picture from User model (cloud URLs only)
      let profilePicture = null;
      try {
        const jobSeekerUser = await User.findOne({ uid: app.jobSeekerUid }).select('profilePicture');
        
        if (jobSeekerUser?.profilePicture) {
          // Only accept cloud URLs
          if (jobSeekerUser.profilePicture.startsWith('https://') || jobSeekerUser.profilePicture.startsWith('http://')) {
            profilePicture = jobSeekerUser.profilePicture;
          }
        }
      } catch (userError) {
        // Error fetching profile picture, continue without it
      }
      
      
      return {
        _id: app._id,
        jobId: app.jobId?._id,
        jobTitle: app.jobId?.title,
        jobLocation: app.jobId?.location,
        jobType: app.jobId?.type,
        jobSalary: app.jobId?.salary,
        applicant: {
          name: currentResumeData?.personalInfo?.name || currentResumeData?.personalInfo?.fullName || app.applicantName || 'Unknown Applicant',
          email: currentResumeData?.personalInfo?.email || app.applicantEmail || '',
          phone: currentResumeData?.personalInfo?.phone || app.applicantPhone || '',
          address: currentResumeData?.personalInfo?.address || currentResumeData?.personalInfo?.fullAddress || app.applicantAddress || '',
          profilePicture: profilePicture
        },
        resumeData: currentResumeData,
        status: app.status,
        appliedDate: app.appliedDate,
        coverLetter: app.coverLetter || '',
        notes: app.notes || ''
      };
    }));

    res.json({ success: true, data: formattedApplications });
  } catch (error) {
    console.error('Error fetching employer applications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// ------------------ UPDATE APPLICATION STATUS ------------------
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const { uid } = req.user;

    const application = await Application.findOne({ _id: id, employerUid: uid });
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    application.status = status;
    if (notes) application.notes = notes;
    application.updatedAt = new Date();

    await application.save();

    res.json({
      success: true,
      message: 'Application status updated',
      data: { applicationId: application._id, status: application.status, updatedAt: application.updatedAt }
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ success: false, error: 'Failed to update application status' });
  }
});

// ------------------ SEND INTERVIEW INVITATION EMAIL ------------------
router.post('/:id/send-interview-email', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { customMessage, interviewDetails } = req.body;
    const { uid } = req.user;

    // Find the application
    const application = await Application.findOne({ _id: id, employerUid: uid });
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // Get job details
    const Job = require('../models/Job');
    const job = await Job.findById(application.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Get employer details
    const Employer = require('../models/Employer');
    const employer = await Employer.findOne({ uid });
    if (!employer) {
      return res.status(404).json({ success: false, error: 'Employer not found' });
    }

    // Get jobseeker details
    const JobSeeker = require('../models/JobSeeker');
    const jobSeeker = await JobSeeker.findOne({ uid: application.jobSeekerUid });
    if (!jobSeeker) {
      return res.status(404).json({ success: false, error: 'Job seeker not found' });
    }

    // Get user email
    const User = require('../models/User');
    const user = await User.findOne({ uid: application.jobSeekerUid });
    if (!user || !user.email) {
      return res.status(404).json({ success: false, error: 'Job seeker email not found' });
    }

    // Send interview invitation email
    const emailService = require('../services/emailService');
    const emailResult = await emailService.sendInterviewInvitationEmail(
      user.email,
      jobSeeker.fullName || user.email,
      job.title,
      employer.companyName,
      customMessage,
      interviewDetails,
      employer.email // Pass employer email for BCC and reply-to
    );

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Interview invitation email sent successfully',
        data: { emailSent: true, messageId: emailResult.messageId }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send email',
        details: emailResult.error
      });
    }
  } catch (error) {
    console.error('Error sending interview invitation email:', error);
    res.status(500).json({ success: false, error: 'Failed to send interview invitation email' });
  }
});

// ------------------ JOB SEEKER GET APPLICATIONS ------------------
router.get('/jobseeker', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    if (!uid) return res.status(401).json({ success: false, error: 'User authentication failed' });

    const applications = await Application.find({ jobSeekerUid: uid })
      .populate('jobId', 'title companyName location type salary employerUid')
      .sort({ appliedDate: -1 });

    const Employer = require('../models/Employer');
    const formattedApplications = await Promise.all(
      applications
        .filter((app) => app.jobId)
        .map(async (app) => {
          const job = app.jobId;
          const employer = await Employer.findOne({ uid: job.employerUid }).select(
            'companyName companyDescription industry address contactPerson website email'
          );

          return {
            id: app._id,
            jobId: job._id,
            jobTitle: job.title,
            company: job.companyName || 'Company Name Not Available',
            location: job.location || 'Location Not Available',
            type: job.type || 'Type Not Available',
            salary: job.salary || 'Salary Not Available',
            status: app.status,
            appliedDate: app.appliedDate,
            updatedAt: app.updatedAt,
            companyDetails: {
              name: employer?.companyName || job.companyName,
              description: employer?.companyDescription || `We are ${job.companyName}, a leading company in our industry.`,
              industry: employer?.industry || 'Technology & Services',
              website: employer?.website,
              headquarters:
                employer?.address
                  ? `${employer.address.city || ''}, ${employer.address.province || ''}`.trim().replace(/^,|,$/, '') ||
                    job.location
                  : job.location,
              email: employer?.email || `careers@${job.companyName.toLowerCase().replace(/\s+/g, '')}.com`,
              phone: employer?.contactPerson?.phoneNumber || '+63 2 8123 4567'
            }
          };
        })
    );

    res.json({ success: true, data: formattedApplications });
  } catch (error) {
    console.error('Error fetching job seeker applications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// ------------------ USER GET APPLICATIONS ------------------
router.get('/user', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    if (!uid) return res.status(401).json({ success: false, error: 'User authentication failed' });

    const applications = await Application.find({ jobSeekerUid: uid }).sort({ appliedDate: -1 });
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// ------------------ DOWNLOAD RESUME ------------------
router.get('/:applicationId/resume', verifyToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await Application.findById(applicationId);

    if (!application) return res.status(404).json({ message: 'Application not found' });

    const { uid, role } = req.user;
    const isEmployer = role === 'employer' && application.employerUid === uid;
    const isJobSeeker = application.jobSeekerUid === uid;

    if (!isEmployer && !isJobSeeker) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If employer is trying to access, check if jobseeker account is still active
    if (isEmployer) {
      const JobSeeker = require('../models/JobSeeker');
      const jobSeeker = await JobSeeker.findOne({ uid: application.jobSeekerUid });
      
      if (!jobSeeker || !jobSeeker.isActive) {
        return res.status(404).json({ 
          message: 'Resume not available - jobseeker account is deactivated' 
        });
      }
    }

    console.log('Application found:', application._id);
    console.log('Resume file info:', application.resumeFile);
    
    let resumeFileUrl = application.resumeFile?.filePath;
    if (!resumeFileUrl) {
      console.log('No resume file path in application, checking Resume collection...');
      const Resume = require('../models/Resume');
      const resume = await Resume.findOne({
        $or: [{ jobSeekerUid: application.jobSeekerUid }, { uid: application.jobSeekerUid }],
        isActive: true
      }).sort({ uploadedAt: -1 });

      console.log('Found resume in collection:', resume?._id);
      if (resume?.fileUrl) {
        resumeFileUrl = resume.fileUrl;
        console.log('Using resume fileUrl:', resumeFileUrl);
      }
    }

    if (!resumeFileUrl) {
      console.log('No resume file URL found');
      return res.status(404).json({ message: 'Resume file not found' });
    }

    // Check if file exists on filesystem
    const fs = require('fs');
    const path = require('path');
    
    let filePath;
    if (resumeFileUrl.startsWith('http')) {
      return res.redirect(resumeFileUrl);
    } else if (resumeFileUrl.startsWith('/uploads')) {
      filePath = `.${resumeFileUrl}`;
    } else {
      filePath = `./uploads/resumes/${path.basename(resumeFileUrl)}`;
    }
    
    console.log('Checking file path:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('File does not exist on filesystem, looking for alternative...');
      
      // Try to find any resume file for this user
      const resumesDir = './uploads/resumes/';
      if (fs.existsSync(resumesDir)) {
        const files = fs.readdirSync(resumesDir);
        console.log('Available resume files:', files.slice(-5)); // Show last 5 files
        
        // Find the most recent resume file (by filename timestamp)
        const userResumeFiles = files.filter(file => file.startsWith('resume-') && file.endsWith('.pdf'));
        if (userResumeFiles.length > 0) {
          const latestFile = userResumeFiles.sort().pop();
          console.log('Using latest available resume file:', latestFile);
          const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
          return res.redirect(`${baseUrl}/uploads/resumes/${latestFile}`);
        }
      }
      
      return res.status(404).json({ message: 'Resume file not found on server' });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const staticUrl = resumeFileUrl.startsWith('/uploads')
      ? `${baseUrl}${resumeFileUrl}`
      : `${baseUrl}/uploads/resumes/${path.basename(resumeFileUrl)}`;
    return res.redirect(staticUrl);
  } catch (error) {
    console.error('Error downloading resume:', error);
    console.error('Application ID:', applicationId);
    console.error('Resume file path:', resumeFileUrl);
    res.status(500).json({ message: 'Error downloading resume file' });
  }
});

// ------------------ WITHDRAW APPLICATION ------------------
router.patch('/:id/withdraw', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    if (!uid) {
      return res.status(401).json({ success: false, error: 'User authentication failed' });
    }

    // Find the application
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // Verify that the user owns this application
    if (application.jobSeekerUid !== uid) {
      return res.status(403).json({ success: false, error: 'Access denied. You can only withdraw your own applications.' });
    }

    // Check if application is in a state that can be withdrawn
    if (application.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot withdraw application with status: ${application.status}. Only pending applications can be withdrawn.` 
      });
    }

    // Delete the application from the database
    await Application.findByIdAndDelete(id);

    console.log(`Application ${id} withdrawn and removed by user ${uid}`);

    res.json({ 
      success: true, 
      message: 'Application withdrawn successfully and removed from database',
      applicationId: id
    });

  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error while withdrawing application' 
    });
  }
});

module.exports = router;
