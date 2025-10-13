const express = require('express');
const router = express.Router();
const Employer = require('../models/Employer');
const EmployerDocument = require('../models/EmployerDocument');
const User = require('../models/User');
const emailService = require('../services/emailService');
const Admin = require('../models/Admin');
const JobSeeker = require('../models/JobSeeker');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Resume = require('../models/Resume');
const { verifyToken } = require('../middleware/authMiddleware');
const { adminMiddleware, superAdminMiddleware } = require('../middleware/adminMiddleware');
const admin = require('../config/firebase');
const pdfReportService = require('../services/pdfReportService');
const xlsxReportService = require('../services/xlsxReportService');
const csvReportService = require('../services/csvReportService');

// Admin login endpoint - Firebase Auth integration
router.post('/login', verifyToken, async (req, res) => {
  try {
    const { uid, email } = req.user; // From Firebase token
    

    // First check Admin collection
    let adminUser = await Admin.findOne({ 
      uid: uid,
      isActive: true
    });

    // If not found in Admin collection, check User collection for backward compatibility
    if (!adminUser) {
      const userAdmin = await User.findOne({ 
        uid: uid,
        role: { $in: ['pesostaff', 'admin'] },
        isActive: true
      });
      
      if (userAdmin) {
        // Migrate user to Admin collection
        adminUser = new Admin({
          uid: userAdmin.uid,
          email: userAdmin.email,
          role: userAdmin.role,
          adminName: userAdmin.adminName,
          adminLevel: userAdmin.adminLevel || userAdmin.role,
          department: userAdmin.department || '',
          isActive: userAdmin.isActive,
          canLogin: userAdmin.canLogin,
          emailVerified: userAdmin.emailVerified,
          registrationStatus: userAdmin.registrationStatus,
          profileComplete: userAdmin.profileComplete,
          permissions: userAdmin.permissions || [],
          lastLogin: userAdmin.lastLogin,
          createdAt: userAdmin.createdAt || new Date()
        });
        await adminUser.save();
      }
    }


    if (!adminUser) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // Update last login
    adminUser.lastLogin = new Date();
    await adminUser.save();

    
    // Return admin data
    res.json({
      success: true,
      admin: {
        uid: adminUser.uid,
        email: adminUser.email,
        role: adminUser.role,
        adminName: adminUser.adminName,
        adminLevel: adminUser.adminLevel,
        department: adminUser.department,
        permissions: adminUser.permissions || []
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during admin login' 
    });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const [
      totalUsers,
      totalEmployers,
      totalJobSeekers,
      totalJobs,
      totalApplications,
      pendingEmployers,
      activeJobs,
      recentApplications
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'employer' }),
      User.countDocuments({ role: 'jobseeker' }),
      Job.countDocuments(),
      Application.countDocuments(),
      Employer.countDocuments({ accountStatus: 'pending' }),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalEmployers,
        totalJobSeekers,
        totalJobs,
        totalApplications,
        pendingEmployers,
        activeJobs,
        recentApplications
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard statistics' 
    });
  }
});

// Get all employers for admin review (with optional status filter)
router.get('/employers', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query; // Optional status filter: 'pending', 'verified', 'rejected'
    
    let query = {};
    if (status && ['pending', 'verified', 'rejected'].includes(status)) {
      query.accountStatus = status;
    }

    const employers = await Employer.find(query)
      .populate('userId', 'email companyName createdAt profilePicture')
      .sort({ createdAt: -1 });

    // Format employers with full company details and documents
    const employersWithFullDetails = employers.map(employer => {
      const profilePicture = employer.profilePicture || employer.userId?.profilePicture;
      console.log(`🏢 Admin API - Employer ${employer._id} profile picture:`, {
        employerProfilePicture: employer.profilePicture,
        userIdProfilePicture: employer.userId?.profilePicture,
        finalProfilePicture: profilePicture,
        companyName: employer.companyName || employer.userId?.companyName
      });
      
      return {
        _id: employer._id,
        userId: employer.userId,
        accountStatus: employer.accountStatus,
        verificationNotes: employer.verificationNotes,
        verifiedAt: employer.verifiedAt,
        // Include profile picture at employer level
        profilePicture: profilePicture,
        // Full company information
        companyDetails: {
          companyName: employer.companyName || employer.userId?.companyName,
          companyDescription: employer.companyDescription,
          industry: employer.industry,
          companySize: employer.companySize,
          foundedYear: employer.foundedYear,
          website: employer.website,
          businessRegistrationNumber: employer.businessRegistrationNumber,
          taxIdentificationNumber: employer.taxIdentificationNumber
        },
        contactPerson: employer.contactPerson || {},
        address: employer.address || {},
        socialMedia: employer.socialMedia || {},
        benefits: employer.benefits || [],
        companyValues: employer.companyValues || [],
        workEnvironment: employer.workEnvironment,
        // Documents and verification
        documents: employer.documents || [],
        documentVerificationStatus: employer.documentVerificationStatus || 'pending',
        documentVerifiedAt: employer.documentVerifiedAt,
        documentRejectionReason: employer.documentRejectionReason,
        // Profile status
        profileComplete: employer.profileComplete,
        isActive: employer.isActive,
        createdAt: employer.createdAt,
        updatedAt: employer.updatedAt
      };
    });

    // Only include employers that have uploaded documents
    const employersWithDocs = employersWithFullDetails.filter(employer => 
      employer.documents && employer.documents.length > 0
    );

    res.json({
      success: true,
      employers: employersWithDocs
    });

  } catch (error) {
    console.error('Employers fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employers' 
    });
  }
});

// Keep the old pending endpoint for backward compatibility
router.get('/employers/pending', verifyToken, adminMiddleware, async (req, res) => {
  try {
    // First, get employers with pending account status
    const pendingEmployers = await Employer.find({ 
      accountStatus: 'pending' 
    }).populate('userId', 'email companyName createdAt profilePicture').sort({ createdAt: -1 });

    // Also get employers who have pending documents (regardless of account status)
    const additionalEmployers = await Employer.find({
      documentVerificationStatus: 'pending',
      accountStatus: { $ne: 'pending' }
    }).populate('userId', 'email companyName createdAt profilePicture').sort({ createdAt: -1 });

    // Combine both lists
    const allEmployers = [...pendingEmployers, ...additionalEmployers];

    // Get documents for each employer (now stored in employer record)
    const employersWithDocuments = allEmployers.map(employer => ({
      ...employer.toObject(),
      documents: employer.documents || [],
      documentVerificationStatus: employer.documentVerificationStatus || 'pending'
    }));

    // Filter out employers with no documents or no pending documents
    const employersNeedingReview = employersWithDocuments.filter(employer => 
      employer.documents && employer.documents.length > 0 && 
      (employer.accountStatus === 'pending' || 
       employer.documentVerificationStatus === 'pending')
    );

    res.json({
      success: true,
      employers: employersNeedingReview
    });

  } catch (error) {
    console.error('Pending employers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching pending employers' 
    });
  }
});

// Verify/reject employer
router.put('/employers/:employerId/verify', verifyToken, adminMiddleware, async (req, res) => {
  try {

    const { employerId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    const employer = await Employer.findById(employerId).populate('userId', 'email uid');
    if (!employer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employer not found' 
      });
    }


    // Update employer status
    employer.accountStatus = action === 'approve' ? 'verified' : 'rejected';
    if (reason) {
      employer.verificationNotes = reason;
    }
    employer.verifiedAt = new Date();
    
    // Skip verifiedBy field for now to avoid ObjectId validation issues
    // employer.verifiedBy = req.user.uid; // Will implement proper admin tracking later

    await employer.save();

    // Update all employer documents to match the employer decision
    const documentUpdateStatus = action === 'approve' ? 'approved' : 'rejected';
    
    try {
      // Update document verification status in employer record
      
      employer.documentVerificationStatus = documentUpdateStatus;
      employer.documentVerifiedAt = new Date();
      
      // Update individual document verification statuses
      if (employer.documents && employer.documents.length > 0) {
        employer.documents.forEach(doc => {
          doc.verificationStatus = documentUpdateStatus;
          doc.verifiedAt = new Date();
          doc.verifiedBy = req.user.uid;
          
          if (action === 'reject') {
            doc.rejectionReason = reason || 'Document rejected during employer verification';
          } else {
            doc.rejectionReason = undefined;
          }
        });
      }
      
      if (action === 'reject') {
        employer.documentRejectionReason = reason || 'Employer verification rejected';
      } else {
        employer.documentRejectionReason = undefined;
      }
      
      
      // Save the employer again with document verification updates
      await employer.save();
      
    } catch (docUpdateError) {
      console.error('❌ Error updating document verification:', docUpdateError);
    }

    // Update user canLogin status
    const userUpdate = await User.findOneAndUpdate(
      { _id: employer.userId._id },
      { 
        canLogin: action === 'approve',
        registrationStatus: action === 'approve' ? 'verified' : 'rejected'
      },
      { new: true }
    );


    // Send email notification
    try {
      const employerEmail = employer.userId?.email;
      const companyName = employer.companyName;
      
      if (employerEmail) {
        
        if (action === 'approve') {
          const emailResult = await emailService.sendEmployerApprovalEmail(employerEmail, companyName);
        } else {
          const emailResult = await emailService.sendEmployerRejectionEmail(employerEmail, companyName, reason);
        }
      } else {
      }
    } catch (emailError) {
      console.error('❌ Error sending email notification:', emailError);
      // Don't fail the entire operation if email fails
    }

    
    res.json({
      success: true,
      message: `Employer ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      employer: {
        _id: employer._id,
        accountStatus: employer.accountStatus,
        canPostJobs: action === 'approve'
      }
    });

  } catch (error) {
    console.error('Employer verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating employer status' 
    });
  }
});

// Get all jobs with management options
router.get('/jobs', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(query)
      .populate('employerUid', 'companyName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Jobs fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching jobs' 
    });
  }
});

// Get all applications for admin dashboard
router.get('/applications', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({})
      .populate('jobId', 'title companyName location type')
      .sort({ appliedDate: -1 });

    // Format applications for admin view
    const formattedApplications = applications.map(app => ({
      _id: app._id,
      id: app._id,
      jobId: app.jobId?._id || app.jobId,
      jobTitle: app.jobId?.title || 'Job Title Not Available',
      companyName: app.jobId?.companyName || 'Company Not Available',
      jobLocation: app.jobId?.location || 'Location Not Available',
      jobType: app.jobId?.type || 'Type Not Available',
      applicantName: app.applicantName || app.resumeData?.personalInfo?.name || 'Unknown Applicant',
      applicantEmail: app.applicantEmail || app.resumeData?.personalInfo?.email || '',
      applicantPhone: app.applicantPhone || app.resumeData?.personalInfo?.phone || '',
      status: app.status,
      appliedDate: app.appliedDate,
      updatedAt: app.updatedAt,
      jobSeekerUid: app.jobSeekerUid,
      employerUid: app.employerUid
    }));

    res.json({
      success: true,
      applications: formattedApplications,
      total: applications.length
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching applications',
      error: error.message
    });
  }
});

// Update job status (activate/deactivate/remove)
router.put('/jobs/:jobId/status', verifyToken, adminMiddleware, async (req, res) => {
  try {
    console.log(`🔧 Admin job status update request - JobID: ${req.params.jobId}, Status: ${req.body.status}`);
    
    const { jobId } = req.params;
    const { status, reason } = req.body;

    console.log(`🔍 Looking for job with ID: ${jobId}`);
    const job = await Job.findById(jobId);
    if (!job) {
      console.log(`❌ Job not found: ${jobId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    console.log(`✅ Job found: ${job.title} - Current status: ${job.status}`);

    // Store original status to check if we need to send email
    const originalStatus = job.status;
    
    job.status = status;
    if (reason) {
      job.adminNotes = reason;
    }
    job.lastModifiedBy = req.user.uid;
    job.updatedAt = new Date();

    console.log(`💾 Saving job with new status: ${status}`);
    await job.save();
    console.log(`✅ Job saved successfully`);

    // Send email notification based on status change
    if (originalStatus !== status) {
      console.log(`📧 Job status changed from ${originalStatus} to ${status}, preparing email notification...`);
      try {
        const emailService = require('../services/emailService');
        
        // Get employer information
        let employerEmail = null;
        let companyName = job.companyName || 'Unknown Company';
        
        console.log(`🔍 Looking for employer info - EmployerUID: ${job.employerUid}, EmployerID: ${job.employerId}`);
        
        if (job.employerUid) {
          // Find employer by UID
          const Employer = require('../models/Employer');
          const employer = await Employer.findOne({ uid: job.employerUid });
          if (employer) {
            employerEmail = employer.email;
            companyName = employer.companyName || job.companyName || 'Unknown Company';
            console.log(`✅ Found employer by UID: ${employerEmail}`);
          } else {
            console.log(`❌ No employer found with UID: ${job.employerUid}`);
          }
        }
        
        // If still no email, try finding by employerId
        if (!employerEmail && job.employerId) {
          const Employer = require('../models/Employer');
          const employer = await Employer.findById(job.employerId);
          if (employer) {
            employerEmail = employer.email;
            companyName = employer.companyName || job.companyName || 'Unknown Company';
            console.log(`✅ Found employer by ID: ${employerEmail}`);
          } else {
            console.log(`❌ No employer found with ID: ${job.employerId}`);
          }
        }
        
        if (employerEmail) {
          console.log(`📤 Sending ${status} email to: ${employerEmail}`);
          
          // Send appropriate email based on status
          if (status === 'removed') {
            await emailService.sendJobRemovalEmail(
              employerEmail,
              companyName || 'Your Company',
              job.title,
              reason
            );
            console.log(`📧 Job removal notification sent to ${employerEmail} for job: ${job.title}`);
          } else if (status === 'paused') {
            await emailService.sendJobPauseEmail(
              employerEmail,
              companyName || 'Your Company',
              job.title,
              reason
            );
            console.log(`📧 Job pause notification sent to ${employerEmail} for job: ${job.title}`);
          } else if (status === 'flagged') {
            await emailService.sendJobFlagEmail(
              employerEmail,
              companyName || 'Your Company',
              job.title,
              reason
            );
            console.log(`📧 Job flag notification sent to ${employerEmail} for job: ${job.title}`);
          }
        } else {
          console.log(`⚠️ Could not send job ${status} email - employer email not found for job: ${job.title}`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending job ${status} email:`, emailError);
        // Don't fail the request if email fails
      }
    }

    console.log(`🎉 Job status update completed successfully`);
    res.json({
      success: true,
      message: `Job status updated to ${status}${status === 'removed' ? '. Employer has been notified.' : ''}`
    });

  } catch (error) {
    console.error('❌ Job status update error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating job status',
      error: error.message
    });
  }
});

// Get user analytics
router.get('/analytics/users', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // User registrations over time
    const userRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            role: "$role"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Job posting trends
    const jobPostings = await Job.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Application trends
    const applications = await Application.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        userRegistrations,
        jobPostings,
        applications,
        period: days
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching analytics data' 
    });
  }
});

// Super admin only: Manage admin users
router.get('/admins', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    
    const admins = await Admin.find({})
      .sort({ createdAt: -1 })
      .select('-__v');


    res.json({
      success: true,
      admins
    });

  } catch (error) {
    console.error('Admin fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching admin users' 
    });
  }
});

// Super admin only: Create new admin
router.post('/admins', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { email, adminName, department, adminLevel, password } = req.body;
    

    // Validate required fields
    if (!email || !adminName || !adminLevel || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, admin name, admin level, and password are required' 
      });
    }

    // Check if email already exists in Admin collection
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin email already exists' 
      });
    }

    // Check if email already exists in User collection
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    let firebaseUser;
    try {
      // Create user in Firebase
      firebaseUser = await admin.auth().createUser({
        email: email.toLowerCase(),
        password: password,
        displayName: adminName,
        emailVerified: true
      });
    } catch (firebaseError) {
      console.error('❌ Firebase user creation failed:', firebaseError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create Firebase user: ' + firebaseError.message 
      });
    }

    try {
      // Create admin user in MongoDB Admin collection
      const adminUser = new Admin({
        uid: firebaseUser.uid,
        email: email.toLowerCase(),
        role: adminLevel,
        adminName,
        adminLevel,
        department: department || '',
        emailVerified: true,
        registrationStatus: 'verified',
        canLogin: true,
        isActive: true,
        profileComplete: true,
        createdBy: req.user.uid,
        createdAt: new Date()
      });

      await adminUser.save();

      res.json({
        success: true,
        message: 'Admin user created successfully',
        admin: {
          uid: adminUser.uid,
          email: adminUser.email,
          role: adminUser.role,
          adminName: adminUser.adminName,
          adminLevel: adminUser.adminLevel,
          department: adminUser.department,
          isActive: adminUser.isActive,
          createdAt: adminUser.createdAt
        }
      });

    } catch (mongoError) {
      console.error('❌ MongoDB admin creation failed:', mongoError);
      
      // Rollback: Delete the Firebase user if MongoDB creation fails
      try {
        await admin.auth().deleteUser(firebaseUser.uid);
      } catch (rollbackError) {
        console.error('❌ Failed to rollback Firebase user:', rollbackError);
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create admin in database: ' + mongoError.message 
      });
    }

  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating admin user: ' + error.message 
    });
  }
});


// Get all pending documents for admin review
router.get('/documents/pending', verifyToken, adminMiddleware, async (req, res) => {
  try {
    // Get all employers with pending documents
    const employersWithPendingDocs = await Employer.find({
      'documents.verificationStatus': 'pending'
    }).populate('userId', 'email companyName profilePicture');

    // Extract all pending documents with employer info
    const pendingDocuments = [];
    
    employersWithPendingDocs.forEach(employer => {
      const pendingDocs = employer.documents.filter(doc => 
        doc.verificationStatus === 'pending'
      );
      
      pendingDocs.forEach(doc => {
        pendingDocuments.push({
          ...doc.toObject(),
          employerInfo: {
            _id: employer._id,
            companyName: employer.companyName || employer.userId?.companyName,
            email: employer.userId?.email,
            profilePicture: employer.profilePicture || employer.userId?.profilePicture
          }
        });
      });
    });

    res.json({
      success: true,
      documents: pendingDocuments
    });

  } catch (error) {
    console.error('Pending documents fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching pending documents' 
    });
  }
});

// Get documents for a specific employer
router.get('/employers/:employerId/documents', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { employerId } = req.params;
    
    const employer = await Employer.findById(employerId);
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    // Debug logging
    console.log(`📄 Fetching documents for employer ${employerId}`);
    console.log(`📄 Found ${employer.documents?.length || 0} documents`);
    
    if (employer.documents && employer.documents.length > 0) {
      employer.documents.forEach((doc, index) => {
        console.log(`📄 Document ${index + 1}:`, {
          name: doc.documentName,
          type: doc.documentType,
          hasCloudUrl: !!doc.cloudUrl,
          cloudUrl: doc.cloudUrl ? `${doc.cloudUrl.substring(0, 50)}...` : 'MISSING',
          verificationStatus: doc.verificationStatus
        });
      });
    }

    res.json({
      success: true,
      documents: employer.documents || []
    });

  } catch (error) {
    console.error('Employer documents fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employer documents' 
    });
  }
});

// Verify/reject individual document
router.put('/documents/:documentId/verify', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { action, reason, adminNotes } = req.body; // action: 'approve' or 'reject'

    const document = await EmployerDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        message: 'Document not found' 
      });
    }

    // Update document status
    document.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    if (reason) {
      document.rejectionReason = reason;
    }
    if (adminNotes) {
      document.adminNotes = adminNotes;
    }
    document.verifiedAt = new Date();
    document.verifiedBy = req.user.uid;

    await document.save();

    // Check if all required documents are approved for this employer
    const allRequiredApproved = await EmployerDocument.areAllRequiredDocumentsApproved(document.employerId);
    
    // If all required documents are approved, update employer status
    if (allRequiredApproved && action === 'approve') {
      const employer = await Employer.findById(document.employerId);
      if (employer && employer.accountStatus === 'pending') {
        employer.accountStatus = 'verified';
        employer.verifiedAt = new Date();
        // employer.verifiedBy = req.user.uid; // Temporarily disabled
        await employer.save();

        // Update user canLogin status
        await User.findOneAndUpdate(
          { uid: employer.userId },
          { 
            canLogin: true,
            registrationStatus: 'verified'
          }
        );
      }
    }

    res.json({
      success: true,
      message: `Document ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      allRequiredApproved
    });

  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating document status' 
    });
  }
});

// Bulk verify documents for an employer
router.put('/employers/:employerId/documents/bulk-verify', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { employerId } = req.params;
    const { documentIds, action, reason } = req.body;

    const updateData = {
      verificationStatus: action === 'approve' ? 'approved' : 'rejected',
      verifiedAt: new Date(),
      // verifiedBy: req.user.uid // Temporarily disabled
    };

    if (reason) {
      updateData.rejectionReason = reason;
    }

    await EmployerDocument.updateMany(
      { 
        _id: { $in: documentIds },
        employerId 
      },
      updateData
    );

    // Check if all required documents are approved
    const allRequiredApproved = await EmployerDocument.areAllRequiredDocumentsApproved(employerId);
    
    if (allRequiredApproved && action === 'approve') {
      const employer = await Employer.findById(employerId);
      if (employer && employer.accountStatus === 'pending') {
        employer.accountStatus = 'verified';
        employer.verifiedAt = new Date();
        // employer.verifiedBy = req.user.uid; // Temporarily disabled
        await employer.save();

        await User.findOneAndUpdate(
          { uid: employer.userId },
          { 
            canLogin: true,
            registrationStatus: 'verified'
          }
        );
      }
    }

    res.json({
      success: true,
      message: `Documents ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      allRequiredApproved
    });

  } catch (error) {
    console.error('Bulk document verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating documents status' 
    });
  }
});

// ===== SUPERADMIN ONLY ROUTES =====

// Get all users (superadmin only)
router.get('/users', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    
    
    // If role is 'admin', fetch from Admin collection
    if (role === 'admin') {
      let query = {};
      if (status && status !== 'all') {
        query.registrationStatus = status;
      }
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { adminName: { $regex: search, $options: 'i' } }
        ];
      }

      const admins = await Admin.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Admin.countDocuments(query);


      return res.json({
        success: true,
        users: admins.map(admin => ({
          _id: admin._id,
          uid: admin.uid,
          email: admin.email,
          role: admin.role,
          adminName: admin.adminName,
          adminLevel: admin.adminLevel,
          department: admin.department,
          registrationStatus: admin.registrationStatus,
          isActive: admin.isActive,
          canLogin: admin.canLogin,
          emailVerified: admin.emailVerified,
          createdAt: admin.createdAt,
          lastLogin: admin.lastLogin
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }
    
    // For other roles, fetch from User collection
    let query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    if (status && status !== 'all') {
      query.registrationStatus = status;
    }
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { adminName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);


    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        uid: user.uid,
        email: user.email,
        role: user.role,
        adminName: user.adminName,
        adminLevel: user.adminLevel,
        department: user.department,
        registrationStatus: user.registrationStatus,
        isActive: user.isActive,
        canLogin: user.canLogin,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

// Update user status/role (superadmin only)
router.put('/users/:userId', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive, canLogin, registrationStatus, adminLevel, department, adminName, status } = req.body;

    console.log(`🔧 Admin user status update request - UserID: ${userId}, Status: ${status || 'N/A'}`);
    console.log('📦 Full request body:', req.body);

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (canLogin !== undefined) updateData.canLogin = canLogin;
    if (registrationStatus !== undefined) updateData.registrationStatus = registrationStatus;
    if (adminLevel !== undefined) updateData.adminLevel = adminLevel;
    if (department !== undefined) updateData.department = department;
    if (adminName !== undefined) updateData.adminName = adminName;
    if (status !== undefined) {
      updateData.status = status;
      // Set suspension timestamp when suspending
      if (status === 'inactive') {
        updateData.suspendedAt = new Date();
      }
      // Clear suspension timestamp when reactivating
      if (status === 'active') {
        updateData.suspendedAt = null;
      }
    }

    console.log('🔄 Update data prepared:', updateData);

    // Store original user data for email notification
    let originalUser = null;

    // Try to find user first to get original data
    originalUser = await Admin.findOne({ uid: userId });
    if (!originalUser) {
      originalUser = await User.findOne({ uid: userId });
    }

    if (!originalUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ User found: ${originalUser.email} - Current status: ${originalUser.status || 'active'}`);

    // Try to update in Admin collection first
    console.log(`🔍 Searching Admin collection for uid: ${userId}`);
    let user = await Admin.findOneAndUpdate(
      { uid: userId },
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log(`🔍 Admin collection result:`, user ? 'Found and updated' : 'Not found');

    // If not found in Admin collection, try User collection
    if (!user) {
      console.log(`🔍 Searching User collection for uid: ${userId}`);
      user = await User.findOneAndUpdate(
        { uid: userId },
        updateData,
        { new: true, runValidators: true }
      );
      console.log(`🔍 User collection result:`, user ? 'Found and updated' : 'Not found');
      
      if (user) {
        console.log(`📋 Updated user data:`, {
          uid: user.uid,
          email: user.email,
          role: user.role,
          status: user.status,
          firstName: user.firstName,
          lastName: user.lastName
        });
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`💾 User updated successfully with new status: ${user.status || 'active'}`);

    // Send email notification for jobseeker status changes
    const originalStatus = originalUser.status || 'active';
    const newStatus = user.status || 'active';
    
    // For suspension, always send email if suspendedAt was updated (even if status didn't change)
    const wasSuspended = updateData.suspendedAt !== undefined;
    const shouldSendEmail = (originalStatus !== newStatus || wasSuspended) && user.role === 'jobseeker';
    
    console.log(`🔍 Email notification check:`, {
      originalStatus,
      newStatus,
      userRole: user.role,
      statusChanged: originalStatus !== newStatus,
      wasSuspended,
      isJobseeker: user.role === 'jobseeker',
      shouldSendEmail
    });
    
    if (shouldSendEmail) {
      console.log(`📧 Jobseeker status changed from ${originalStatus} to ${newStatus}, preparing email notification...`);
      
      try {
        const emailService = require('../services/emailService');
        const userEmail = user.email;
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        
        console.log(`📤 Sending ${newStatus} email to: ${userEmail}`);
        
        if (newStatus === 'removed') {
          await emailService.sendJobseekerRemovalEmail(
            userEmail,
            userName,
            'Your account has been removed by the administrator for policy compliance or security reasons.'
          );
          console.log(`📧 Jobseeker removal notification sent to ${userEmail}`);
        } else if (newStatus === 'inactive') {
          await emailService.sendJobseekerSuspensionEmail(
            userEmail,
            userName,
            'Your account has been suspended due to inactivity (no login for over 1 year). Simply log in to reactivate.'
          );
          console.log(`📧 Jobseeker suspension notification sent to ${userEmail}`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending jobseeker ${newStatus} email:`, emailError);
        // Don't fail the request if email fails
      }
    }

    console.log(`🎉 User status update completed successfully`);

    res.json({
      success: true,
      message: `User updated successfully${newStatus !== originalStatus && user.role === 'jobseeker' ? '. User has been notified via email.' : ''}`,
      user: {
        _id: user._id,
        uid: user.uid,
        email: user.email,
        role: user.role,
        adminName: user.adminName,
        adminLevel: user.adminLevel,
        department: user.department,
        isActive: user.isActive,
        canLogin: user.canLogin,
        registrationStatus: user.registrationStatus,
        status: user.status
      }
    });

  } catch (error) {
    console.error('❌ User update error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating user',
      error: error.message
    });
  }
});

// Delete user (superadmin only)
router.delete('/users/:userId', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;


    // Try to find in Admin collection first
    let user = await Admin.findById(userId);
    let isAdminCollection = true;

    // If not found in Admin collection, try User collection
    if (!user) {
      user = await User.findById(userId);
      isAdminCollection = false;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting the current superadmin
    if (user.uid === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete from Firebase if it's an admin user
    if (isAdminCollection) {
      try {
        await admin.auth().deleteUser(user.uid);
      } catch (firebaseError) {
        console.error('⚠️ Firebase deletion failed:', firebaseError.message);
        // Continue with MongoDB deletion even if Firebase fails
      }
    }

    // Delete from MongoDB
    if (isAdminCollection) {
      await Admin.findByIdAndDelete(userId);
    } else {
      await User.findByIdAndDelete(userId);
    }


    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting user' 
    });
  }
});

// Get system analytics (superadmin only)
router.get('/analytics/system', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalEmployers,
      totalJobSeekers,
      totalJobs,
      totalApplications,
      pendingDocuments,
      verifiedEmployers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $in: ['pesostaff', 'admin'] } }),
      Employer.countDocuments(),
      JobSeeker.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
      EmployerDocument.countDocuments({ verificationStatus: 'pending' }),
      Employer.countDocuments({ accountStatus: 'verified' })
    ]);

    res.json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          admins: totalAdmins,
          employers: totalEmployers,
          jobSeekers: totalJobSeekers
        },
        jobs: {
          total: totalJobs
        },
        applications: {
          total: totalApplications
        },
        documents: {
          pending: pendingDocuments
        },
        employers: {
          verified: verifiedEmployers
        }
      }
    });

  } catch (error) {
    console.error('System analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching system analytics' 
    });
  }
});

// Report Generation Endpoints
router.post('/reports/generate', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { reportType, startDate, endDate, format, includeDetails } = req.body;
    
    
    let reportData = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date
    
    switch (reportType) {
      case 'registered-jobseekers':
        // Registered Jobseekers Report - Total registered jobseekers, demographics, profile completeness, and activity status
        const [totalJobseekers, activeJobseekers, profileCompleteJobseekers, jobseekersWithResumes, jobseekersByGender, jobseekersByAge] = await Promise.all([
          JobSeeker.countDocuments({ createdAt: { $gte: start, $lte: end } }),
          JobSeeker.countDocuments({ 
            isActive: true, 
            createdAt: { $gte: start, $lte: end } 
          }),
          JobSeeker.countDocuments({ 
            profileComplete: true,
            createdAt: { $gte: start, $lte: end } 
          }),
          JobSeeker.countDocuments({ 
            currentResumeId: { $exists: true, $ne: null },
            createdAt: { $gte: start, $lte: end } 
          }),
          JobSeeker.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$gender', count: { $sum: 1 } } }
          ]),
          JobSeeker.aggregate([
            { $match: { 
              createdAt: { $gte: start, $lte: end },
              dateOfBirth: { $exists: true, $ne: null }
            }},
            { 
              $addFields: {
                age: {
                  $floor: {
                    $divide: [
                      { $subtract: [new Date(), '$dateOfBirth'] },
                      365.25 * 24 * 60 * 60 * 1000
                    ]
                  }
                }
              }
            },
            {
              $group: {
                _id: {
                  $switch: {
                    branches: [
                      { case: { $lt: ['$age', 25] }, then: '18-24' },
                      { case: { $lt: ['$age', 35] }, then: '25-34' },
                      { case: { $lt: ['$age', 45] }, then: '35-44' },
                      { case: { $lt: ['$age', 55] }, then: '45-54' }
                    ],
                    default: '55+'
                  }
                },
                count: { $sum: 1 }
              }
            }
          ])
        ]);
        
        reportData = {
          summary: { 
            totalJobseekers, 
            activeJobseekers, 
            profileCompleteJobseekers,
            jobseekersWithResumes,
            profileCompletionRate: totalJobseekers > 0 ? ((profileCompleteJobseekers / totalJobseekers) * 100).toFixed(2) : 0,
            activityRate: totalJobseekers > 0 ? ((activeJobseekers / totalJobseekers) * 100).toFixed(2) : 0,
            resumeUploadRate: totalJobseekers > 0 ? ((jobseekersWithResumes / totalJobseekers) * 100).toFixed(2) : 0
          },
          demographics: {
            byGender: jobseekersByGender,
            byAge: jobseekersByAge
          },
          registrationTrends: await JobSeeker.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
          ]),
          details: includeDetails ? await JobSeeker.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
              $lookup: {
                from: 'applications',
                localField: '_id',
                foreignField: 'jobSeekerId',
                as: 'applications'
              }
            },
            {
              $lookup: {
                from: 'resumes',
                localField: '_id',
                foreignField: 'jobSeekerId',
                as: 'resume'
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userId'
              }
            },
            { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$resume', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                email: 1,
                firstName: 1,
                lastName: 1,
                phoneNumber: { 
                  $ifNull: ['$phoneNumber', '$resume.personalInfo.phone'] 
                },
                dateOfBirth: { 
                  $ifNull: ['$dateOfBirth', '$resume.personalInfo.birthday'] 
                },
                createdAt: 1,
                isActive: 1,
                applications: { $size: '$applications' },
                'userId.lastLoginAt': 1
              }
            }
          ]) : []
        };
        break;

      case 'employers-companies':
        // Employers/Companies Report - Registered employers, company profiles, verification status, and activity metrics
        const [totalEmployers, verifiedEmployers, pendingEmployers, rejectedEmployers, activeEmployers, employersByIndustry] = await Promise.all([
          User.countDocuments({ role: 'employer', createdAt: { $gte: start, $lte: end } }),
          Employer.countDocuments({ 
            accountStatus: 'verified',
            verifiedAt: { $gte: start, $lte: end }
          }),
          Employer.countDocuments({ 
            accountStatus: 'pending',
            createdAt: { $gte: start, $lte: end }
          }),
          Employer.countDocuments({ 
            accountStatus: 'rejected',
            updatedAt: { $gte: start, $lte: end }
          }),
          User.countDocuments({ 
            role: 'employer', 
            isActive: true, 
            lastLoginAt: { $gte: start, $lte: end } 
          }),
          Employer.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$industry', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ])
        ]);
        
        reportData = {
          summary: { 
            totalEmployers,
            verifiedEmployers, 
            pendingEmployers,
            rejectedEmployers,
            activeEmployers,
            verificationRate: totalEmployers > 0 ? ((verifiedEmployers / totalEmployers) * 100).toFixed(2) : 0,
            activityRate: totalEmployers > 0 ? ((activeEmployers / totalEmployers) * 100).toFixed(2) : 0
          },
          industryDistribution: employersByIndustry,
          registrationTrends: await User.aggregate([
            { $match: { role: 'employer', createdAt: { $gte: start, $lte: end } } },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
          ]),
          details: includeDetails ? await Employer.find({
            createdAt: { $gte: start, $lte: end }
          }).populate('userId', 'email isActive lastLoginAt').select('companyName industry accountStatus verifiedAt createdAt') : []
        };
        break;

      case 'job-demand-analytics':
        const jobDemandData = await Job.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          {
            $lookup: {
              from: 'applications',
              localField: '_id',
              foreignField: 'jobId',
              as: 'applications'
            }
          },
          {
            $group: {
              _id: { 
                title: '$title',
                department: { $ifNull: ['$department', 'Other'] }
              },
              totalPostings: { $sum: 1 },
              totalApplications: { $sum: { $size: '$applications' } },
              avgApplicationsPerJob: { $avg: { $size: '$applications' } }
            }
          },
          { $sort: { totalApplications: -1 } },
          { $limit: 20 }
        ]);
        
        const jobPostingsCount = await Job.countDocuments({ createdAt: { $gte: start, $lte: end } });

        reportData = {
          summary: { 
            totalJobCategories: jobDemandData.length,
            mostDemandedJob: jobDemandData[0]?._id?.title || 'N/A',
            totalJobPostings: jobPostingsCount,
            totalApplications: jobDemandData.reduce((sum, job) => sum + job.totalApplications, 0),
            avgApplicationsPerJob: jobDemandData.length > 0 ? (jobDemandData.reduce((sum, job) => sum + job.avgApplicationsPerJob, 0) / jobDemandData.length).toFixed(2) : 0
          },
          jobDemandTrends: jobDemandData,
          industryTrends: await Job.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]),
          details: includeDetails ? await Job.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
              $lookup: {
                from: 'applications',
                localField: '_id',
                foreignField: 'jobId',
                as: 'applications'
              }
            },
            {
              $project: {
                title: 1,
                companyName: 1,
                totalApplications: { $size: '$applications' },
                createdAt: 1
              }
            },
            { $sort: { totalApplications: -1, createdAt: -1 } }
          ]) : []
        };
        break;

      case 'job-postings':
        // Job Postings Report - All job postings with status, categories, salary ranges, and success rates
        const [totalJobPostings, activeJobPostings, expiredJobPostings, jobsByStatus, jobsByDepartment, avgSalaryByDept] = await Promise.all([
          Job.countDocuments({ createdAt: { $gte: start, $lte: end } }),
          Job.countDocuments({ status: 'active', createdAt: { $gte: start, $lte: end } }),
          Job.countDocuments({ status: 'expired', createdAt: { $gte: start, $lte: end } }),
          Job.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ]),
          Job.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]),
          Job.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end }, salary: { $exists: true, $ne: null } } },
            { $group: { _id: '$department', avgSalary: { $avg: '$salary' }, jobCount: { $sum: 1 } } },
            { $sort: { avgSalary: -1 } }
          ])
        ]);

        const jobSuccessRates = await Job.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          {
            $lookup: {
              from: 'applications',
              localField: '_id',
              foreignField: 'jobId',
              as: 'applications'
            }
          },
          {
            $addFields: {
              applicationCount: { $size: '$applications' },
              hiredCount: {
                $size: {
                  $filter: {
                    input: '$applications',
                    cond: { $eq: ['$$this.status', 'hired'] }
                  }
                }
              }
            }
          },
          {
            $group: {
              _id: '$department',
              totalJobs: { $sum: 1 },
              totalApplications: { $sum: '$applicationCount' },
              totalHired: { $sum: '$hiredCount' },
              avgApplicationsPerJob: { $avg: '$applicationCount' },
              successRate: { 
                $avg: { 
                  $cond: [
                    { $gt: ['$applicationCount', 0] },
                    { $multiply: [{ $divide: ['$hiredCount', '$applicationCount'] }, 100] },
                    0
                  ]
                }
              }
            }
          }
        ]);

        reportData = {
          summary: {
            totalJobs: totalJobPostings,
            activeJobs: activeJobPostings,
            expiredJobs: expiredJobPostings,
            jobFillRate: totalJobPostings > 0 ? ((activeJobPostings / totalJobPostings) * 100).toFixed(2) : 0,
            mostPopularDepartment: jobsByDepartment[0]?._id || 'N/A',
            highestPayingDepartment: avgSalaryByDept[0]?._id || 'N/A'
          },
          statusDistribution: jobsByStatus,
          departmentDistribution: jobsByDepartment,
          salaryAnalytics: avgSalaryByDept,
          successRates: jobSuccessRates,
          postingTrends: await Job.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
          ]),
          details: includeDetails ? await Job.find({
            createdAt: { $gte: start, $lte: end }
          }).select('title companyName department status salary createdAt expiryDate') : []
        };
        break;

        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }
    
    // Add metadata
    const finalReportData = {
      reportMetadata: {
        reportType,
        startDate,
        endDate,
        format,
        includeDetails,
        generatedAt: new Date(),
        generatedBy: req.user.email
      },
      data: reportData
    };
    
    // Handle PDF generation
    if (format === 'pdf') {
      try {
        console.log('Starting PDF generation for report type:', reportType);
        const reportName = getReportDisplayName(reportType);
        console.log('Report name:', reportName);
        
        const pdfBuffer = await pdfReportService.generateReportPDF(finalReportData, reportName);
        console.log('PDF buffer generated, size:', pdfBuffer.length, 'bytes');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${reportName}_${startDate}_to_${endDate}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        console.log('Sending PDF buffer to client');
        return res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        console.error('Error stack:', pdfError.stack);
        // Fallback to JSON response if PDF generation fails
        return res.json({
          success: true,
          report: finalReportData,
          message: 'Report generated successfully (PDF generation failed, returning JSON)',
          pdfError: pdfError.message,
          errorStack: pdfError.stack
        });
      }
    }
    
    // Handle XLSX generation
    if (format === 'xlsx') {
      try {
        const reportName = getReportDisplayName(reportType);
        const xlsxBuffer = xlsxReportService.generateReportXLSX(finalReportData, reportName);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${reportName}_${startDate}_to_${endDate}.xlsx"`);
        res.setHeader('Content-Length', xlsxBuffer.length);
        
        return res.send(xlsxBuffer);
      } catch (xlsxError) {
        console.error('XLSX generation error:', xlsxError);
        // Fallback to JSON response if XLSX generation fails
        return res.json({
          success: true,
          report: finalReportData,
          message: 'Report generated successfully (XLSX generation failed, returning JSON)',
          xlsxError: xlsxError.message
        });
      }
    }
    
    // Handle CSV generation
    if (format === 'csv') {
      try {
        const reportName = getReportDisplayName(reportType);
        const csvBuffer = csvReportService.generateReportCSV(finalReportData, reportName);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${reportName}_${startDate}_to_${endDate}.csv"`);
        res.setHeader('Content-Length', csvBuffer.length);
        
        return res.send(csvBuffer);
      } catch (csvError) {
        console.error('CSV generation error:', csvError);
        // Fallback to JSON response if CSV generation fails
        return res.json({
          success: true,
          report: finalReportData,
          message: 'Report generated successfully (CSV generation failed, returning JSON)',
          csvError: csvError.message
        });
      }
    }
    
    res.json({
      success: true,
      report: finalReportData,
      message: 'Report generated successfully'
    });
    
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
});

// Helper function to get report display names
function getReportDisplayName(reportType) {
  const displayNames = {
    'registered-jobseekers': 'Registered Jobseekers Report',
    'employers-companies': 'Employers Companies Report',
    'job-postings': 'Job Postings Report',
    'job-demand-analytics': 'Job Demand Analytics Report'
  };
  
  return displayNames[reportType] || reportType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Get report history (for future implementation)
router.get('/reports/history', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    // For now, return empty array - can be implemented with a Reports collection later
    res.json({
      success: true,
      reports: [],
      message: 'Report history retrieved successfully'
    });
  } catch (error) {
    console.error('Report history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report history'
    });
  }
});

// Helper function to get report display names
function getReportDisplayName(reportType) {
  const displayNames = {
    // New dashboard-aligned reports
    'dashboard-overview': 'Dashboard Overview Report',
    'employer-verification': 'Employer Verification Report',
    'employer-documents': 'Employer Documents Report',
    'job-postings': 'Job Postings Report',
    'job-demand-analytics': 'Job Demand Analytics Report',
    'jobseekers-summary': 'Jobseekers Summary Report',
    'jobseeker-resumes': 'Resume Analytics Report',
    'compliance-overview': 'Compliance Overview Report',
    'admin-activity': 'Admin Activity Report',
    'admin-permissions': 'Admin Permissions Report',
    'system-health': 'System Health Report',
    'system-settings': 'System Configuration Report',
    
    // Legacy reports (kept for backward compatibility)
    'user-summary': 'User Summary Report',
    'user-registration': 'User Registration Trends',
    'user-activity': 'User Activity Analysis',
    'job-performance': 'Job Performance Metrics',
    'employer-activity': 'Employer Activity Report',
    'application-summary': 'Application Summary',
    'application-trends': 'Application Trends Analysis',
    'verification-report': 'Verification Status Report',
    'platform-analytics': 'Platform Analytics',
    'revenue-analytics': 'Revenue Analytics'
  };
  
  return displayNames[reportType] || reportType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Bulk report generation endpoint
router.post('/reports/generate-all', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, format, includeDetails } = req.body;
    
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const reportTypes = [
      'dashboard-overview',
      'employer-verification',
      'employer-documents',
      'job-postings',
      'job-demand-analytics',
      'jobseekers-summary',
      'jobseeker-resumes',
      'compliance-overview',
      'admin-activity',
      'admin-permissions',
      'system-health',
      'system-settings'
    ];
    
    const allReports = [];
    const failedReports = [];
    
    // Generate all reports in parallel for better performance
    const reportPromises = reportTypes.map(async (reportType) => {
      try {
        let reportData = {};
        
        switch (reportType) {
          case 'user-summary':
            const [totalUsers, jobseekers, employers, activeUsers] = await Promise.all([
              User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              User.countDocuments({ role: 'jobseeker', createdAt: { $gte: start, $lte: end } }),
              User.countDocuments({ role: 'employer', createdAt: { $gte: start, $lte: end } }),
              User.countDocuments({ 
                isActive: true, 
                lastLoginAt: { $gte: start, $lte: end } 
              })
            ]);
            
            reportData = {
              summary: { totalUsers, jobseekers, employers, activeUsers },
              details: includeDetails ? await User.find({ 
                createdAt: { $gte: start, $lte: end } 
              }).select('email role createdAt isActive lastLoginAt') : []
            };
            break;
            
          case 'job-postings':
            const [totalJobs, activeJobs, expiredJobs] = await Promise.all([
              Job.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              Job.countDocuments({ 
                status: 'active', 
                createdAt: { $gte: start, $lte: end } 
              }),
              Job.countDocuments({ 
                status: 'expired', 
                createdAt: { $gte: start, $lte: end } 
              })
            ]);
            
            reportData = {
              summary: { totalJobs, activeJobs, expiredJobs },
              details: includeDetails ? await Job.find({ 
                createdAt: { $gte: start, $lte: end } 
              }).populate('employerUid', 'email companyName') : []
            };
            break;
            
          case 'application-summary':
            const [totalApplications, pendingApps, acceptedApps, rejectedApps] = await Promise.all([
              Application.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              Application.countDocuments({ 
                status: 'pending', 
                createdAt: { $gte: start, $lte: end } 
              }),
              Application.countDocuments({ 
                status: 'accepted', 
                createdAt: { $gte: start, $lte: end } 
              }),
              Application.countDocuments({ 
                status: 'rejected', 
                createdAt: { $gte: start, $lte: end } 
              })
            ]);
            
            reportData = {
              summary: { totalApplications, pendingApps, acceptedApps, rejectedApps },
              details: includeDetails ? await Application.find({ 
                createdAt: { $gte: start, $lte: end } 
              }).populate('jobId', 'title').populate('jobseekerId', 'email') : []
            };
            break;
            
          case 'system-health':
            const systemStats = await Promise.all([
              User.countDocuments(),
              Job.countDocuments(),
              Application.countDocuments(),
              Employer.countDocuments({ accountStatus: 'pending' })
            ]);
            
            reportData = {
              summary: {
                totalUsers: systemStats[0],
                totalJobs: systemStats[1],
                totalApplications: systemStats[2],
                pendingVerifications: systemStats[3],
                systemUptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                generatedAt: new Date()
              }
            };
            break;
            
          // Add other report types with basic data
          default:
            reportData = {
              summary: { message: `${reportType} report - basic implementation` },
              details: []
            };
        }
        
        return {
          reportType,
          reportMetadata: {
            reportType,
            startDate,
            endDate,
            format,
            includeDetails,
            generatedAt: new Date(),
            generatedBy: req.user.email
          },
          data: reportData
        };
        
      } catch (error) {
        console.error(`Error generating ${reportType}:`, error);
        failedReports.push(reportType);
        return null;
      }
    });
    
    // Wait for all reports to complete
    const results = await Promise.all(reportPromises);
    const successfulReports = results.filter(report => report !== null);
    
    const response = {
      metadata: {
        generatedAt: new Date(),
        dateRange: `${startDate} to ${endDate}`,
        totalReports: successfulReports.length,
        failedReports: failedReports.length,
        generatedBy: req.user.email,
        format
      },
      reports: successfulReports,
      failedReports
    };
    
    // Handle PDF generation for bulk reports
    if (format === 'pdf') {
      try {
        const pdfBuffer = await pdfReportService.generateBulkReportsPDF(response);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="All_Reports_${startDate}_to_${endDate}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        return res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('Bulk PDF generation error:', pdfError);
        // Fallback to JSON response if PDF generation fails
        return res.json({
          success: true,
          data: response,
          message: `Generated ${successfulReports.length} reports successfully (PDF generation failed, returning JSON)`,
          pdfError: pdfError.message
        });
      }
    }
    
    // Handle XLSX generation for bulk reports
    if (format === 'xlsx') {
      try {
        const xlsxBuffer = xlsxReportService.generateBulkReportsXLSX(response);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="All_Reports_${startDate}_to_${endDate}.xlsx"`);
        res.setHeader('Content-Length', xlsxBuffer.length);
        
        return res.send(xlsxBuffer);
      } catch (xlsxError) {
        console.error('Bulk XLSX generation error:', xlsxError);
        // Fallback to JSON response if XLSX generation fails
        return res.json({
          success: true,
          data: response,
          message: `Generated ${successfulReports.length} reports successfully (XLSX generation failed, returning JSON)`,
          xlsxError: xlsxError.message
        });
      }
    }
    
    res.json({
      success: true,
      data: response,
      message: `Generated ${successfulReports.length} reports successfully`
    });
    
  } catch (error) {
    console.error('Bulk report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating bulk reports'
    });
  }
});

// Get all jobseekers for admin dashboard
router.get('/jobseekers/all', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const jobseekers = await JobSeeker.find({})
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      jobseekers: jobseekers,
      total: jobseekers.length
    });

  } catch (error) {
    console.error('Error fetching jobseekers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching jobseekers',
      error: error.message
    });
  }
});

// Get jobseeker users for admin dashboard (admin-accessible alternative to /users endpoint)
router.get('/jobseekers/users', verifyToken, adminMiddleware, async (req, res) => {
  try {
    // Get users with jobseeker role from User collection
    const jobseekerUsers = await User.find({ 
      role: 'jobseeker' 
    })
    .select('uid firstName lastName email phone createdAt updatedAt lastLoginAt isActive disabled status')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      users: jobseekerUsers,
      total: jobseekerUsers.length
    });

  } catch (error) {
    console.error('Error fetching jobseeker users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching jobseeker users',
      error: error.message
    });
  }
});

// Get all resumes for admin dashboard
router.get('/resumes/all', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const resumes = await Resume.find({})
      .sort({ createdAt: -1 });

    // Format resumes for admin view
    const formattedResumes = resumes.map(resume => ({
      _id: resume._id,
      jobSeekerUid: resume.jobSeekerUid,
      jobSeekerId: resume.jobSeekerId,
      filename: resume.filename,
      originalName: resume.originalName,
      personalInfo: resume.personalInfo,
      skills: resume.skills,
      workExperience: resume.workExperience,
      education: resume.education,
      summary: resume.summary,
      processingStatus: resume.processingStatus,
      isActive: resume.isActive,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    }));

    res.json({
      success: true,
      resumes: formattedResumes,
      total: resumes.length
    });

  } catch (error) {
    console.error('Error fetching all resumes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching resumes',
      error: error.message
    });
  }
});

// Get job demand analytics
router.get('/job-demand-analytics', verifyToken, adminMiddleware, async (req, res) => {
  try {

    // Get all jobs with their application counts
    const jobs = await Job.aggregate([
      {
        $match: {
          status: { $in: ['active', 'paused', 'closed'] }
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'jobId',
          as: 'applications'
        }
      },
      {
        $addFields: {
          totalApplicants: { $size: '$applications' },
          activeJobs: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          },
          filledJobs: {
            $cond: [{ $eq: ['$status', 'closed'] }, 1, 0]
          }
        }
      },
      {
        $group: {
          _id: {
            title: '$title',
            department: { $ifNull: ['$department', 'other'] }
          },
          totalPostings: { $sum: 1 },
          totalApplicants: { $sum: '$totalApplicants' },
          activeJobs: { $sum: '$activeJobs' },
          filledJobs: { $sum: '$filledJobs' },
          averageSalary: { $avg: '$salaryMin' },
          postedDates: { $push: '$postedDate' },
          viewCounts: { $push: '$viewCount' }
        }
      },
      {
        $addFields: {
          averageApplicantsPerJob: {
            $cond: [
              { $eq: ['$totalPostings', 0] },
              0,
              { $divide: ['$totalApplicants', '$totalPostings'] }
            ]
          },
          // Calculate time to fill (simplified - average days since posting for filled jobs)
          timeToFill: {
            $cond: [
              { $eq: ['$filledJobs', 0] },
              30, // Default 30 days if no filled jobs
              {
                $divide: [
                  {
                    $reduce: {
                      input: '$postedDates',
                      initialValue: 0,
                      in: {
                        $add: [
                          '$$value',
                          {
                            $divide: [
                              { $subtract: [new Date(), '$$this'] },
                              1000 * 60 * 60 * 24 // Convert to days
                            ]
                          }
                        ]
                      }
                    }
                  },
                  { $size: '$postedDates' }
                ]
              }
            ]
          }
        }
      },
      {
        $project: {
          jobTitle: '$_id.title',
          category: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$_id.title', regex: /software|developer|programming|web|app|tech|IT|data|analyst|engineer/i } }, then: 'technology' },
                { case: { $regexMatch: { input: '$_id.title', regex: /nurse|doctor|medical|health|care|hospital|clinic/i } }, then: 'healthcare' },
                { case: { $regexMatch: { input: '$_id.title', regex: /accountant|finance|banking|audit|financial/i } }, then: 'finance' },
                { case: { $regexMatch: { input: '$_id.title', regex: /teacher|education|instructor|professor|tutor/i } }, then: 'education' },
                { case: { $regexMatch: { input: '$_id.title', regex: /marketing|digital|social media|seo|content|brand/i } }, then: 'marketing' },
                { case: { $regexMatch: { input: '$_id.title', regex: /sales|representative|agent|business development/i } }, then: 'sales' },
                { case: { $regexMatch: { input: '$_id.title', regex: /engineer|mechanical|electrical|civil|chemical/i } }, then: 'engineering' }
              ],
              default: 'other'
            }
          },
          totalPostings: 1,
          totalApplicants: 1,
          averageApplicantsPerJob: { $round: ['$averageApplicantsPerJob', 1] },
          activeJobs: 1,
          filledJobs: 1,
          averageSalary: { $round: ['$averageSalary', 0] },
          timeToFill: { $round: ['$timeToFill', 0] }
        }
      },
      {
        $addFields: {
          // Calculate demand level based on applicants per job ratio
          demandLevel: {
            $switch: {
              branches: [
                { case: { $lt: ['$averageApplicantsPerJob', 3] }, then: 'very-high' },
                { case: { $lt: ['$averageApplicantsPerJob', 5] }, then: 'high' },
                { case: { $lt: ['$averageApplicantsPerJob', 7] }, then: 'moderate' },
                { case: { $lt: ['$averageApplicantsPerJob', 10] }, then: 'low' }
              ],
              default: 'very-low'
            }
          },
          // Calculate growth rate (simplified - based on recent posting activity)
          growthRate: {
            $multiply: [
              {
                $subtract: [
                  { $divide: ['$totalPostings', 30] }, // Posts per day
                  0.5 // Baseline
                ]
              },
              20 // Scale factor
            ]
          }
        }
      },
      {
        $sort: { totalPostings: -1 }
      }
    ]);


    // Get actual total job count (not grouped)
    const actualTotalJobs = await Job.countDocuments({
      status: { $in: ['active', 'paused', 'closed'] }
    });

    // Calculate overall statistics
    const totalJobsByCategory = jobs.reduce((sum, job) => sum + job.totalPostings, 0);
    const totalApplicants = jobs.reduce((sum, job) => sum + job.totalApplicants, 0);
    const averageTimeToFill = Math.round(
      jobs.reduce((sum, job) => sum + job.timeToFill, 0) / (jobs.length || 1)
    );
    const highDemandCount = jobs.filter(job => 
      job.demandLevel === 'very-high' || job.demandLevel === 'high'
    ).length;

    // Get time-series data for trend analysis (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Job.aggregate([
      {
        $match: {
          postedDate: { $gte: sixMonthsAgo },
          status: { $in: ['active', 'paused', 'closed'] }
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'jobId',
          as: 'applications'
        }
      },
      {
        $addFields: {
          month: { $dateToString: { format: "%Y-%m", date: "$postedDate" } },
          department: { $ifNull: ['$department', 'other'] },
          applicantCount: { $size: '$applications' }
        }
      },
      {
        $group: {
          _id: {
            month: '$month',
            department: '$department'
          },
          jobCount: { $sum: 1 },
          totalApplicants: { $sum: '$applicantCount' }
        }
      },
      {
        $group: {
          _id: '$_id.month',
          departments: {
            $push: {
              department: '$_id.department',
              jobCount: '$jobCount',
              applicantCount: '$totalApplicants'
            }
          },
          totalJobs: { $sum: '$jobCount' },
          totalApplicants: { $sum: '$totalApplicants' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get category distribution for pie chart
    const categoryDistribution = await Job.aggregate([
      {
        $match: {
          status: { $in: ['active', 'paused', 'closed'] }
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'jobId',
          as: 'applications'
        }
      },
      {
        $addFields: {
          department: { $ifNull: ['$department', 'other'] },
          applicantCount: { $size: '$applications' }
        }
      },
      {
        $group: {
          _id: '$department',
          jobCount: { $sum: 1 },
          totalApplicants: { $sum: '$applicantCount' },
          totalViews: { $sum: '$viewCount' },
          avgSalary: { $avg: '$salaryMin' }
        }
      },
      {
        $addFields: {
          // Use same demand calculation as individual jobs for consistency
          demandScore: {
            $add: [
              { $multiply: ['$jobCount', 40] },        // More job postings = higher demand
              { $multiply: ['$totalApplicants', 4] },  // More applicants = higher demand  
              { $multiply: ['$totalViews', 0.2] }      // More views = higher interest
            ]
          }
        }
      },
      {
        $sort: { demandScore: -1 }
      }
    ]);

    // Get top demanding jobs for bar chart
    const topDemandingJobs = await Job.aggregate([
      {
        $match: {
          status: { $in: ['active', 'paused', 'closed'] }
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'jobId',
          as: 'applications'
        }
      },
      {
        $addFields: {
          applicantCount: { $size: '$applications' }
        }
      },
      {
        $group: {
          _id: '$title',
          totalJobs: { $sum: 1 },
          totalApplicants: { $sum: '$applicantCount' },
          totalViews: { $sum: '$viewCount' },
          avgSalary: { $avg: '$salaryMin' },
          department: { $first: { $ifNull: ['$department', 'other'] } }
        }
      },
      {
        $addFields: {
          // Calculate demand score: job postings (40%) + total applicants (40%) + total views (20%)
          demandScore: {
            $add: [
              { $multiply: ['$totalJobs', 40] },        // More job postings = higher demand
              { $multiply: ['$totalApplicants', 4] },   // More applicants = higher demand  
              { $multiply: ['$totalViews', 0.2] }       // More views = higher interest
            ]
          }
        }
      },
      {
        $sort: { demandScore: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const analytics = {
      jobDemandData: jobs,
      chartData: {
        monthlyTrends,
        categoryDistribution,
        topDemandingJobs
      },
      summary: {
        totalJobs: actualTotalJobs,
        totalJobsByCategory: totalJobsByCategory,
        totalApplicants,
        averageTimeToFill,
        highDemandCount,
        totalCategories: jobs.length
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ Error fetching job demand analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job demand analytics',
      error: error.message
    });
  }
});

// Generate selected reports endpoint
router.post('/reports/generate-selected', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { reportTypes, startDate, endDate, format, includeDetails } = req.body;
    
    if (!reportTypes || !Array.isArray(reportTypes) || reportTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of report types'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const allReports = [];
    const failedReports = [];
    
    // Generate reports for selected types only
    const reportPromises = reportTypes.map(async (reportType) => {
      try {
        let reportData = {};
        
        // Use the same logic as the main generate endpoint
        switch (reportType) {
          case 'dashboard-overview':
            const [overviewUsers, overviewEmployers, overviewJobseekers, overviewJobs, overviewApplications, overviewPendingEmployers, overviewActiveJobs] = await Promise.all([
              User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              User.countDocuments({ role: 'employer', createdAt: { $gte: start, $lte: end } }),
              User.countDocuments({ role: 'jobseeker', createdAt: { $gte: start, $lte: end } }),
              Job.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              Application.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              Employer.countDocuments({ accountStatus: 'pending', createdAt: { $gte: start, $lte: end } }),
              Job.countDocuments({ status: 'active', createdAt: { $gte: start, $lte: end } })
            ]);
            
            reportData = {
              summary: { 
                totalUsers: overviewUsers, 
                totalEmployers: overviewEmployers, 
                totalJobseekers: overviewJobseekers,
                totalJobs: overviewJobs, 
                totalApplications: overviewApplications,
                pendingEmployers: overviewPendingEmployers,
                activeJobs: overviewActiveJobs
              },
              details: includeDetails ? await User.find({ 
                createdAt: { $gte: start, $lte: end } 
              }).select('email role createdAt isActive lastLoginAt') : []
            };
            break;

          case 'employer-verification':
            const [pendingVerification, verifiedEmployersCount, rejectedEmployersCount, totalDocuments] = await Promise.all([
              Employer.countDocuments({ 
                accountStatus: 'pending',
                createdAt: { $gte: start, $lte: end }
              }),
              Employer.countDocuments({ 
                accountStatus: 'verified',
                verifiedAt: { $gte: start, $lte: end }
              }),
              Employer.countDocuments({ 
                accountStatus: 'rejected',
                updatedAt: { $gte: start, $lte: end }
              }),
              EmployerDocument.countDocuments({ 
                uploadedAt: { $gte: start, $lte: end }
              })
            ]);
            
            reportData = {
              summary: { 
                pendingVerification, 
                verifiedEmployers: verifiedEmployersCount, 
                rejectedEmployers: rejectedEmployersCount,
                totalDocuments,
                approvalRate: verifiedEmployersCount > 0 ? ((verifiedEmployersCount / (verifiedEmployersCount + rejectedEmployersCount)) * 100).toFixed(2) : 0
              },
              details: includeDetails ? await Employer.find({
                $or: [
                  { accountStatus: 'pending', createdAt: { $gte: start, $lte: end } },
                  { accountStatus: 'verified', verifiedAt: { $gte: start, $lte: end } },
                  { accountStatus: 'rejected', updatedAt: { $gte: start, $lte: end } }
                ]
              }).populate('userId', 'email companyName') : []
            };
            break;

          // Add other cases as needed - for now, use basic implementation
          default:
            const [totalUsers, totalJobs, totalApplications] = await Promise.all([
              User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              Job.countDocuments({ createdAt: { $gte: start, $lte: end } }),
              Application.countDocuments({ createdAt: { $gte: start, $lte: end } })
            ]);
            
            reportData = {
              summary: { totalUsers, totalJobs, totalApplications },
              details: includeDetails ? [] : []
            };
        }
        
        return {
          reportType,
          reportMetadata: {
            reportType,
            startDate,
            endDate,
            format,
            includeDetails,
            generatedAt: new Date(),
            generatedBy: req.user.email
          },
          data: reportData
        };
        
      } catch (error) {
        console.error(`Error generating ${reportType}:`, error);
        failedReports.push(reportType);
        return null;
      }
    });
    
    // Wait for all reports to complete
    const results = await Promise.all(reportPromises);
    const successfulReports = results.filter(report => report !== null);
    
    const response = {
      metadata: {
        generatedAt: new Date(),
        dateRange: `${startDate} to ${endDate}`,
        totalReports: successfulReports.length,
        failedReports: failedReports.length,
        generatedBy: req.user.email,
        format,
        selectedReports: reportTypes
      },
      reports: successfulReports,
      failedReports
    };
    
    // Handle PDF/XLSX generation for selected reports
    if (format === 'pdf') {
      try {
        const pdfBuffer = await pdfReportService.generateBulkReportsPDF(response);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Selected_Reports_${startDate}_to_${endDate}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        return res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('Selected PDF generation error:', pdfError);
        return res.json({
          success: true,
          data: response,
          message: `Generated ${successfulReports.length} selected reports successfully (PDF generation failed, returning JSON)`,
          pdfError: pdfError.message
        });
      }
    }
    
    if (format === 'xlsx') {
      try {
        const xlsxBuffer = xlsxReportService.generateBulkReportsXLSX(response);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Selected_Reports_${startDate}_to_${endDate}.xlsx"`);
        res.setHeader('Content-Length', xlsxBuffer.length);
        
        return res.send(xlsxBuffer);
      } catch (xlsxError) {
        console.error('Selected XLSX generation error:', xlsxError);
        return res.json({
          success: true,
          data: response,
          message: `Generated ${successfulReports.length} selected reports successfully (XLSX generation failed, returning JSON)`,
          xlsxError: xlsxError.message
        });
      }
    }
    
    res.json({
      success: true,
      data: response,
      message: `Generated ${successfulReports.length} selected reports successfully`
    });
    
  } catch (error) {
    console.error('Selected reports generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating selected reports'
    });
  }
});

// Test endpoint for XLSX generation
router.get('/test-xlsx', verifyToken, adminMiddleware, async (req, res) => {
  try {
    console.log('Testing XLSX generation...');
    
    // Create sample report data using real database queries
    const [totalUsers, totalJobs, totalApplications] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments()
    ]);
    
    const testReportData = {
      reportMetadata: {
        reportType: 'test-report',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        format: 'xlsx',
        includeDetails: true,
        generatedAt: new Date(),
        generatedBy: req.user.email || 'test-user'
      },
      data: {
        summary: {
          totalUsers,
          totalJobs,
          totalApplications,
          testMetric: 'XLSX Generation Test'
        },
        details: [
          { id: 1, name: 'Test Record 1', value: 100, date: new Date() },
          { id: 2, name: 'Test Record 2', value: 200, date: new Date() }
        ]
      }
    };
    
    const xlsxBuffer = xlsxReportService.generateReportXLSX(testReportData, 'Test XLSX Report');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="test-report.xlsx"');
    res.setHeader('Content-Length', xlsxBuffer.length);
    
    res.send(xlsxBuffer);
    
  } catch (error) {
    console.error('XLSX test error:', error);
    res.status(500).json({
      success: false,
      message: 'XLSX test failed',
      error: error.message
    });
  }
});

// GET /api/admin/view-document/:documentId - Stream document for preview
router.get('/view-document/:documentId', async (req, res) => {
  // Handle authentication from query parameter (like employer endpoint)
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  try {
    // Verify the token manually
    const admin = require('../config/firebase');
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
  try {
    const { documentId } = req.params;
    
    // Find employer with the document
    const employer = await Employer.findOne({
      'documents._id': documentId
    });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Find the specific document
    const document = employer.documents.find(doc => doc._id.toString() === documentId);
    
    if (!document || !document.cloudUrl) {
      return res.status(404).json({
        success: false,
        message: 'Document not available'
      });
    }
    
    try {
      // Fetch the document from Cloudinary and stream it
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(document.cloudUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const request = client.get(document.cloudUrl, (response) => {
        // Set appropriate headers for PDF viewing
        res.setHeader('Content-Type', document.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + document.documentName + '"');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // Pipe the response directly to the client
        response.pipe(res);
      });
      
      request.on('error', (error) => {
        console.error('Error fetching document from cloud:', error);
        res.status(500).json({
          success: false,
          message: 'Error loading document'
        });
      });
      
    } catch (error) {
      console.error('Error streaming document:', error);
      res.status(500).json({
        success: false,
        message: 'Error loading document'
      });
    }
    
  } catch (error) {
    console.error('Error fetching document for preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching document',
      error: error.message
    });
  }
});

module.exports = router;
