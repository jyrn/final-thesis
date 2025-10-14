const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cloudStorageService = require('../services/cloudStorageService');
const Employer = require('../models/Employer');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleBasedAccess');

// Configure multer for cloud uploads (memory storage)
const memoryStorage = multer.memoryStorage();

// Legacy disk storage for backward compatibility
const diskStorage = multer.diskStorage({
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

// Cloud upload (memory storage)
const cloudUpload = multer({ 
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Legacy disk upload
const diskUpload = multer({ 
  storage: diskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/employers/account-status - Get employer account verification status
router.get('/account-status', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        accountStatus: employer.accountStatus,
        isVerified: employer.accountStatus === 'verified',
        profileComplete: employer.profileComplete,
        verificationNotes: employer.verificationNotes,
        verifiedAt: employer.verifiedAt,
        canPostJobs: employer.canPerform('post_jobs')
      }
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching account status',
      error: error.message
    });
  }
});

// GET /api/employers/profile - Get employer profile
router.get('/profile', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    res.json({
      success: true,
      data: employer.getPublicProfile()
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

// PUT /api/employers/profile - Update employer profile
router.put('/profile', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    const {
      companyName,
      companyDescription,
      industry,
      companySize,
      foundedYear,
      website,
      contactPerson,
      address,
      socialMedia,
      benefits,
      companyValues,
      workEnvironment
    } = req.body;

    // Update fields if provided
    if (companyName) employer.companyName = companyName;
    if (companyDescription) employer.companyDescription = companyDescription;
    if (industry) employer.industry = industry;
    if (companySize) employer.companySize = companySize;
    if (foundedYear) employer.foundedYear = foundedYear;
    if (website) employer.website = website;
    if (contactPerson) employer.contactPerson = { ...employer.contactPerson, ...contactPerson };
    if (address) employer.address = { ...employer.address, ...address };
    if (socialMedia) employer.socialMedia = { ...employer.socialMedia, ...socialMedia };
    if (benefits) employer.benefits = benefits;
    if (companyValues) employer.companyValues = companyValues;
    if (workEnvironment) employer.workEnvironment = workEnvironment;

    await employer.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: employer.getPublicProfile()
    });
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// POST /api/employers/upload-documents-cloud - Cloud-based document upload (RECOMMENDED)
router.post('/upload-documents-cloud', verifyToken, requireRole('employer'), cloudUpload.fields([
  { name: 'companyProfile', maxCount: 1 },
  { name: 'businessPermit', maxCount: 1 },
  { name: 'philjobnetRegistration', maxCount: 1 },
  { name: 'doleNoPendingCase', maxCount: 1 }
]), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    const uploadedFiles = req.files;
    
    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No documents were uploaded'
      });
    }

    // Validate required documents
    const requiredDocuments = ['companyProfile', 'businessPermit', 'philjobnetRegistration', 'doleNoPendingCase'];
    for (const docType of requiredDocuments) {
      if (!uploadedFiles[docType] || uploadedFiles[docType].length === 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required document: ${docType}`
        });
      }
    }    // Upload files to cloud storage and create documents array
    const documentsArray = [];
    
    for (const [docType, files] of Object.entries(uploadedFiles)) {
      if (files && files.length > 0) {
        const file = files[0];
        
        try {
          // Upload to cloud storage
          const cloudResult = await cloudStorageService.uploadBuffer(
            file.buffer, 
            file.originalname, 
            `users/${req.user.uid}/documents/${docType}`,
            file.mimetype
          );
          
          documentsArray.push({
            documentType: docType,
            documentName: file.originalname,
            cloudUrl: cloudResult.url,
            cloudPublicId: cloudResult.publicId,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
            isRequired: true
          });        } catch (uploadError) {          return res.status(500).json({
            success: false,
            message: `Failed to upload ${docType} to cloud storage`,
            error: uploadError.message
          });
        }
      }
    }

    // Update employer with company details and documents
    const {
      contactPersonFirstName,
      contactPersonLastName,
      contactNumber,
      companyDescription,
      companyAddress,
      natureOfBusiness
    } = req.body;

    if (contactPersonFirstName || contactPersonLastName) {
      const fullName = [contactPersonFirstName, contactPersonLastName]
        .filter(name => name && name.trim())
        .join(' ');
      
      employer.contactPerson = {
        ...employer.contactPerson,
        firstName: contactPersonFirstName || '',
        lastName: contactPersonLastName || '',
        fullName: fullName
      };
    }
    
    if (contactNumber) {
      employer.contactPerson = {
        ...employer.contactPerson,
        phoneNumber: contactNumber
      };
    }
    
    if (companyDescription) employer.companyDescription = companyDescription;
    if (companyAddress) {
      employer.address = {
        ...employer.address,
        street: companyAddress
      };
    }
    if (natureOfBusiness) employer.industry = natureOfBusiness;

    // Store documents in employer record
    employer.documents = documentsArray;
    employer.documentVerificationStatus = 'pending';
    employer.profileComplete = true;

    await employer.save();    res.json({
      success: true,
      message: 'Documents uploaded successfully to cloud storage',
      data: {
        employerId: employer._id,
        documentsCount: documentsArray.length,
        cloudUrls: documentsArray.map(doc => ({
          type: doc.documentType,
          url: doc.cloudUrl,
          uploadedAt: doc.uploadedAt
        })),
        profileStatus: {
          contactPerson: !!(contactPersonFirstName || contactPersonLastName),
          contactNumber: !!contactNumber,
          companyDescription: !!companyDescription,
          companyAddress: !!companyAddress,
          natureOfBusiness: !!natureOfBusiness
        }
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error uploading documents to cloud storage',
      error: error.message
    });
  }
});

// POST /api/employers/upload-single-document - Upload single document to cloud storage
router.post('/upload-single-document', verifyToken, requireRole('employer'), cloudUpload.fields([
  { name: 'companyProfile', maxCount: 1 },
  { name: 'businessPermit', maxCount: 1 },
  { name: 'philjobnetRegistration', maxCount: 1 },
  { name: 'doleNoPendingCase', maxCount: 1 }
]), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    const uploadedFiles = req.files;
    
    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No document was uploaded'
      });
    }    // Process the single uploaded document
    let uploadedDocument = null;
    let documentType = null;
    
    for (const [docType, files] of Object.entries(uploadedFiles)) {
      if (files && files.length > 0) {
        const file = files[0];
        documentType = docType;
        
        try {
          // Validate cloud storage service          cloudStorageService.validateConfig();          // Upload to cloud storage          const cloudResult = await cloudStorageService.uploadBuffer(
            file.buffer, 
            file.originalname, 
            `users/${req.user.uid}/documents/${docType}`,
            file.mimetype
          );
          
          uploadedDocument = {
            documentType: docType,
            documentName: file.originalname,
            cloudUrl: cloudResult.url,
            cloudPublicId: cloudResult.publicId,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
            isRequired: true
          };          break; // Only process one document
        } catch (uploadError) {          return res.status(500).json({
            success: false,
            message: `Failed to upload ${docType} to cloud storage`,
            error: uploadError.message
          });
        }
      }
    }

    if (!uploadedDocument) {
      return res.status(400).json({
        success: false,
        message: 'No valid document found to upload'
      });
    }

    // Update or add the document in employer's documents array
    if (!employer.documents) {
      employer.documents = [];
    }

    // Remove existing document of the same type
    employer.documents = employer.documents.filter(doc => doc.documentType !== documentType);
    
    // Add the new document
    employer.documents.push(uploadedDocument);
    
    // Update verification status to pending if all required documents are present
    const requiredDocuments = ['companyProfile', 'businessPermit', 'philjobnetRegistration', 'doleNoPendingCase'];
    const uploadedTypes = employer.documents.map(doc => doc.documentType);
    const allRequiredPresent = requiredDocuments.every(type => uploadedTypes.includes(type));
    
    if (allRequiredPresent) {
      employer.documentVerificationStatus = 'pending';
    }

    await employer.save();    res.json({
      success: true,
      message: 'Document uploaded successfully to cloud storage',
      data: {
        documentType: uploadedDocument.documentType,
        cloudUrl: uploadedDocument.cloudUrl,
        uploadedAt: uploadedDocument.uploadedAt,
        allRequiredPresent
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error uploading document to cloud storage',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/employers/view-document/:documentType - View document with proper access control
router.get('/view-document/:documentType', async (req, res) => {
  // Handle token from header or query parameter
  let token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && req.query.token) {
    token = req.query.token;
    req.headers.authorization = `Bearer ${token}`;
  }
  
  // Apply middleware manually
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      requireRole('employer')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (authError) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: authError.message
    });
  }
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }

    const documentType = req.params.documentType;
    const document = employer.documents?.find(doc => doc.documentType === documentType);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    let documentUrl = document.cloudUrl;    // If we have a cloudPublicId, generate a proper public URL
    if (document.cloudPublicId) {
      try {
        const publicUrl = cloudStorageService.generatePublicUrl(document.cloudPublicId);        documentUrl = publicUrl; // Use generated public URL
      } catch (error) {        // Fall back to original cloudUrl if public URL generation fails
      }
    }
    
    if (!documentUrl) {
      return res.status(404).json({
        success: false,
        message: 'Document URL not available - cloud storage required'
      });
    }    // Always fetch and serve the content directly to avoid CORS issues
    try {
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(documentUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;      const request = client.get(documentUrl, (response) => {        if (response.statusCode !== 200) {          // Try to read the error response body
          let errorBody = '';
          response.on('data', chunk => errorBody += chunk);
          response.on('end', () => {            return res.status(response.statusCode).json({
              success: false,
              message: `Failed to fetch document: ${response.statusMessage}`,
              details: errorBody
            });
          });
          return;
        }        // Set appropriate headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${document.documentName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
        
        // Stream the PDF content directly to the response
        response.pipe(res);
      });
      
      request.on('error', (error) => {        res.status(500).json({
          success: false,
          message: 'Failed to fetch document',
          error: error.message
        });
      });
      
      request.setTimeout(30000, () => {        request.destroy();
        res.status(408).json({
          success: false,
          message: 'Document request timeout'
        });
      });
      
    } catch (fetchError) {      res.status(500).json({
        success: false,
        message: 'Error accessing document',
        error: fetchError.message
      });
    }

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error accessing document',
      error: error.message
    });
  }
});

// Keep the old file-based upload for backward compatibility
router.post('/upload-documents', verifyToken, requireRole('employer'), diskUpload.fields([
  { name: 'companyProfile', maxCount: 1 },
  { name: 'businessPermit', maxCount: 1 },
  { name: 'philjobnetRegistration', maxCount: 1 },
  { name: 'doleNoPendingCase', maxCount: 1 }
]), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
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

    // Extract company details from request body
    const {
      contactPersonFirstName,
      contactPersonLastName,
      contactNumber,
      companyDescription,
      companyAddress,
      natureOfBusiness
    } = req.body;


    // Process documents into array format
    const documentsArray = [];
    
    for (const [docType, files] of Object.entries(uploadedFiles)) {
      if (files && files.length > 0) {
        const file = files[0];
        
        documentsArray.push({
          documentType: docType,
          documentName: file.originalname,
          cloudUrl: '', // Will be updated after cloud upload
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
          isRequired: true
        });
      }
    }    // Update employer with company details
    if (contactPersonFirstName || contactPersonLastName) {
      const fullName = [contactPersonFirstName, contactPersonLastName]
        .filter(name => name && name.trim())
        .join(' ');
      
      employer.contactPerson = {
        ...employer.contactPerson,
        firstName: contactPersonFirstName || '',
        lastName: contactPersonLastName || '',
        fullName: fullName
      };
    }
    
    if (contactNumber) {
      employer.contactPerson = {
        ...employer.contactPerson,
        phoneNumber: contactNumber
      };
    }
    
    if (companyDescription) {
      employer.companyDescription = companyDescription;
    }
    
    if (companyAddress) {
      employer.address = {
        ...employer.address,
        street: companyAddress,
        full: companyAddress
      };
    }
    
    if (natureOfBusiness) {
      employer.industry = natureOfBusiness;
    }

    // Save documents directly to employer record
    employer.documents = documentsArray;
    employer.documentVerificationStatus = 'pending';
    employer.documentVerifiedAt = undefined;
    employer.documentRejectionReason = undefined;
    employer.documentAdminNotes = undefined;
    

    // Update employer account status
    employer.accountStatus = 'pending';
    employer.verificationNotes = 'Documents and company information uploaded, pending review';
    
    await employer.save();

    res.json({
      success: true,
      message: 'Documents and company information uploaded successfully and are now under review',
      data: {
        documentsUploaded: documentsArray.length,
        accountStatus: employer.accountStatus,
        companyDetailsUpdated: {
          contactPersonFirstName: !!contactPersonFirstName,
          contactPersonLastName: !!contactPersonLastName,
          contactNumber: !!contactNumber,
          companyDescription: !!companyDescription,
          companyAddress: !!companyAddress,
          natureOfBusiness: !!natureOfBusiness
        },
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

// GET /api/employers/documents/pending - Get all pending documents for admin review
router.get('/documents/pending', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const pendingDocuments = await EmployerDocument.find({ 
      verificationStatus: 'pending' 
    })
    .populate('employerId', 'companyName email accountStatus')
    .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: pendingDocuments.map(doc => ({
        _id: doc._id,
        documentType: doc.documentType,
        documentName: doc.documentName,
        cloudUrl: doc.cloudUrl,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        verificationStatus: doc.verificationStatus,
        employer: {
          _id: doc.employerId._id,
          companyName: doc.employerId.companyName,
          email: doc.employerId.email,
          accountStatus: doc.employerId.accountStatus
        }
      }))
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching pending documents',
      error: error.message
    });
  }
});

// GET /api/employers/:employerId/documents - Get employer verification documents
router.get('/:employerId/documents', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { employerId } = req.params;
    
    const employer = await Employer.findById(employerId);
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    res.json({
      success: true,
      data: {
        employer: {
          _id: employer._id,
          companyName: employer.companyName,
          email: employer.email,
          accountStatus: employer.accountStatus
        },
        documents: employer.documents || []
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message
    });
  }
});

// PUT /api/employers/documents/:documentId/verify - Approve or reject a document
router.put('/documents/:documentId/verify', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { action, rejectionReason, adminNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a document'
      });
    }

    const document = await EmployerDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Update document status
    document.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    document.verifiedAt = new Date();
    document.verifiedBy = req.user.uid;
    
    if (rejectionReason) {
      document.rejectionReason = rejectionReason;
    }
    
    if (adminNotes) {
      document.adminNotes = adminNotes;
    }

    await document.save();

    // Check if all required documents are approved for this employer
    const allApproved = await EmployerDocument.areAllRequiredDocumentsApproved(document.employerId);
    
    // Update employer status if all documents are approved
    if (allApproved) {
      await Employer.findByIdAndUpdate(document.employerId, {
        accountStatus: 'verified',
        verificationNotes: 'All documents approved',
        verifiedAt: new Date(),
        verifiedBy: req.user.uid
      });
    }

    res.json({
      success: true,
      message: `Document ${action}d successfully`,
      data: {
        documentId: document._id,
        verificationStatus: document.verificationStatus,
        employerVerified: allApproved
      }
    });

  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error verifying document',
      error: error.message
    });
  }
});

// GET /api/employers/documents/:documentId - Get document by ID (Base64 version)
router.get('/documents/:documentId', verifyToken, async (req, res) => {
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
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check if user has permission to view this document
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && employer.uid !== req.user.uid) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    
    // Return document data
    if (document.cloudUrl) {
      // Cloud storage format (RECOMMENDED)
      res.json({
        success: true,
        document: {
          id: document._id,
          name: document.documentName,
          type: document.documentType,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          url: document.cloudUrl,
          uploadedAt: document.uploadedAt
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Document not available - cloud URL missing'
      });
    }
    
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching document',
      error: error.message
    });
  }
});

// GET /api/employers/documents - Get all documents for current employer
router.get('/documents', verifyToken, requireRole('employer'), async (req, res) => {
  try {
    const employer = await Employer.findOne({ uid: req.user.uid });
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    const documents = (employer.documents || []).map(doc => ({
      id: doc._id,
      name: doc.documentName,
      type: doc.documentType,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
      hasData: !!doc.cloudUrl
    }));
    
    res.json({
      success: true,
      documents
    });
    
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message
    });
  }
});

module.exports = router;
