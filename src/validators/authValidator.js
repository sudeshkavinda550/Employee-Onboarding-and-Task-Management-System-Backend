const { body } = require('express-validator');

const authValidator = {
  /**
   * Register validation
   */
  register: [
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
    
    body('role')
      .optional()
      .isIn(['employee', 'hr', 'admin'])
      .withMessage('Invalid role'),
    
    body('employee_id')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Employee ID must not exceed 50 characters'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
      .withMessage('Invalid phone number'),
  ],
  
  /**
   * Login validation
   */
  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  
  /**
   * Forgot password validation
   */
  forgotPassword: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
  ],
  
  /**
   * Reset password validation - FIXED FOR OTP
   */
  resetPassword: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('otp')
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be exactly 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    
    body('confirmPassword')
      .optional() // Frontend validates this, backend doesn't need it
      .custom((value, { req }) => {
        if (value && value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],
  
  /**
   * Change password validation
   */
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    
    body('confirmPassword')
      .notEmpty()
      .withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],
  
  /**
   * Update profile validation
   */
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
      .withMessage('Invalid phone number'),
    
    body('date_of_birth')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
  ],
};

module.exports = authValidator;