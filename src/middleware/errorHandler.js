const logger = require('../utils/logger');
const { sendError } = require('../utils/responseHandler');


const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, 400, 'Validation error', errors);
  }
  
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token expired');
  }
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 400, 'File size too large');
    }
    return sendError(res, 400, 'File upload error: ' + err.message);
  }
  
  if (err.code === '23505') { 
    return sendError(res, 409, 'Resource already exists');
  }
  
  if (err.code === '23503') { 
    return sendError(res, 400, 'Referenced resource not found');
  }
  
  if (err.code === '23502') { 
    return sendError(res, 400, 'Required field missing');
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  sendError(res, statusCode, message);
};

/**
 * Handle 404 errors
 */
const notFound = (req, res) => {
  sendError(res, 404, `Route ${req.originalUrl} not found`);
};


const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
};
