const validator = require('validator');

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Valid or not
 */
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Valid or not
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

/**
 * Sanitize input string
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

/**
 * Validate UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean} Valid or not
 */
const isValidUUID = (uuid) => {
  return validator.isUUID(uuid, 4);
};

/**
 * Validate date
 * @param {string} date - Date to validate
 * @returns {boolean} Valid or not
 */
const isValidDate = (date) => {
  return validator.isDate(date);
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} Valid or not
 */
const isValidURL = (url) => {
  return validator.isURL(url);
};

module.exports = {
  isValidEmail,
  validatePassword,
  isValidPhone,
  sanitizeInput,
  isValidUUID,
  isValidDate,
  isValidURL,
};
