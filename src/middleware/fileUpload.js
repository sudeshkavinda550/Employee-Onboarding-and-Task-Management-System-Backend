const upload = require('../config/multer');
const { sendError } = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * Handle single file upload
 * @param {string} fieldName 
 */
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 400, 'File size exceeds maximum limit of 10MB');
        }
        
        return sendError(res, 400, err.message);
      }
      
      next();
    });
  };
};

/**
 * Handle multiple file uploads
 * @param {string} fieldName 
 * @param {number} maxCount 
 */
const uploadMultiple = (fieldName, maxCount = 10) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 400, 'File size exceeds maximum limit of 10MB');
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return sendError(res, 400, `Too many files. Maximum ${maxCount} files allowed`);
        }
        
        return sendError(res, 400, err.message);
      }
      
      next();
    });
  };
};

/**
 * Validate uploaded file
 */
const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return sendError(res, 400, 'No file uploaded');
  }
  
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  validateFile,
};
