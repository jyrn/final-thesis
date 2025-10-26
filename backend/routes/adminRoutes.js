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

  } catch (error) {    res.status(500).json({ 
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

  } catch (error) {    res.status(500).json({ 
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
      const profilePicture = employer.profilePicture || employer.userId?.profilePicture;      return {
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

  } catch (error) {    res.status(500).json({ 
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

  } catch (error) {    res.status(500).json({ 
      success: false, 
      message: 'Error fetching pending employers' 
    });
  }
});

// Verify/reject employer
router.put('/employers/:employerId/verify', verifyToken, adminMiddleware, async (req, res) => {
  try {

    const { employerId } = req.params;
    const { action, reason } = req.body; // action: 'approve', 'reject', or 'remove'

    const employer = await Employer.findById(employerId).populate('userId', 'email uid');
    if (!employer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employer not found' 
      });
    }

    // Handle complete removal action
    if (action === 'remove') {
      const userEmail = employer.userId.email;
      const companyName = employer.companyDetails?.companyName || employer.userId.companyName;

      // Delete from Firebase Authentication
      try {
        await admin.auth().deleteUser(employer.userId.uid);
        console.log(`✅ Firebase user deleted: ${employer.userId.uid}`);
      } catch (firebaseError) {
        console.error('❌ Firebase user deletion error:', firebaseError);
        // Continue with database deletion even if Firebase fails
      }

      // Delete all related data from MongoDB
      await Promise.all([
        // Delete employer documents
        EmployerDocument.deleteMany({ employerId: employerId }),
        // Delete jobs posted by this employer
        Job.deleteMany({ employerId: employerId }),
        // Delete applications to jobs posted by this employer
        Application.deleteMany({ employerId: employerId }),
        // Delete the employer record
        Employer.findByIdAndDelete(employerId),
        // Delete the user record
        User.findByIdAndDelete(employer.userId._id)
      ]);

      // Send notification email to the employer
      try {
        const emailService = require('../services/emailService');
        await emailService.sendEmployerCompleteRemovalEmail(userEmail, companyName);
        console.log(`✅ Removal notification email sent to: ${userEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send removal notification email:', emailError);
        // Don't fail the request if email fails
      }

      return res.json({
        success: true,
        message: 'Employer completely removed from system',
        action: 'removed'
      });
    }

    // Update employer status for approve/reject actions
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
      
    } catch (docUpdateError) {    }

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
    } catch (emailError) {      // Don't fail the entire operation if email fails
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

  } catch (error) {    res.status(500).json({ 
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

  } catch (error) {    res.status(500).json({ 
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
  try {    const { jobId } = req.params;
    const { status, reason } = req.body;    const job = await Job.findById(jobId);
    if (!job) {      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }    // Store original status to check if we need to send email
    const originalStatus = job.status;
    
    job.status = status;
    if (reason) {
      job.adminNotes = reason;
    }
    job.lastModifiedBy = req.user.uid;
    job.updatedAt = new Date();    await job.save();    // Send email notification based on status change
    if (originalStatus !== status) {      try {
        const emailService = require('../services/emailService');
        
        // Get employer information
        let employerEmail = null;
        let companyName = job.companyName || 'Unknown Company';        if (job.employerUid) {
          // Find employer by UID
          const Employer = require('../models/Employer');
          const employer = await Employer.findOne({ uid: job.employerUid });
          if (employer) {
            employerEmail = employer.email;
            companyName = employer.companyName || job.companyName || 'Unknown Company';          } else {          }
        }
        
        // If still no email, try finding by employerId
        if (!employerEmail && job.employerId) {
          const Employer = require('../models/Employer');
          const employer = await Employer.findById(job.employerId);
          if (employer) {
            employerEmail = employer.email;
            companyName = employer.companyName || job.companyName || 'Unknown Company';          } else {          }
        }
        
        if (employerEmail) {          // Send appropriate email based on status
          if (status === 'removed') {
            await emailService.sendJobRemovalEmail(
              employerEmail,
              companyName || 'Your Company',
              job.title,
              reason
            );          } else if (status === 'paused') {
            await emailService.sendJobPauseEmail(
              employerEmail,
              companyName || 'Your Company',
              job.title,
              reason
            );          } else if (status === 'flagged') {
            await emailService.sendJobFlagEmail(
              employerEmail,
              companyName || 'Your Company',
              job.title,
              reason
            );          }
        } else {        }
      } catch (emailError) {        // Don't fail the request if email fails
      }
    }    res.json({
      success: true,
      message: `Job status updated to ${status}${status === 'removed' ? '. Employer has been notified.' : ''}`
    });

  } catch (error) {    res.status(500).json({ 
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

  } catch (error) {    res.status(500).json({ 
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

  } catch (error) {    res.status(500).json({ 
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
    } catch (firebaseError) {      return res.status(500).json({ 
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

    } catch (mongoError) {      // Rollback: Delete the Firebase user if MongoDB creation fails
      try {
        await admin.auth().deleteUser(firebaseUser.uid);
      } catch (rollbackError) {      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create admin in database: ' + mongoError.message 
      });
    }

  } catch (error) {    res.status(500).json({ 
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

  } catch (error) {    res.status(500).json({ 
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

    // Debug logging    if (employer.documents && employer.documents.length > 0) {
      employer.documents.forEach((doc, index) => {      });
    }

    res.json({
      success: true,
      documents: employer.documents || []
    });

  } catch (error) {    res.status(500).json({ 
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

  } catch (error) {    res.status(500).json({ 
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
    res.status(500).json({ 
      success: false, 
      message: 'Error updating documents status' 
    });
  }
});

// ===== REPORT DATA ENDPOINTS =====

// Get employers data for reports
router.get('/reports/employers-data', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    console.log('Employers endpoint - Filters received:', { startDate, endDate, status });
    
    // Build filter query
    let query = {};
    
    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        // Parse date in UTC to avoid timezone issues
        const startDateTime = new Date(startDate + 'T00:00:00.000Z');
        query.createdAt.$gte = startDateTime;
        console.log('Start date filter:', startDateTime);
      }
      if (endDate) {
        // Parse date in UTC to avoid timezone issues
        const endDateTime = new Date(endDate + 'T23:59:59.999Z');
        query.createdAt.$lte = endDateTime;
        console.log('End date filter:', endDateTime);
      }
    }
    
    // Status filtering
    if (status && status !== 'all') {
      query.accountStatus = status;
      console.log('Status filter:', status);
    }
    
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    const employers = await Employer.find(query)
      .select('companyName industry email accountStatus createdAt uid')
      .sort({ createdAt: -1 });

    console.log('Found employers:', employers.length);

    // Debug: Log first few employer dates to check filtering
    if (employers.length > 0) {
      console.log('Sample employer dates:');
      employers.slice(0, 3).forEach((emp, idx) => {
        console.log(`  ${idx + 1}. ${emp.companyName}: ${emp.createdAt} (${emp.createdAt.toISOString()})`);
      });
    }

    // Get application counts for each employer
    const Application = require('../models/Application');
    const employerIds = employers.map(emp => emp.uid || emp._id);
    
    const applicationCounts = await Application.aggregate([
      { $match: { employerUid: { $in: employerIds } } },
      { $group: { _id: '$employerUid', applicationCount: { $sum: 1 } } }
    ]);
    
    const applicationCountMap = {};
    applicationCounts.forEach(count => {
      applicationCountMap[count._id] = count.applicationCount;
    });

    // Get job postings count for each employer
    const jobCounts = await Job.aggregate([
      { $match: { employerUid: { $in: employerIds } } },
      { $group: { _id: '$employerUid', jobPostingsCount: { $sum: 1 } } }
    ]);
    
    const jobCountMap = {};
    jobCounts.forEach(count => {
      jobCountMap[count._id] = count.jobPostingsCount;
    });

    const formattedData = employers.map(employer => ({
      id: employer._id,
      companyName: employer.companyName || 'N/A',
      industry: employer.industry || 'N/A',
      email: employer.email || 'N/A',
      status: employer.accountStatus || 'pending',
      dateRegistered: employer.createdAt,
      applicationCount: applicationCountMap[employer.uid || employer._id] || 0,
      jobPostingsCount: jobCountMap[employer.uid || employer._id] || 0
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      query: query
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employers data',
      error: error.message
    });
  }
});

// Get jobs data for reports
router.get('/reports/jobs-data', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    console.log('Jobs endpoint - Filters received:', { startDate, endDate, status });
    
    // Build filter query
    let query = {};
    
    // Date filtering
    if (startDate || endDate) {
      query.postedDate = {};
      if (startDate) {
        // Parse date in UTC to avoid timezone issues
        const startDateTime = new Date(startDate + 'T00:00:00.000Z');
        query.postedDate.$gte = startDateTime;
        console.log('Start date filter:', startDateTime);
      }
      if (endDate) {
        // Parse date in UTC to avoid timezone issues
        const endDateTime = new Date(endDate + 'T23:59:59.999Z');
        query.postedDate.$lte = endDateTime;
        console.log('End date filter:', endDateTime);
      }
    }
    
    // Status filtering
    if (status && status !== 'all') {
      query.status = status;
      console.log('Status filter:', status);
    }
    
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    const jobs = await Job.find(query)
      .select('title companyName department status postedDate')
      .sort({ postedDate: -1 });

    console.log('Found jobs:', jobs.length);

    // Get application counts for each job
    const Application = require('../models/Application');
    const jobIds = jobs.map(job => job._id);
    
    const applicationCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', applicationCount: { $sum: 1 } } }
    ]);
    
    const applicationCountMap = {};
    applicationCounts.forEach(count => {
      applicationCountMap[count._id.toString()] = count.applicationCount;
    });

    const formattedData = jobs.map(job => ({
      id: job._id,
      jobTitle: job.title || 'N/A',
      companyName: job.companyName || 'N/A',
      department: job.department || 'N/A',
      status: job.status || 'active',
      postedDate: job.postedDate,
      applicationCount: applicationCountMap[job._id.toString()] || 0
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      query: query
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs data',
      error: error.message
    });
  }
});

// Get jobseekers data for reports
router.get('/reports/jobseekers-data', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    console.log('JobSeekers endpoint - Filters received:', { startDate, endDate, status });
    
    // Build filter query
    let query = {};
    
    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        // Parse date in UTC to avoid timezone issues
        const startDateTime = new Date(startDate + 'T00:00:00.000Z');
        query.createdAt.$gte = startDateTime;
        console.log('Start date filter:', startDateTime);
      }
      if (endDate) {
        // Parse date in UTC to avoid timezone issues
        const endDateTime = new Date(endDate + 'T23:59:59.999Z');
        query.createdAt.$lte = endDateTime;
        console.log('End date filter:', endDateTime);
      }
    }
    
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    // Get all jobseekers first (without status filtering)
    const jobseekers = await JobSeeker.find(query)
      .select('firstName lastName email isActive createdAt uid')
      .sort({ createdAt: -1 });

    console.log('Found jobseekers:', jobseekers.length);

    // Get corresponding User data to check for accurate status
    const jobseekerUids = jobseekers.map(js => js.uid).filter(Boolean);
    const users = await User.find({ uid: { $in: jobseekerUids } })
      .select('uid status isActive');

    // Create a map for quick user lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.uid] = user;
    });

    let formattedData = jobseekers.map(jobseeker => {
      const userProfile = userMap[jobseeker.uid];
      
      // Determine status - prioritize User collection status over JobSeeker isActive
      let finalStatus = 'active';
      if (userProfile?.status) {
        finalStatus = userProfile.status;
      } else if (!jobseeker.isActive || userProfile?.disabled || !userProfile?.isActive) {
        finalStatus = 'inactive';
      }

      return {
        id: jobseeker._id,
        firstName: jobseeker.firstName || 'N/A',
        lastName: jobseeker.lastName || 'N/A',
        email: jobseeker.email || 'N/A',
        status: finalStatus,
        registrationDate: jobseeker.createdAt
      };
    });

    // Apply status filtering after determining accurate status
    if (status && status !== 'all') {
      formattedData = formattedData.filter(jobseeker => jobseeker.status === status);
      console.log('Status filter applied:', status, 'Filtered count:', formattedData.length);
    }

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      query: query
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching jobseekers data',
      error: error.message
    });
  }
});

// Get hiring analytics data for reports
router.get('/reports/hiring-analytics-data', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('Fetching hiring analytics data with filters:', { startDate, endDate });
    
    // Build query for applications with "hired" status
    let query = { status: 'hired' };
    
    // Add date filtering based on appliedDate or updatedAt (when they were hired)
    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) {
        const startDateTime = new Date(startDate + 'T00:00:00.000Z');
        query.updatedAt.$gte = startDateTime;
      }
      if (endDate) {
        const endDateTime = new Date(endDate + 'T23:59:59.999Z');
        query.updatedAt.$lte = endDateTime;
      }
    }
    
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    // Aggregate to get hiring count by employer
    const Application = require('../models/Application');
    const Job = require('../models/Job');
    
    const hiringData = await Application.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobDetails'
        }
      },
      { $unwind: '$jobDetails' },
      {
        $group: {
          _id: '$employerUid',
          companyName: { $first: '$jobDetails.companyName' },
          hiredCount: { $sum: 1 },
          latestHireDate: { $max: '$updatedAt' }
        }
      },
      { $sort: { hiredCount: -1 } }
    ]);

    console.log('Found hiring data:', hiringData.length, 'companies');

    const formattedData = hiringData.map(item => ({
      id: item._id,
      companyName: item.companyName || 'N/A',
      hiredCount: item.hiredCount,
      latestHireDate: item.latestHireDate
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      query: query
    });

  } catch (error) {
    console.error('Error fetching hiring analytics data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hiring analytics data',
      error: error.message
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

  } catch (error) {    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

// Update user status/role (superadmin only)
router.put('/users/:userId', verifyToken, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive, canLogin, registrationStatus, adminLevel, department, adminName, status } = req.body;    const updateData = {};
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
    }    // Store original user data for email notification
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
    }    // Try to update in Admin collection first    let user = await Admin.findOneAndUpdate(
      { uid: userId },
      updateData,
      { new: true, runValidators: true }
    );    // If not found in Admin collection, try User collection
    if (!user) {      user = await User.findOneAndUpdate(
        { uid: userId },
        updateData,
        { new: true, runValidators: true }
      );      if (user) {      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }    // Send email notification for jobseeker status changes
    const originalStatus = originalUser.status || 'active';
    const newStatus = user.status || 'active';
    
    // For suspension, always send email if suspendedAt was updated (even if status didn't change)
    const wasSuspended = updateData.suspendedAt !== undefined;
    const shouldSendEmail = (originalStatus !== newStatus || wasSuspended) && user.role === 'jobseeker';    if (shouldSendEmail) {      try {
        const emailService = require('../services/emailService');
        const userEmail = user.email;
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;        if (newStatus === 'removed') {
          await emailService.sendJobseekerRemovalEmail(
            userEmail,
            userName,
            'Your account has been removed by the administrator for policy compliance or security reasons.'
          );        } else if (newStatus === 'inactive') {
          await emailService.sendJobseekerSuspensionEmail(
            userEmail,
            userName,
            'Your account has been suspended due to inactivity (no login for over 1 year). Simply log in to reactivate.'
          );        }
      } catch (emailError) {        // Don't fail the request if email fails
      }
    }    res.json({
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

  } catch (error) {    res.status(500).json({ 
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
      } catch (firebaseError) {        // Continue with MongoDB deletion even if Firebase fails
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

  } catch (error) {    res.status(500).json({ 
      success: false, 
      message: 'Error deleting user' 
    });
  }
});

// Complete jobseeker deletion (admin only) - removes from both Firebase and database
router.delete('/jobseekers/:userId/complete', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;    // Find user in User collection by UID
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }

    // Verify it's a jobseeker
    if (user.role !== 'jobseeker') {
      return res.status(400).json({
        success: false,
        message: 'User is not a jobseeker'
      });
    }    // Store user info for email notification
    const userEmail = user.email;
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    // 1. Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(user.uid);    } catch (firebaseError) {      // Continue with database deletion even if Firebase fails
    }

    // 2. Delete related data from MongoDB collections
    try {
      // Delete JobSeeker profile
      await JobSeeker.deleteMany({ uid: user.uid });      // Delete Resume data
      await Resume.deleteMany({ jobSeekerUid: user.uid });      // Delete Applications
      const deletedApplications = await Application.deleteMany({ jobSeekerUid: user.uid });      // Delete from User collection
      await User.findByIdAndDelete(user._id);    } catch (dbError) {      return res.status(500).json({
        success: false,
        message: 'Error deleting user data from database'
      });
    }

    // 3. Send email notification
    try {
      const emailService = require('../services/emailService');
      await emailService.sendJobseekerCompleteRemovalEmail(
        userEmail,
        userName,
        'Your account has been permanently removed from the system by the administrator.'
      );    } catch (emailError) {      // Don't fail the request if email fails
    }    res.json({
      success: true,
      message: 'Jobseeker completely removed from system. User has been notified via email.'
    });

  } catch (error) {    res.status(500).json({ 
      success: false, 
      message: 'Error completely deleting jobseeker',
      error: error.message
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
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching system analytics' 
    });
  }
});

// Suspend jobseeker account (admin only) - marks as inactive with suspension timestamp
router.put('/jobseekers/:userId/suspend', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user in User collection by UID
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Jobseeker not found'
      });
    }

    // Verify it's a jobseeker
    if (user.role !== 'jobseeker') {
      return res.status(400).json({
        success: false,
        message: 'User is not a jobseeker'
      });
    }

    // Store original data for email notification
    const originalStatus = user.status || 'active';
    const userEmail = user.email;
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    // Update user status to inactive with suspension timestamp
    const updatedUser = await User.findOneAndUpdate(
      { uid: userId },
      { 
        status: 'inactive',
        suspendedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update jobseeker status'
      });
    }

    // Also update the JobSeeker collection's isActive field
    try {
      await JobSeeker.findOneAndUpdate(
        { uid: userId },
        { isActive: false },
        { new: true }
      );
    } catch (jobseekerUpdateError) {
      console.error('Failed to update JobSeeker isActive field:', jobseekerUpdateError);
      // Don't fail the request if JobSeeker update fails
    }

    // Send suspension email notification
    try {
      const emailService = require('../services/emailService');
      await emailService.sendJobseekerSuspensionEmail(
        userEmail,
        userName,
        'Your account has been suspended due to inactivity (no login for over 1 year). Simply log in to reactivate your account within 30 days.'
      );
    } catch (emailError) {
      console.error('Failed to send suspension email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Jobseeker account suspended successfully',
      data: {
        uid: updatedUser.uid,
        email: updatedUser.email,
        status: updatedUser.status,
        suspendedAt: updatedUser.suspendedAt
      }
    });

  } catch (error) {
    console.error('Suspend jobseeker error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending jobseeker account'
    });
  }
});

// Report Generation Endpoints
router.post('/reports/generate', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { reportType, startDate, endDate, format = 'json', includeDetails = true, status, sortConfig } = req.body;
    
    console.log('Report generation - sortConfig received:', sortConfig);
    
    let reportData = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date
    
    switch (reportType) {
      case 'registered-jobseekers':
        // Registered Jobseekers Report - Total registered jobseekers, demographics, profile completeness, and activity status
        const baseQuery = { 
          createdAt: { $gte: start, $lte: end },
          ...(status && status !== 'all' ? { isActive: status === 'active' } : {})
        };
        
        const [totalJobseekers, activeJobseekers, profileCompleteJobseekers, jobseekersWithResumes, jobseekersByGender, jobseekersByAge] = await Promise.all([
          JobSeeker.countDocuments(baseQuery),
          JobSeeker.countDocuments({ 
            ...baseQuery,
            isActive: true
          }),
          JobSeeker.countDocuments({ 
            ...baseQuery,
            profileComplete: true
          }),
          JobSeeker.countDocuments({ 
            ...baseQuery,
            currentResumeId: { $exists: true, $ne: null }
          }),
          JobSeeker.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$gender', count: { $sum: 1 } } }
          ]),
          JobSeeker.aggregate([
            { $match: { 
              ...baseQuery,
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
          details: await JobSeeker.aggregate([
            { 
              $match: { 
                createdAt: { $gte: start, $lte: end },
                ...(status && status !== 'all' ? { isActive: status === 'active' } : {})
              } 
            },
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
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userInfo'
              }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                email: '$userInfo.email',
                status: { $cond: { if: '$isActive', then: 'active', else: 'inactive' } },
                registrationDate: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
              }
            },
            { $sort: { createdAt: -1 } }
          ])
        };
        break;

      case 'employers-companies':
        // Employers/Companies Report - Registered employers, company profiles, verification status, and activity metrics
        const employerBaseQuery = { 
          createdAt: { $gte: start, $lte: end },
          ...(status && status !== 'all' ? { accountStatus: status } : {})
        };
        
        const [totalEmployers, activeEmployers, verifiedEmployers, rejectedEmployers, employersByIndustry] = await Promise.all([
          Employer.countDocuments(employerBaseQuery),
          Employer.countDocuments({ 
            ...employerBaseQuery,
            accountStatus: 'active'
          }),
          Employer.countDocuments({ 
            ...employerBaseQuery,
            isVerified: true
          }),
          Employer.countDocuments({ 
            ...employerBaseQuery,
            accountStatus: 'rejected'
          }),
          Employer.aggregate([
            { $match: employerBaseQuery },
            { $group: { _id: '$industry', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ])
        ]);
        
        reportData = {
          summary: { 
            totalEmployers,
            verifiedEmployers, 
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
          details: await Employer.aggregate([
            { 
              $match: { 
                createdAt: { $gte: start, $lte: end },
                ...(status && status !== 'all' ? { accountStatus: status } : {})
              } 
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userInfo'
              }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'jobs',
                localField: '_id',
                foreignField: 'employerId',
                as: 'jobPostings'
              }
            },
            {
              $lookup: {
                from: 'applications',
                let: { employerId: '$_id' },
                pipeline: [
                  {
                    $lookup: {
                      from: 'jobs',
                      localField: 'jobId',
                      foreignField: '_id',
                      as: 'job'
                    }
                  },
                  { $unwind: '$job' },
                  {
                    $match: {
                      $expr: { $eq: ['$job.employerId', '$$employerId'] }
                    }
                  }
                ],
                as: 'allApplications'
              }
            },
            {
              $project: {
                // Company Basic Info
                companyName: 1,
                companyDescription: 1,
                industry: 1,
                companySize: 1,
                foundedYear: 1,
                website: 1,
                
                // Contact Person Details
                'contactPerson.firstName': 1,
                'contactPerson.lastName': 1,
                'contactPerson.position': 1,
                'contactPerson.email': 1,
                'contactPerson.phoneNumber': 1,
                
                // Full Address
                'address.street': 1,
                'address.city': 1,
                'address.province': 1,
                'address.zipCode': 1,
                'address.country': 1,
                
                // Business Registration
                businessRegistrationNumber: 1,
                taxIdentificationNumber: 1,
                
                // Social Media
                'socialMedia.linkedin': 1,
                'socialMedia.facebook': 1,
                'socialMedia.twitter': 1,
                'socialMedia.instagram': 1,
                
                // Company Culture
                benefits: 1,
                companyValues: 1,
                workEnvironment: 1,
                
                // Account Status
                accountStatus: 1,
                documentVerificationStatus: 1,
                isVerified: 1,
                profileComplete: 1,
                verifiedAt: 1,
                createdAt: 1,
                
                // User Info
                email: '$userInfo.email',
                isActive: '$userInfo.isActive',
                lastLoginAt: '$userInfo.lastLoginAt',
                
                // Job Posting Statistics
                totalJobPostings: { $size: '$jobPostings' },
                activeJobPostings: {
                  $size: {
                    $filter: {
                      input: '$jobPostings',
                      cond: { $eq: ['$$this.status', 'active'] }
                    }
                  }
                },
                expiredJobPostings: {
                  $size: {
                    $filter: {
                      input: '$jobPostings',
                      cond: { $eq: ['$$this.status', 'expired'] }
                    }
                  }
                },
                
                // Application Statistics
                totalApplications: { $size: '$allApplications' }
              }
            },
            { $sort: { createdAt: -1 } }
          ]).then(employers => employers.map(emp => ({
            companyName: emp.companyName || 'N/A',
            industry: emp.industry || 'N/A', 
            email: emp.email || 'N/A',
            status: emp.accountStatus || 'pending',
            jobPostingsCount: emp.totalJobPostings || 0,
            applicationCount: emp.totalApplications || 0,
            dateRegistered: emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'
          })))
        };
        break;

      case 'job-demand-analytics':
        // Enhanced Job Demand Analytics Report with comprehensive insights
        
        // 1. Get detailed job demand data with demand levels
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
            $addFields: {
              totalApplicants: { $size: '$applications' },
              activeJobs: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
              filledJobs: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
            }
          },
          {
            $group: {
              _id: {
                title: '$title',
                department: { $ifNull: ['$department', 'Other'] }
              },
              totalPostings: { $sum: 1 },
              totalApplicants: { $sum: '$totalApplicants' },
              activeJobs: { $sum: '$activeJobs' },
              filledJobs: { $sum: '$filledJobs' },
              averageSalary: { $avg: '$salaryMin' },
              avgApplicationsPerJob: { $avg: '$totalApplicants' }
            }
          },
          {
            $project: {
              jobTitle: '$_id.title',
              department: '$_id.department',
              totalPostings: 1,
              totalApplicants: 1,
              activeJobs: 1,
              filledJobs: 1,
              averageSalary: { $round: ['$averageSalary', 0] },
              avgApplicationsPerJob: { $round: ['$avgApplicationsPerJob', 1] }
            }
          },
          { $sort: { totalApplicants: -1 } }
        ]);

        // Calculate demand levels for each job
        const maxApplicants = jobDemandData.length > 0 ? Math.max(...jobDemandData.map(job => job.totalApplicants || 0)) : 1;
        jobDemandData.forEach(job => {
          const percentage = maxApplicants > 0 ? (job.totalApplicants / maxApplicants) * 100 : 0;
          if (percentage >= 80) job.demandLevel = 'Very High';
          else if (percentage >= 60) job.demandLevel = 'High';
          else if (percentage >= 40) job.demandLevel = 'Moderate';
          else if (percentage >= 20) job.demandLevel = 'Low';
          else job.demandLevel = 'Very Low';
        });

        // 2. Department analysis with demand scores
        const departmentAnalysis = await Job.aggregate([
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
              department: { $ifNull: ['$department', 'Other'] },
              applicantCount: { $size: '$applications' }
            }
          },
          {
            $group: {
              _id: '$department',
              jobCount: { $sum: 1 },
              totalApplicants: { $sum: '$applicantCount' },
              avgSalary: { $avg: '$salaryMin' },
              totalViews: { $sum: { $ifNull: ['$viewCount', 0] } }
            }
          },
          {
            $addFields: {
              demandScore: {
                $add: [
                  { $multiply: ['$jobCount', 30] },
                  { $multiply: ['$totalApplicants', 5] },
                  { $multiply: ['$totalViews', 0.1] }
                ]
              },
              avgApplicantsPerJob: { $divide: ['$totalApplicants', '$jobCount'] }
            }
          },
          { $sort: { demandScore: -1 } }
        ]);

        // 3. Trending analysis (month-over-month)
        const trendingAnalysis = await Job.aggregate([
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
              month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              applicantCount: { $size: '$applications' }
            }
          },
          {
            $group: {
              _id: {
                month: '$month',
                department: { $ifNull: ['$department', 'Other'] }
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
          { $sort: { '_id': 1 } }
        ]);

        // 4. Salary insights by demand level
        const salaryInsights = await Job.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end }, salaryMin: { $exists: true, $ne: null } } },
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
              _id: '$department',
              avgSalary: { $avg: '$salaryMin' },
              minSalary: { $min: '$salaryMin' },
              maxSalary: { $max: '$salaryMin' },
              totalApplicants: { $sum: '$applicantCount' },
              jobCount: { $sum: 1 }
            }
          },
          { $sort: { avgSalary: -1 } }
        ]);

        // 5. Competition metrics
        const competitionMetrics = {
          highCompetition: jobDemandData.filter(job => job.totalApplicants >= maxApplicants * 0.6).length,
          mediumCompetition: jobDemandData.filter(job => job.totalApplicants >= maxApplicants * 0.2 && job.totalApplicants < maxApplicants * 0.6).length,
          lowCompetition: jobDemandData.filter(job => job.totalApplicants < maxApplicants * 0.2).length,
          averageApplicationsPerJob: jobDemandData.length > 0 ? (jobDemandData.reduce((sum, job) => sum + job.totalApplicants, 0) / jobDemandData.length).toFixed(1) : 0
        };

        const jobPostingsCount = await Job.countDocuments({ createdAt: { $gte: start, $lte: end } });
        const totalApplicationsCount = jobDemandData.reduce((sum, job) => sum + job.totalApplicants, 0);

        // 6. Industry trends analysis
        const industryTrends = await Job.aggregate([
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
              department: { $ifNull: ['$department', 'Other'] },
              applicantCount: { $size: '$applications' }
            }
          },
          {
            $group: {
              _id: '$department',
              jobCount: { $sum: 1 },
              totalApplicants: { $sum: '$applicantCount' },
              avgSalary: { $avg: '$salaryMin' },
              totalViews: { $sum: { $ifNull: ['$viewCount', 0] } },
              activeJobs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
              filledJobs: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } }
            }
          },
          {
            $addFields: {
              avgApplicantsPerJob: { 
                $cond: [
                  { $gt: ['$jobCount', 0] },
                  { $divide: ['$totalApplicants', '$jobCount'] },
                  0
                ]
              },
              fillRate: {
                $cond: [
                  { $gt: ['$jobCount', 0] },
                  { $multiply: [{ $divide: ['$filledJobs', '$jobCount'] }, 100] },
                  0
                ]
              }
            }
          },
          { $sort: { totalApplicants: -1 } }
        ]);

        reportData = {
          summary: { 
            reportPeriod: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
            totalJobCategories: jobDemandData.length,
            totalJobPostings: jobPostingsCount,
            totalApplications: totalApplicationsCount,
            mostDemandedJob: jobDemandData[0]?.jobTitle || 'N/A',
            mostDemandedDepartment: departmentAnalysis[0]?._id || 'N/A',
            averageApplicationsPerJob: competitionMetrics.averageApplicationsPerJob,
            highestDemandLevel: jobDemandData.find(job => job.demandLevel === 'Very High') ? 'Very High' : 'High',
            competitionDistribution: {
              high: competitionMetrics.highCompetition,
              medium: competitionMetrics.mediumCompetition,
              low: competitionMetrics.lowCompetition
            }
          },
          jobDemandRankings: jobDemandData.slice(0, 20),
          departmentAnalysis: departmentAnalysis,
          industryTrends: industryTrends,
          trendingData: trendingAnalysis,
          salaryInsights: salaryInsights,
          competitionMetrics: competitionMetrics,
          insights: {
            topPerformingDepartments: departmentAnalysis.slice(0, 5),
            emergingTrends: trendingAnalysis.slice(-3),
            salaryCompetitiveness: salaryInsights.slice(0, 3),
            industryGrowth: industryTrends.slice(0, 5)
          },
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
              $addFields: {
                totalApplicants: { $size: '$applications' },
                department: { $ifNull: ['$department', 'Other'] }
              }
            },
            {
              $project: {
                companyName: { $ifNull: ['$companyName', 'Unknown Company'] },
                jobTitle: '$title',
                department: '$department',
                totalApplicants: '$totalApplicants',
                status: 1,
                createdAt: 1
              }
            },
            { $sort: { totalApplicants: -1, createdAt: -1 } }
          ]).then(jobs => {
            // Apply the same global dynamic demand level calculation using maxApplicants from main analytics
            return jobs.map(job => {
              const percentage = maxApplicants > 0 ? (job.totalApplicants / maxApplicants) * 100 : 0;
              
              let demandLevel;
              if (percentage >= 80) {
                demandLevel = 'Very High';
              } else if (percentage >= 60) {
                demandLevel = 'High';
              } else if (percentage >= 40) {
                demandLevel = 'Moderate';
              } else if (percentage >= 20) {
                demandLevel = 'Low';
              } else {
                demandLevel = 'Very Low';
              }

              return {
                ...job,
                demandLevel
              };
            });
          }) : []
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
          details: await Job.aggregate([
            { 
              $match: { 
                createdAt: { $gte: start, $lte: end },
                ...(status && status !== 'all' ? { status: status } : {})
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
              $project: {
                jobTitle: '$title',
                companyName: 1,
                department: 1,
                status: 1,
                totalApplications: { $size: '$applications' },
                postedDate: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
              }
            },
            { $sort: { createdAt: -1 } }
          ])
        };
        break;

      case 'hiring-analytics':
        // Hiring Analytics Report - Use same data as frontend preview
        let hiringQuery = { status: 'hired' };
        if (startDate && endDate) {
          hiringQuery.updatedAt = { $gte: start, $lte: end };
        }

        const hiringAnalyticsData = await Application.aggregate([
          { $match: hiringQuery },
          {
            $lookup: {
              from: 'jobs',
              localField: 'jobId',
              foreignField: '_id',
              as: 'jobDetails'
            }
          },
          { $unwind: '$jobDetails' },
          {
            $group: {
              _id: '$employerUid',
              companyName: { $first: '$jobDetails.companyName' },
              hiredCount: { $sum: 1 },
              latestHireDate: { $max: '$updatedAt' }
            }
          },
          { $sort: { hiredCount: -1 } }
        ]);

        const formattedHiringData = hiringAnalyticsData.map(item => ({
          companyName: item.companyName || 'N/A',
          totalHired: item.hiredCount,
          latestHired: item.latestHireDate ? new Date(item.latestHireDate).toLocaleDateString() : 'N/A'
        }));

        reportData = {
          summary: {
            totalCompaniesHiring: hiringAnalyticsData.length,
            totalHires: hiringAnalyticsData.reduce((sum, company) => sum + company.hiredCount, 0),
            averageHiresPerCompany: hiringAnalyticsData.length > 0 ? (hiringAnalyticsData.reduce((sum, company) => sum + company.hiredCount, 0) / hiringAnalyticsData.length).toFixed(2) : 0,
            topHiringCompany: hiringAnalyticsData[0]?.companyName || 'N/A'
          },
          details: formattedHiringData
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
        const reportName = getReportDisplayName(reportType);        
        const pdfBuffer = await pdfReportService.generateReportPDF(finalReportData, reportName, sortConfig);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${reportName}_${startDate}_to_${endDate}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);        
        return res.send(pdfBuffer);
      } catch (pdfError) {        
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
      } catch (xlsxError) {        // Fallback to JSON response if XLSX generation fails
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
      } catch (csvError) {        // Fallback to JSON response if CSV generation fails
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
    console.error(error);
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
    'job-demand-analytics': 'Job Demand Analytics Report',
    'hiring-analytics': 'Hiring Analytics Report'
  };
  
  return displayNames[reportType] || reportType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Bulk report generation endpoint
router.post('/reports/generate-all', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, format, includeDetails, status, sortConfig } = req.body;
    
    console.log('Bulk report generation - Received parameters:', {
      startDate,
      endDate,
      format,
      includeDetails,
      status
    });
    
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
          case 'registered-jobseekers':
            const jobseekerBaseQuery = { 
              createdAt: { $gte: start, $lte: end },
              ...(status && status !== 'all' ? { isActive: status === 'active' } : {})
            };
            
            const [totalJobseekers, activeJobseekers, profileCompleteJobseekers, jobseekersWithResumes] = await Promise.all([
              JobSeeker.countDocuments(jobseekerBaseQuery),
              JobSeeker.countDocuments({ 
                ...jobseekerBaseQuery,
                isActive: true
              }),
              JobSeeker.countDocuments({ 
                ...jobseekerBaseQuery,
                profileComplete: true
              }),
              JobSeeker.countDocuments({ 
                ...jobseekerBaseQuery,
                currentResumeId: { $exists: true, $ne: null }
              })
            ]);
            
            reportData = {
              summary: { 
                totalJobseekers,
                activeJobseekers, 
                profileCompleteJobseekers, 
                jobseekersWithResumes 
              },
              details: includeDetails ? await JobSeeker.find(jobseekerBaseQuery)
                .select('firstName lastName email isActive profileComplete createdAt') : []
            };
            break;
            
          case 'employers-companies':
            const employerBaseQuery = { 
              createdAt: { $gte: start, $lte: end },
              ...(status && status !== 'all' ? { accountStatus: status } : {})
            };
            
            const [totalEmployers, activeEmployers, verifiedEmployers, employersWithJobs] = await Promise.all([
              Employer.countDocuments(employerBaseQuery),
              Employer.countDocuments({ 
                ...employerBaseQuery,
                accountStatus: 'active'
              }),
              Employer.countDocuments({ 
                ...employerBaseQuery,
                isVerified: true
              }),
              Employer.countDocuments({ 
                ...employerBaseQuery,
                accountStatus: 'verified'
              })
            ]);
            
            reportData = {
              summary: { 
                totalEmployers,
                activeEmployers, 
                verifiedEmployers, 
                employersWithJobs 
              },
              details: includeDetails ? await Employer.find(employerBaseQuery)
                .select('companyName industry email accountStatus isVerified createdAt') : []
            };
            break;
            
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
            const jobBaseQuery = { 
              createdAt: { $gte: start, $lte: end },
              ...(status && status !== 'all' ? { status: status } : {})
            };
        
            const [totalJobs, activeJobs, closedJobs, jobsWithApplications, jobsByDepartment, jobsByStatus] = await Promise.all([
              Job.countDocuments(jobBaseQuery),
              Job.countDocuments({ 
                createdAt: { $gte: start, $lte: end },
                status: 'active'
              }),
              Job.countDocuments({ 
                createdAt: { $gte: start, $lte: end },
                status: 'closed'
              }),
              Job.countDocuments({ 
                ...jobBaseQuery,
                applications: { $gt: 0 }
              }),
              Job.countDocuments({ 
                ...jobBaseQuery,
                department: { $ne: null }
              }),
              Job.countDocuments({ 
                ...jobBaseQuery,
                status: { $ne: null }
              })
            ]);
            
            reportData = {
              summary: { totalJobs, activeJobs, closedJobs },
              details: includeDetails ? await Job.find(jobBaseQuery).populate('employerUid', 'email companyName') : []
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
        
      } catch (error) {        failedReports.push(reportType);
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
      } catch (pdfError) {        // Fallback to JSON response if PDF generation fails
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
      } catch (xlsxError) {        // Fallback to JSON response if XLSX generation fails
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
    
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error generating bulk reports'
    });
  }
});

// Get all jobseekers for admin dashboard
router.get('/jobseekers/all', verifyToken, adminMiddleware, async (req, res) => {
  try {
    // Get all jobseekers with populated user data
    const jobseekers = await JobSeeker.find({})
      .populate('userId', 'email uid status isActive lastLoginAt createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Format jobseekers with consistent data structure
    const formattedJobseekers = jobseekers.map(js => {
      const user = js.userId;
      return {
        _id: js._id,
        uid: js.uid,
        firstName: js.firstName,
        lastName: js.lastName,
        email: js.email || user?.email,
        phoneNumber: js.phoneNumber,
        skills: js.skills || [],
        status: user?.status || (js.isActive ? 'active' : 'inactive'),
        isActive: js.isActive && user?.isActive,
        profileComplete: js.profileComplete,
        createdAt: js.createdAt,
        updatedAt: js.updatedAt,
        lastActive: user?.lastLoginAt || user?.updatedAt || js.updatedAt,
        // Ensure data consistency
        userStatus: user?.status,
        jobSeekerActive: js.isActive,
        userActive: user?.isActive
      };
    });

    res.json({
      success: true,
      jobseekers: formattedJobseekers,
      total: formattedJobseekers.length
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
    // Get users with jobseeker role from User collection with consistent data
    const jobseekerUsers = await User.find({ 
      role: 'jobseeker' 
    })
    .select('uid firstName lastName email phone createdAt updatedAt lastLoginAt isActive disabled status')
    .sort({ createdAt: -1 });

    // Format users with consistent status mapping
    const formattedUsers = jobseekerUsers.map(user => ({
      _id: user._id,
      uid: user.uid,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      status: user.status || (user.isActive ? 'active' : 'inactive'),
      isActive: user.isActive && !user.disabled,
      disabled: user.disabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    }));

    res.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
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

  } catch (error) {    res.status(500).json({ 
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
            department: { $ifNull: ['$department', 'Other'] }
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
      // Removed averageApplicantsPerJob, timeToFill calculations
      {
        $project: {
          jobTitle: '$_id.title',
          department: { $ifNull: ['$_id.department', 'Other'] },
          totalPostings: 1,
          totalApplicants: 1,
          activeJobs: 1,
          filledJobs: 1,
          averageSalary: { $round: ['$averageSalary', 0] }
        }
      },
      {
        $sort: { totalPostings: -1 }
      }
    ]);

    // Calculate dynamic demand levels based on actual applicant distribution
    const maxApplicants = jobs.length > 0 ? Math.max(...jobs.map(job => job.totalApplicants || 0)) : 1;
    
    // Calculate demand levels based on percentage of maximum applicants globally
    jobs.forEach(job => {
      const applicants = job.totalApplicants || 0;
      const percentage = maxApplicants > 0 ? (applicants / maxApplicants) * 100 : 0;
      
      if (percentage >= 80) {
        job.demandLevel = 'very-high';
      } else if (percentage >= 60) {
        job.demandLevel = 'high';
      } else if (percentage >= 40) {
        job.demandLevel = 'moderate';
      } else if (percentage >= 20) {
        job.demandLevel = 'low';
      } else {
        job.demandLevel = 'very-low';
      }
    });


    // Get actual total job count (not grouped)
    const actualTotalJobs = await Job.countDocuments({
      status: { $in: ['active', 'paused', 'closed'] }
    });

    // Calculate overall statistics
    const totalJobsByCategory = jobs.reduce((sum, job) => sum + job.totalPostings, 0);
    const totalApplicants = jobs.reduce((sum, job) => sum + job.totalApplicants, 0);
    const highDemandCount = jobs.filter(job => 
      job.demandLevel === 'very-high' || job.demandLevel === 'high'
    ).length;

    // Get top demanding jobs for bar chart with normalized scoring
    const topDemandingJobsRaw = await Job.aggregate([
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
          // Calculate raw demand score for normalization
          rawDemandScore: {
            $add: [
              { $multiply: ['$totalJobs', 40] },        // More job postings = higher demand
              { $multiply: ['$totalApplicants', 4] },   // More applicants = higher demand  
              { $multiply: ['$totalViews', 0.2] }       // More views = higher interest
            ]
          }
        }
      },
      {
        $sort: { rawDemandScore: -1 }
      }
    ]);

    // Normalize demand scores to 0-100% scale
    const maxRawScore = topDemandingJobsRaw.length > 0 ? topDemandingJobsRaw[0].rawDemandScore : 1;
    const minRawScore = topDemandingJobsRaw.length > 0 ? 
      Math.min(...topDemandingJobsRaw.map(job => job.rawDemandScore)) : 0;
    
    const topDemandingJobs = topDemandingJobsRaw.map(job => ({
      ...job,
      demandScore: maxRawScore > minRawScore ? 
        Math.round(((job.rawDemandScore - minRawScore) / (maxRawScore - minRawScore)) * 100) :
        100 // If all scores are the same, give 100%
    })).slice(0, 10);

    // Get department distribution for bar chart (Most In Demand Categories)
    const departmentDistribution = await Job.aggregate([
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
          department: { $ifNull: ['$department', 'Other'] },
          applicantCount: { $size: '$applications' }
        }
      },
      {
        $group: {
          _id: '$department',
          jobCount: { $sum: 1 },
          totalApplicants: { $sum: '$applicantCount' },
          totalViews: { $sum: { $ifNull: ['$viewCount', 0] } },
          avgSalary: { $avg: '$salaryMin' }
        }
      },
      {
        $addFields: {
          // Calculate demand score based on applicants and job count
          demandScore: {
            $add: [
              { $multiply: ['$jobCount', 30] },         // Job postings weight
              { $multiply: ['$totalApplicants', 5] },   // Applicants weight (higher priority)
              { $multiply: ['$totalViews', 0.1] }       // Views weight (lower priority)
            ]
          }
        }
      },
      {
        $sort: { demandScore: -1 }
      }
    ]);

    // Get top 10 companies with most hires for donut chart
    const companyHiringData = await Application.aggregate([
      {
        $match: {
          status: 'hired'
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobInfo'
        }
      },
      {
        $unwind: '$jobInfo'
      },
      {
        $group: {
          _id: '$jobInfo.companyName',
          totalHired: { $sum: 1 },
          totalApplicants: { $sum: 1 }, // Keep for compatibility
          jobCount: { 
            $addToSet: '$jobId'
          }
        }
      },
      {
        $addFields: {
          jobCount: { $size: '$jobCount' },
          demandScore: { $multiply: ['$totalHired', 10] } // Score based on hires
        }
      },
      {
        $sort: { totalHired: -1 }
      }
    ]);

    const analytics = {
      jobDemandData: jobs,
      chartData: {
        departmentDistribution: departmentDistribution, // For bar chart (Most In Demand Categories)
        companyHiringData: companyHiringData, // For donut chart (Top Companies by Hires)
        topDemandingJobs // For bar chart
      },
      summary: {
        totalJobs: actualTotalJobs,
        totalJobsByCategory: totalJobsByCategory,
        totalApplicants,
        highDemandCount,
        totalCategories: jobs.length
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching job demand analytics',
      error: error.message
    });
  }
});

// Generate selected reports endpoint
router.post('/reports/generate-selected', verifyToken, adminMiddleware, async (req, res) => {
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
        
      } catch (error) {        failedReports.push(reportType);
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
      } catch (pdfError) {        return res.json({
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
      } catch (xlsxError) {        return res.json({
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
    
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error generating selected reports'
    });
  }
});

// Test endpoint for XLSX generation
router.get('/test-xlsx', verifyToken, adminMiddleware, async (req, res) => {
  try {    // Create sample report data using real database queries
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
    
  } catch (error) {    res.status(500).json({
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
      
      request.on('error', (error) => {        res.status(500).json({
          success: false,
          message: 'Error loading document'
        });
      });
      
    } catch (error) {      res.status(500).json({
        success: false,
        message: 'Error loading document'
      });
    }
    
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching document',
      error: error.message
    });
  }
});

// Data validation endpoint for jobseekers consistency
router.get('/jobseekers/validate', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const validationReport = {
      timestamp: new Date(),
      summary: {
        totalJobSeekers: 0,
        totalUsers: 0,
        totalResumes: 0,
        inconsistencies: 0,
        orphanedRecords: 0
      },
      issues: [],
      recommendations: []
    };

    // Get all data sources
    const [jobSeekers, users, resumes, applications] = await Promise.all([
      JobSeeker.find({}).select('uid firstName lastName email phoneNumber isActive createdAt'),
      User.find({ role: 'jobseeker' }).select('uid firstName lastName email phone status isActive createdAt'),
      Resume.find({}).select('jobSeekerUid personalInfo skills isActive createdAt'),
      Application.find({}).select('jobSeekerUid createdAt')
    ]);

    validationReport.summary.totalJobSeekers = jobSeekers.length;
    validationReport.summary.totalUsers = users.length;
    validationReport.summary.totalResumes = resumes.length;

    // Create lookup maps
    const jobSeekerMap = new Map(jobSeekers.map(js => [js.uid, js]));
    const userMap = new Map(users.map(u => [u.uid, u]));
    const resumeMap = new Map(resumes.map(r => [r.jobSeekerUid, r]));

    // Check for orphaned JobSeeker records (no corresponding User)
    jobSeekers.forEach(js => {
      if (!userMap.has(js.uid)) {
        validationReport.issues.push({
          type: 'orphaned_jobseeker',
          severity: 'high',
          uid: js.uid,
          message: `JobSeeker record exists without corresponding User record`,
          data: { firstName: js.firstName, lastName: js.lastName, email: js.email }
        });
        validationReport.summary.orphanedRecords++;
      }
    });

    // Check for orphaned User records (no corresponding JobSeeker)
    users.forEach(user => {
      if (!jobSeekerMap.has(user.uid)) {
        validationReport.issues.push({
          type: 'orphaned_user',
          severity: 'medium',
          uid: user.uid,
          message: `User record exists without corresponding JobSeeker record`,
          data: { firstName: user.firstName, lastName: user.lastName, email: user.email }
        });
        validationReport.summary.orphanedRecords++;
      }
    });

    // Check for data inconsistencies between JobSeeker and User records
    jobSeekers.forEach(js => {
      const user = userMap.get(js.uid);
      if (user) {
        const inconsistencies = [];
        
        if (js.firstName !== user.firstName) {
          inconsistencies.push(`firstName mismatch: JobSeeker="${js.firstName}" vs User="${user.firstName}"`);
        }
        
        if (js.lastName !== user.lastName) {
          inconsistencies.push(`lastName mismatch: JobSeeker="${js.lastName}" vs User="${user.lastName}"`);
        }
        
        if (js.email !== user.email) {
          inconsistencies.push(`email mismatch: JobSeeker="${js.email}" vs User="${user.email}"`);
        }

        if (inconsistencies.length > 0) {
          validationReport.issues.push({
            type: 'data_mismatch',
            severity: 'medium',
            uid: js.uid,
            message: `Data inconsistency between JobSeeker and User records`,
            data: { inconsistencies }
          });
          validationReport.summary.inconsistencies++;
        }
      }
    });

    // Check for resumes without corresponding JobSeeker records
    resumes.forEach(resume => {
      if (!jobSeekerMap.has(resume.jobSeekerUid) && !userMap.has(resume.jobSeekerUid)) {
        validationReport.issues.push({
          type: 'orphaned_resume',
          severity: 'low',
          uid: resume.jobSeekerUid,
          message: `Resume exists without corresponding JobSeeker or User record`,
          data: { personalInfo: resume.personalInfo }
        });
        validationReport.summary.orphanedRecords++;
      }
    });

    // Generate recommendations based on issues found
    if (validationReport.summary.orphanedRecords > 0) {
      validationReport.recommendations.push({
        priority: 'high',
        action: 'cleanup_orphaned_records',
        description: `Clean up ${validationReport.summary.orphanedRecords} orphaned records to maintain data integrity`
      });
    }

    if (validationReport.summary.inconsistencies > 0) {
      validationReport.recommendations.push({
        priority: 'medium',
        action: 'sync_data_fields',
        description: `Synchronize ${validationReport.summary.inconsistencies} inconsistent data fields between collections`
      });
    }

    // Overall health score
    const totalIssues = validationReport.issues.length;
    const totalRecords = Math.max(validationReport.summary.totalJobSeekers, validationReport.summary.totalUsers);
    const healthScore = totalRecords > 0 ? Math.max(0, 100 - (totalIssues / totalRecords * 100)) : 100;
    
    validationReport.summary.healthScore = Math.round(healthScore);
    validationReport.summary.status = healthScore >= 95 ? 'excellent' : 
                                     healthScore >= 85 ? 'good' : 
                                     healthScore >= 70 ? 'fair' : 'poor';

    res.json({
      success: true,
      validation: validationReport
    });

  } catch (error) {
    console.error('Error validating jobseekers data:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating jobseekers data',
      error: error.message
    });
  }
});

// Complete employer removal endpoint
router.delete('/employers/:employerId/complete', verifyToken, adminMiddleware, async (req, res) => {
  try {
    const { employerId } = req.params;

    // Find the employer
    const employer = await Employer.findById(employerId).populate('userId');
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    const userEmail = employer.userId.email;
    const companyName = employer.companyDetails?.companyName || employer.userId.companyName;

    // Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(employer.userId.uid);
      console.log(`✅ Firebase user deleted: ${employer.userId.uid}`);
    } catch (firebaseError) {
      console.error('❌ Firebase user deletion error:', firebaseError);
      // Continue with database deletion even if Firebase fails
    }

    // Delete all related data from MongoDB
    await Promise.all([
      // Delete employer documents
      EmployerDocument.deleteMany({ employerId: employerId }),
      // Delete jobs posted by this employer
      Job.deleteMany({ employerId: employerId }),
      // Delete applications to jobs posted by this employer
      Application.deleteMany({ employerId: employerId }),
      // Delete the employer record
      Employer.findByIdAndDelete(employerId),
      // Delete the user record
      User.findByIdAndDelete(employer.userId._id)
    ]);

    // Send notification email to the employer
    try {
      await emailService.sendEmployerCompleteRemovalEmail(userEmail, companyName);
      console.log(`✅ Removal notification email sent to: ${userEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send removal notification email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: `Employer ${companyName} has been completely removed from all systems`
    });

  } catch (error) {
    console.error('Error completely removing employer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove employer',
      error: error.message
    });
  }
});

module.exports = router;
