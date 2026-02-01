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
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    
    body('department_id')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        // If value exists, it must be a valid UUID
        if (value) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            throw new Error('Department ID must be a valid UUID format');
          }
        }
        return true;
      }),
    
    body('estimated_completion_days')
      .optional({ nullable: true, checkFalsy: true })
      .isInt({ min: 1, max: 365 })
      .withMessage('Estimated completion days must be between 1 and 365'),
    
    body('tasks')
      .optional({ nullable: true, checkFalsy: true })
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
      .withMessage('Task type must be one of: upload, read, watch, meeting, form, training'),
    
    body('tasks.*.order_index')
      .if(body('tasks').exists())
      .isInt({ min: 1 })
      .withMessage('Task order index must be a positive integer'),
    
    body('tasks.*.description')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Task description must not exceed 1000 characters'),
    
    body('tasks.*.is_required')
      .optional({ nullable: true })
      .isBoolean()
      .withMessage('is_required must be a boolean'),
    
    body('tasks.*.estimated_time')
      .optional({ nullable: true, checkFalsy: true })
      .isInt({ min: 1, max: 1440 })
      .withMessage('Estimated time must be between 1 and 1440 minutes'),
    
    body('tasks.*.resource_url')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('Resource URL must be a valid URL'),
  ],
  
  /**
   * Update template validation
   */
  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID format'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Template name must be between 2 and 200 characters'),
    
    body('description')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    
    body('department_id')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            throw new Error('Department ID must be a valid UUID format');
          }
        }
        return true;
      }),
    
    body('estimated_completion_days')
      .optional({ nullable: true, checkFalsy: true })
      .isInt({ min: 1, max: 365 })
      .withMessage('Estimated completion days must be between 1 and 365'),
    
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
    
    // Task validation for updates
    body('tasks')
      .optional({ nullable: true, checkFalsy: true })
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
      .withMessage('Task type must be one of: upload, read, watch, meeting, form, training'),
    
    body('tasks.*.order_index')
      .if(body('tasks').exists())
      .isInt({ min: 1 })
      .withMessage('Task order index must be a positive integer'),
  ],
  
  /**
   * Template ID param validation
   */
  validateId: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID format'),
  ],
  
  /**
   * Duplicate template validation
   */
  duplicate: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID format'),
  ],
  
  /**
   * Helper function to check if a string is a valid UUID
   */
  isValidUUID: (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  },
};

module.exports = templateValidator;