const { body, param } = require('express-validator');

const templateValidator = {
  /**
   * Create template validation
   */
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Template name must be between 2 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    
    body('department_id')
      .optional()
      .isUUID()
      .withMessage('Invalid department ID'),
    
    body('estimated_completion_days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Estimated completion days must be between 1 and 365'),
    
    body('tasks')
      .optional()
      .isArray()
      .withMessage('Tasks must be an array'),
    
    body('tasks.*.title')
      .if(body('tasks').exists())
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Task title must be between 2 and 200 characters'),
    
    body('tasks.*.task_type')
      .if(body('tasks').exists())
      .notEmpty()
      .withMessage('Task type is required')
      .isIn(['upload', 'read', 'watch', 'meeting', 'form', 'training'])
      .withMessage('Invalid task type'),
    
    body('tasks.*.order_index')
      .if(body('tasks').exists())
      .isInt({ min: 1 })
      .withMessage('Task order index must be a positive integer'),
  ],
  
  /**
   * Update template validation
   */
  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Template name must be between 2 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    
    body('department_id')
      .optional()
      .isUUID()
      .withMessage('Invalid department ID'),
    
    body('estimated_completion_days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Estimated completion days must be between 1 and 365'),
    
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ],
  
  /**
   * Template ID param validation
   */
  validateId: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
  
  /**
   * Duplicate template validation
   */
  duplicate: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
};

module.exports = templateValidator;