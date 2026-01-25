const { body, param } = require('express-validator');

const documentValidator = {
  /**
   * Upload document validation (metadata)
   */
  upload: [
    body('task_id')
      .optional()
      .isUUID()
      .withMessage('Invalid task ID'),
  ],
  
  /**
   * Approve document validation
   */
  approve: [
    param('id')
      .isUUID()
      .withMessage('Invalid document ID'),
  ],
  
  /**
   * Reject document validation
   */
  reject: [
    param('id')
      .isUUID()
      .withMessage('Invalid document ID'),
    
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Rejection reason is required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Rejection reason must be between 10 and 500 characters'),
  ],
  
  /**
   * Document ID param validation
   */
  validateId: [
    param('id')
      .isUUID()
      .withMessage('Invalid document ID'),
  ],
};

module.exports = documentValidator;