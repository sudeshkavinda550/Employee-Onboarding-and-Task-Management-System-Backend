const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper function to create directory if it doesn't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create base uploads directory structure
const baseUploadDir = path.join(__dirname, '../../uploads');
ensureDirectoryExists(baseUploadDir);

// ==================== PROFILE PICTURES CONFIGURATION ====================
const profileUploadDir = path.join(baseUploadDir, 'profile-pictures');
ensureDirectoryExists(profileUploadDir);

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${fileExt}`);
  }
});

const profileFileFilter = (req, file, cb) => {
  // Accept images only for profile pictures
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for profile pictures!'), false);
  }
};

// ==================== TEMPLATE DOCUMENTS CONFIGURATION ====================
const templateUploadDir = path.join(baseUploadDir, 'templates');
ensureDirectoryExists(templateUploadDir);

const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use template ID from params or 'temp' for new templates
    const templateId = req.params.id || req.body.template_id || 'temp';
    const templateDir = path.join(templateUploadDir, templateId.toString());
    ensureDirectoryExists(templateDir);
    cb(null, templateDir);
  },
  filename: (req, file, cb) => {
    // Generate safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = path.parse(file.originalname).name;
    const safeName = originalName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${safeName}-${uniqueSuffix}${fileExt}`);
  }
});

const templateFileFilter = (req, file, cb) => {
  // Allowed file types for template documents
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text files
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-rar-compressed'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB for documents

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`File type not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, Images, ZIP, RAR`), false);
  }

  if (file.size > maxFileSize) {
    return cb(new Error(`File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`), false);
  }

  cb(null, true);
};

// ==================== EXPORT CONFIGURATIONS ====================

// Profile picture upload (single file)
const profileUpload = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for profile pictures
    files: 1 // Single file only
  }
});

// Template document upload (single file)
const templateDocumentUpload = multer({
  storage: templateStorage,
  fileFilter: templateFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for documents
    files: 1 // Single file per request
  }
});

// Template documents upload (multiple files)
const templateDocumentsUpload = multer({
  storage: templateStorage,
  fileFilter: templateFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Max 10 files per request
  }
});

// Generic file upload (for any type)
const genericUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const type = req.query.type || 'generic';
      const uploadDir = path.join(baseUploadDir, type);
      ensureDirectoryExists(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExt = path.extname(file.originalname);
      cb(null, `file-${uniqueSuffix}${fileExt}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB default
  }
});

module.exports = {
  // Single upload middlewares
  profileUpload: profileUpload.single('profile_picture'),
  templateDocumentUpload: templateDocumentUpload.single('file'),
  
  // Multiple upload middlewares
  templateDocumentsUpload: templateDocumentsUpload.array('files', 10),
  
  // Generic upload middleware
  genericUpload: genericUpload.single('file'),
  
  // Raw configurations for custom usage
  multer,
  
  // Helper functions
  deleteFile: (filePath) => {
    return new Promise((resolve, reject) => {
      const fullPath = path.join(__dirname, '../../', filePath);
      fs.unlink(fullPath, (err) => {
        if (err) {
          // If file doesn't exist, consider it deleted
          if (err.code === 'ENOENT') {
            resolve(true);
          } else {
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });
  },
  
  getFileUrl: (req, filePath) => {
    if (!filePath) return null;
    
    // Remove any leading dots or slashes
    const cleanPath = filePath.replace(/^\.\.\//, '').replace(/^\//, '');
    
    // Return full URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/${cleanPath}`;
  },
  
  // Utility to clean up orphaned temp files
  cleanupTempFiles: (tempDir = 'temp', olderThanHours = 24) => {
    const tempPath = path.join(templateUploadDir, tempDir);
    
    if (!fs.existsSync(tempPath)) {
      return 0;
    }
    
    const files = fs.readdirSync(tempPath);
    const now = Date.now();
    const cutoff = olderThanHours * 60 * 60 * 1000; // Convert hours to milliseconds
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(tempPath, file);
      const stats = fs.statSync(filePath);
      
      // Delete files older than cutoff
      if (now - stats.mtimeMs > cutoff) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    // Remove empty directory
    if (fs.readdirSync(tempPath).length === 0) {
      fs.rmdirSync(tempPath);
    }
    
    return deletedCount;
  }
};