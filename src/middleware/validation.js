const { validationResult } = require('express-validator');
const { sendError } = require('../utils/responseHandler');

/**
 * Validate request using express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
    }));
    
    return sendError(res, 400, 'Validation failed', formattedErrors);
  }
  
  next();
};

module.exports = {
  validate,
};