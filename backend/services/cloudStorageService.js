const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary (free tier: 25GB storage, 25GB bandwidth/month)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify configuration (silent)
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
}

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employer-documents', // Organize files in folders
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'],
    resource_type: 'auto', // Automatically detect file type
    public_id: (req, file) => {
      // Generate unique filename: employerUid_documentType_timestamp
      const timestamp = Date.now();
      const employerUid = req.user?.uid || 'unknown';
      const docType = file.fieldname || 'document';
      return `${employerUid}_${docType}_${timestamp}`;
    },
  },
});

// Multer configuration with Cloudinary
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'), false);
    }
  }
});

class CloudStorageService {
  
  // Upload single file to Cloudinary
  async uploadFile(file, folder = 'documents') {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `employer-documents/${folder}`,
        resource_type: 'auto',
        public_id: `${Date.now()}_${file.originalname}`,
      });
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      throw new Error('Failed to upload file to cloud storage');
    }
  }
  async uploadBuffer(buffer, filename, folder = 'documents', mimeType = null) {
    try {
      // Validate Cloudinary configuration first
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
      }
      
      // Determine resource type based on file type
      const isImage = mimeType && mimeType.startsWith('image/');
      const isPDF = mimeType === 'application/pdf';
      const resourceType = isImage ? 'image' : 'raw';
      
      // Use the folder path as-is (already formatted as users/{uid}/...)
      const cloudFolder = folder;
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: cloudFolder,
          resource_type: resourceType,
          public_id: `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
          access_mode: 'public',
          type: 'upload',
          invalidate: true,
        };
        
        // Add image-specific transformations for photos
        if (isImage && folder.includes('photos')) {
          uploadOptions.transformation = [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ];
        }
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
              });
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      throw new Error(`Failed to upload buffer to cloud storage: ${error.message}`);
    }
  }

  // Upload image buffer to Cloudinary (for profile pictures)
  async uploadImageBuffer(buffer, filename, folder = 'profile-pictures') {
    try {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: folder, // Use folder path as-is (already formatted as users/{uid}/photos)
            resource_type: 'image', // Use 'image' for profile pictures
            public_id: `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`, // Remove extension from filename
            access_mode: 'public', // Ensure public access
            type: 'upload', // Specify upload type
            invalidate: true, // Clear CDN cache
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Optimize for profile pictures
              { quality: 'auto', fetch_format: 'auto' } // Auto optimization
            ]
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
              });
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      throw new Error('Failed to upload image buffer to cloud storage');
    }
  }

  // Delete file from Cloudinary
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new Error('Failed to delete file from cloud storage');
    }
  }

  // Generate public URL for document access
  generatePublicUrl(publicId) {
    try {
      // Use Cloudinary's URL generation for raw files (PDFs)
      const publicUrl = cloudinary.url(publicId, {
        resource_type: 'raw', // Use 'raw' for PDFs and documents
        type: 'upload',
        secure: true
      });
      
      return publicUrl;
    } catch (error) {
      throw new Error('Failed to generate public URL');
    }
  }

  // Generate signed URL for secure access (for private resources)
  generateSignedUrl(publicId, expiresIn = 3600) {
    try {
      const timestamp = Math.round(Date.now() / 1000) + expiresIn;
      
      const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
        expires_at: timestamp,
      });
      
      return signedUrl;
    } catch (error) {
      throw new Error('Failed to generate signed URL');
    }
  }

  // Get file info
  async getFileInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        url: result.secure_url,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      throw new Error('Failed to get file information');
    }
  }

  // Transform image (resize, optimize)
  getOptimizedUrl(publicId, options = {}) {
    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      width: options.width || 800,
      height: options.height || 600,
      crop: 'limit',
    };

    return cloudinary.url(publicId, { ...defaultOptions, ...options });
  }

  // Get multer upload middleware
  getUploadMiddleware() {
    return upload;
  }

  // Validate Cloudinary configuration
  validateConfig() {
    const requiredEnvVars = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY', 
      'CLOUDINARY_API_SECRET'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      throw new Error(`Missing Cloudinary environment variables: ${missing.join(', ')}`);
    }

    return true;
  }

  // Health check
  async healthCheck() {
    try {
      await cloudinary.api.ping();
      return { status: 'healthy', service: 'cloudinary' };
    } catch (error) {
      return { status: 'unhealthy', service: 'cloudinary', error: error.message };
    }
  }
}

module.exports = new CloudStorageService();