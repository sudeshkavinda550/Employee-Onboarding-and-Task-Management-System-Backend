const { sendError } = require('../utils/responseHandler');
const { ROLES } = require('../utils/constants');

/**
 * Check if user has required role
 * @param  {...string} allowedRoles 
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, 'You do not have permission to access this resource');
    }
    
    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = checkRole(ROLES.ADMIN);

/**
 * Check if user is HR or Admin
 */
const isHROrAdmin = checkRole(ROLES.HR, ROLES.ADMIN);

/**
 * Check if user is employee
 */
const isEmployee = checkRole(ROLES.EMPLOYEE);

/**
 * Check if user owns the resource or is HR/Admin
 */
const isOwnerOrHR = (resourceUserIdField = 'employee_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }
    
    // Admin and HR can access any resource
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR) {
      return next();
    }
    
    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return sendError(res, 403, 'You do not have permission to access this resource');
    }
    
    next();
  };
};

module.exports = {
  checkRole,
  isAdmin,
  isHROrAdmin,
  isEmployee,
  isOwnerOrHR,
};