const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const Employer = require('../models/Employer');

// @route   POST /api/auth/create-profile
// @desc    Create user profile after Firebase registration
// @access  Public (no token required for registration)
router.post('/create-profile', authController.createUserProfile);

// @route   GET /api/auth/verify
// @desc    Verify Firebase token and return user data
// @access  Private (requires Firebase token)
router.get('/verify', authController.verifyToken);

// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @access  Private (requires Firebase token)
router.get('/me', verifyToken, authController.getCurrentUser);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify user email with token
// @access  Public
router.get('/verify-email/:token', authController.verifyEmail);

// @route   POST /api/auth/request-password-reset
// @desc    Request password reset email
// @access  Public
router.post('/request-password-reset', authController.requestPasswordReset);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authController.resetPassword);

// @route   GET /api/auth/get-user-role
// @desc    Get user role by email
// @access  Public
router.get('/get-user-role', authController.getUserRole);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
router.post('/resend-verification', authController.resendVerification);

// @route   GET /api/auth/check-email/:email
// @desc    Check if email exists and get verification status
// @access  Public
router.get('/check-email/:email', authController.checkEmailExists);

// @route   GET /api/auth/check-email/:email?role=:role
// @desc    Check if email exists with role parameter
// @access  Public
router.get('/check-email/:email', authController.checkEmailExists);

// @route   POST /api/auth/send-otp
// @desc    Send OTP for email verification
// @access  Public
router.post('/send-otp', authController.sendOTP);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for email verification
// @access  Public
router.post('/verify-otp', authController.verifyOTP);

// Configure multer for employer document uploads during registration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/employer-documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   POST /api/auth/employer/documents
// @desc    Upload employer documents during registration (unauthenticated)
// @access  Public
router.post('/employer/documents', upload.fields([
  { name: 'companyProfile', maxCount: 1 },
  { name: 'businessPermit', maxCount: 1 },
  { name: 'philjobnetRegistration', maxCount: 1 },
  { name: 'doleNoPendingCase', maxCount: 1 }
]), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const { email, companyName } = req.body;
    
    if (!email || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Email and company name are required'
      });
    }

    // Find employer by email
    const employer = await Employer.findOne({ email: email });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found. Please complete basic registration first.'
      });
    }

    // Check if all required documents are uploaded
    const requiredDocuments = ['companyProfile', 'businessPermit', 'philjobnetRegistration', 'doleNoPendingCase'];
    const uploadedFiles = req.files;
    
    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No documents were uploaded'
      });
    }

    // Validate all required documents are present
    for (const docType of requiredDocuments) {
      if (!uploadedFiles[docType] || uploadedFiles[docType].length === 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required document: ${docType}`
        });
      }
    }

    // Process documents into array format
    const documentsArray = [];    for (const [docType, files] of Object.entries(uploadedFiles)) {
      if (files && files.length > 0) {
        const file = files[0];        documentsArray.push({
          documentType: docType,
          documentName: file.originalname,
          documentUrl: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
          isRequired: true
        });
      }
    }    // Save documents to employer record
    employer.documents = documentsArray;
    employer.documentVerificationStatus = 'pending';
    employer.documentVerifiedAt = undefined;
    employer.documentRejectionReason = undefined;
    employer.documentAdminNotes = undefined;
    
    // Update employer account status
    employer.accountStatus = 'pending';
    employer.verificationNotes = 'Documents uploaded during registration, pending review';
    
    await employer.save();

    res.json({
      success: true,
      message: 'Documents uploaded successfully and are now under review',
      data: {
        documentsUploaded: documentsArray.length,
        accountStatus: employer.accountStatus,
        uploadedDocuments: documentsArray.map(doc => ({
          type: doc.documentType,
          uploadedAt: doc.uploadedAt
        }))
      }
    });

  } catch (error) {    // Clean up uploaded files if there was an error
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB per file.'
      });
    }

    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading documents',
      error: error.message
    });
  }
});

module.exports = router;
