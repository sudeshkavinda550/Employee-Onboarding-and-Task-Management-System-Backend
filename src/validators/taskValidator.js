const { body, param } = require('express-validator');

const taskValidator = {
  /**
   * Create task validation
   */
  create: [
    body('template_id')
      .notEmpty()
      .withMessage('Template ID is required')
      .isUUID()
      .withMessage('Invalid template ID'),
    
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Title must be between 2 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    
    body('task_type')
      .notEmpty()
      .withMessage('Task type is required')
      .isIn(['upload', 'read', 'watch', 'meeting', 'form', 'training'])
      .withMessage('Invalid task type'),
    
    body('is_required')
      .optional()
      .isBoolean()
      .withMessage('is_required must be a boolean'),
    
    body('estimated_time')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Estimated time must be a positive integer'),
    
    body('order_index')
      .notEmpty()
      .withMessage('Order index is required')
      .isInt({ min: 1 })
      .withMessage('Order index must be a positive integer'),
    
    body('resource_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid resource URL'),
  ],
  
  /**
   * Update task validation
   */
  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid task ID'),
    
    body('title')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Title must be between 2 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    
    body('task_type')
      .optional()
      .isIn(['upload', 'read', 'watch', 'meeting', 'form', 'training'])
      .withMessage('Invalid task type'),
    
    body('is_required')
      .optional()
      .isBoolean()
      .withMessage('is_required must be a boolean'),
    
    body('estimated_time')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Estimated time must be a positive integer'),
    
    body('order_index')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Order index must be a positive integer'),
  ],
  
  /**
   * Update task status validation
   */
  updateStatus: [
    param('id')
      .isUUID()
      .withMessage('Invalid task ID'),
    
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['pending', 'in_progress', 'completed', 'overdue'])
      .withMessage('Invalid status'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must not exceed 500 characters'),
  ],
  
  /**
   * Task ID param validation
   */
  validateId: [
    param('id')
      .isUUID()
      .withMessage('Invalid task ID'),
  ],
};

module.exports = taskValidator;