const { body, param } = require('express-validator');

const employeeValidator = {
  /**
   * Create employee validation
   */
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    
    body('employee_id')
      .trim()
      .notEmpty()
      .withMessage('Employee ID is required')
      .isLength({ max: 50 })
      .withMessage('Employee ID must not exceed 50 characters'),
    
    body('position')
      .trim()
      .notEmpty()
      .withMessage('Position is required')
      .isLength({ max: 100 })
      .withMessage('Position must not exceed 100 characters'),
    
    body('department_id')
      .optional()
      .isUUID()
      .withMessage('Invalid department ID'),
    
    body('start_date')
      .notEmpty()
      .withMessage('Start date is required')
      .isISO8601()
      .withMessage('Invalid date format'),
    
    body('manager_id')
      .optional()
      .isUUID()
      .withMessage('Invalid manager ID'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
      .withMessage('Invalid phone number'),
  ],
  
  /**
   * Update employee validation
   */
  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid employee ID'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('employee_id')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Employee ID must not exceed 50 characters'),
    
    body('position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must not exceed 100 characters'),
    
    body('department_id')
      .optional()
      .isUUID()
      .withMessage('Invalid department ID'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
      .withMessage('Invalid phone number'),
    
    body('onboarding_status')
      .optional()
      .isIn(['not_started', 'in_progress', 'completed', 'overdue'])
      .withMessage('Invalid onboarding status'),
  ],
  
  /**
   * Assign template validation
   */
  assignTemplate: [
    param('id')
      .isUUID()
      .withMessage('Invalid employee ID'),
    
    body('templateId')
      .notEmpty()
      .withMessage('Template ID is required')
      .isUUID()
      .withMessage('Invalid template ID'),
  ],
  
  /**
   * Employee ID param validation
   */
  validateId: [
    param('id')
      .isUUID()
      .withMessage('Invalid employee ID'),
  ],
};

module.exports = employeeValidator;