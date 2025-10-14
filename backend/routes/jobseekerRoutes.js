const express = require('express');
const router = express.Router();
const JobSeeker = require('../models/JobSeeker');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const cloudStorageService = require('../services/cloudStorageService');

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit to support multi-page resumes
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Memory storage for profile photo uploads (like user routes)
const memoryStorage = multer.memoryStorage();

const profilePhotoUpload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for profile photos
  }
});

// Separate multer instance for PDF resume uploads
const resumePdfUpload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDF resumes
  }
});

// @route   POST /api/jobseekers/resume-data
// @desc    Save resume data to jobseeker profile
// @access  Private
router.post('/resume-data', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { resumeData } = req.body;

    if (!resumeData) {
      return res.status(400).json({
        success: false,
        error: 'Resume data is required'
      });
    }

    // Find and update jobseeker profile with resume data
    const jobSeeker = await JobSeeker.findOneAndUpdate(
      { uid },
      { 
        resumeData: {
          ...resumeData,
          uploadedAt: new Date()
        }
      },
      { new: true, upsert: false }
    );

    if (!jobSeeker) {
      return res.status(404).json({
        success: false,
        error: 'JobSeeker profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Resume data saved successfully',
      data: {
        resumeData: jobSeeker.resumeData
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: 'Failed to save resume data'
    });
  }
});

// @route   GET /api/jobseekers/profile
// @desc    Get jobseeker profile
// @access  Private
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    // Get user basic info
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get jobseeker profile
    let jobseekerProfile = await JobSeeker.findOne({ uid });
    
    // If no jobseeker profile exists, create one with basic info
    if (!jobseekerProfile) {
      jobseekerProfile = await JobSeeker.create({
        userId: user._id,
        uid: user.uid,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        email: user.email
      });
    }

    res.json({
      success: true,
      data: {
        ...jobseekerProfile.toObject(),
        completionPercentage: jobseekerProfile.getProfileCompletionPercentage()
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get jobseeker profile'
    });
  }
});

// @route   PUT /api/jobseekers/profile
// @desc    Update jobseeker profile
// @access  Private
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const updateData = req.body;

    // Find user and jobseeker profile
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let jobseekerProfile = await JobSeeker.findOne({ uid });
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Jobseeker profile not found'
      });
    }

    // Update basic user info if provided
    const userFields = ['firstName', 'lastName', 'middleName'];
    let userUpdated = false;
    userFields.forEach(field => {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field];
        jobseekerProfile[field] = updateData[field]; // Keep in sync
        userUpdated = true;
      }
    });

    if (userUpdated) {
      await user.save();
    }

    // Update jobseeker-specific fields
    const jobseekerFields = [
      'dateOfBirth', 'gender', 'phoneNumber', 'address', 'jobTitle',
      'skills', 'experience', 'education', 'portfolioUrl', 'linkedInUrl',
      'desiredSalaryMin', 'desiredSalaryMax', 'preferredJobTypes',
      'preferredLocations', 'remoteWork', 'profileVisibility',
      'allowContactFromEmployers'
    ];

    jobseekerFields.forEach(field => {
      if (updateData[field] !== undefined) {
        jobseekerProfile[field] = updateData[field];
      }
    });

    await jobseekerProfile.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...jobseekerProfile.toObject(),
        completionPercentage: jobseekerProfile.getProfileCompletionPercentage()
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update jobseeker profile'
    });
  }
});

// @route   POST /api/jobseekers/resume
// @desc    Upload resume and parse data
// @access  Private
router.post('/resume', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    const { uid } = req.user;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No resume file provided'
      });
    }

    // Find jobseeker profile
    let jobseekerProfile = await JobSeeker.findOne({ uid });
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Jobseeker profile not found'
      });
    }

    // Update resume URL
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    jobseekerProfile.resumeUrl = resumeUrl;

    // Parse resume using NER service
    try {
      const FormData = require('form-data');
      const fetch = require('node-fetch');
      
      const formData = new FormData();
      formData.append('file', require('fs').createReadStream(req.file.path));
      
      const nerResponse = await fetch('http://localhost:5000/extract', {
        method: 'POST',
        body: formData
      });
      
      if (nerResponse.ok) {
        const resumeData = await nerResponse.json();
        
        // Save parsed resume data to database
        jobseekerProfile.resumeData = {
          ...resumeData,
          uploadedAt: new Date()
        };
      }
    } catch (parseError) {      // Continue without parsed data - just save the file URL
    }

    await jobseekerProfile.save();

    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeUrl: resumeUrl,
        resumeData: jobseekerProfile.resumeData
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload resume'
    });
  }
});

// @route   GET /api/jobseekers/resume/view
// @desc    Get resume file for viewing
// @access  Private
router.get('/resume/view', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    // Find jobseeker profile
    const jobseekerProfile = await JobSeeker.findOne({ uid });
    if (!jobseekerProfile || !jobseekerProfile.resumeUrl) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Return the resume URL for frontend to display
    res.json({
      success: true,
      data: {
        resumeUrl: jobseekerProfile.resumeUrl,
        resumeData: jobseekerProfile.resumeData
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get resume'
    });
  }
});

// @route   DELETE /api/jobseekers/resume
// @desc    Delete resume
// @access  Private
router.delete('/resume', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    // Find jobseeker profile
    let jobseekerProfile = await JobSeeker.findOne({ uid });
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Jobseeker profile not found'
      });
    }

    // Remove resume URL
    jobseekerProfile.resumeUrl = null;
    await jobseekerProfile.save();

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete resume'
    });
  }
});

// @route   GET /api/jobseekers/public-profile/:id
// @desc    Get public jobseeker profile (for employers)
// @access  Private
router.get('/public-profile/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const jobseekerProfile = await JobSeeker.findById(id);
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Jobseeker profile not found'
      });
    }

    // Return public profile based on privacy settings
    const publicProfile = jobseekerProfile.getPublicProfile();

    res.json({
      success: true,
      profile: publicProfile
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get public profile'
    });
  }
});

// @route   POST /api/jobseekers/skills
// @desc    Add or update skills
// @access  Private
router.post('/skills', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        error: 'Skills must be an array'
      });
    }

    let jobseekerProfile = await JobSeeker.findOne({ uid });
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Jobseeker profile not found'
      });
    }

    jobseekerProfile.skills = skills;
    await jobseekerProfile.save();

    res.json({
      success: true,
      message: 'Skills updated successfully',
      skills: jobseekerProfile.skills
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update skills'
    });
  }
});

// @route   POST /api/jobseekers/experience
// @desc    Add work experience
// @access  Private
router.post('/experience', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const experienceData = req.body;

    let jobseekerProfile = await JobSeeker.findOne({ uid });
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Jobseeker profile not found'
      });
    }

    jobseekerProfile.experience.push(experienceData);
    await jobseekerProfile.save();

    res.json({
      success: true,
      message: 'Experience added successfully',
      experience: jobseekerProfile.experience
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add experience'
    });
  }
});

// @route   POST /api/jobseekers/education
// @desc    Add education
// @access  Private
router.post('/education', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const educationData = req.body;

    let jobseekerProfile = await JobSeeker.findOne({ uid });
    if (!jobseekerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Jobseeker profile not found'
      });
    }

    jobseekerProfile.education.push(educationData);
    await jobseekerProfile.save();

    res.json({
      success: true,
      message: 'Education added successfully',
      education: jobseekerProfile.education
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add education'
    });
  }
});

// POST /api/jobseekers/upload-profile-photo - Upload profile photo to cloud storage
router.post('/upload-profile-photo', verifyToken, requireRole('jobseeker'), profilePhotoUpload.single('profilePhoto'), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const jobseeker = await JobSeeker.findOne({ uid: req.user.uid });
    
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker profile not found'
      });
    }

    const uploadedFile = req.file;    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No photo was uploaded'
      });
    }    try {
      // Upload to cloud storage using image-specific method
      const cloudResult = await cloudStorageService.uploadImageBuffer(
        uploadedFile.buffer, 
        uploadedFile.originalname, 
        `users/${req.user.uid}/photos`
      );
      
      // Update jobseeker profile with cloud URL
      jobseeker.profilePicture = cloudResult.url;
      jobseeker.profilePicturePublicId = cloudResult.publicId;
      await jobseeker.save();
      
      // Also update User model for employer access
      const user = await User.findOne({ uid: req.user.uid });
      if (user) {
        user.profilePicture = cloudResult.url;
        await user.save();
      }      res.json({
        success: true,
        message: 'Profile photo uploaded successfully to cloud storage',
        data: {
          cloudUrl: cloudResult.url,
          publicId: cloudResult.publicId
        }
      });

    } catch (uploadError) {      return res.status(500).json({
        success: false,
        message: 'Failed to upload photo to cloud storage',
        error: uploadError.message
      });
    }

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error uploading profile photo',
      error: error.message
    });
  }
});

// @route   GET /api/jobseekers/saved-jobs
// @desc    Get user's saved jobs
// @access  Private
router.get('/saved-jobs', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        savedJobs: user.savedJobs || []
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get saved jobs'
    });
  }
});

// @route   POST /api/jobseekers/saved-jobs/:jobId
// @desc    Save/unsave a job
// @access  Private
router.post('/saved-jobs/:jobId', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { jobId } = req.params;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Initialize savedJobs array if it doesn't exist
    if (!user.savedJobs) {
      user.savedJobs = [];
    }

    // Check if job is already saved
    const jobIndex = user.savedJobs.findIndex(savedJob => savedJob.toString() === jobId);
    
    let action = '';
    if (jobIndex > -1) {
      // Job is already saved, remove it
      user.savedJobs.splice(jobIndex, 1);
      action = 'removed';
    } else {
      // Job is not saved, add it
      user.savedJobs.push(jobId);
      action = 'added';
    }

    await user.save();

    res.json({
      success: true,
      message: `Job ${action} successfully`,
      data: {
        action,
        savedJobs: user.savedJobs
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save/unsave job'
    });
  }
});

// @route   POST /api/jobseekers/upload-resume-photo
// @desc    Upload resume photo to cloud storage (separate from profile picture)
// @access  Private
router.post('/upload-resume-photo', verifyToken, profilePhotoUpload.single('resumePhoto'), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const { uid } = req.user;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No resume photo was uploaded'
      });
    }    // Upload to cloud storage using image-specific method
    const cloudResult = await cloudStorageService.uploadImageBuffer(
      uploadedFile.buffer, 
      uploadedFile.originalname, 
      `users/${req.user.uid}/photos`
    );    // Note: We don't update any user profile here - this is just for resume use
    res.json({
      success: true,
      message: 'Resume photo uploaded successfully',
      data: {
        cloudUrl: cloudResult.url,
        publicId: cloudResult.publicId
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload resume photo'
    });
  }
});

// @route   POST /api/jobseekers/upload-original-resume
// @desc    Upload original resume PDF to cloud storage
// @access  Private
router.post('/upload-original-resume', verifyToken, resumePdfUpload.single('originalResume'), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const { uid } = req.user;
    const uploadedFile = req.file;    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No resume file was uploaded'
      });
    }

    // Validate file type
    if (uploadedFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }    // Upload to cloud storage with user-specific folder structure
    const cloudResult = await cloudStorageService.uploadBuffer(
      uploadedFile.buffer, 
      uploadedFile.originalname, 
      `users/${req.user.uid}/resumes/original`,
      'application/pdf'
    );    res.json({
      success: true,
      message: 'Original resume uploaded successfully',
      data: {
        cloudUrl: cloudResult.url,
        publicId: cloudResult.publicId
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload original resume',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
