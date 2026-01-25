const { verifyToken } = require('../utils/generateToken');
const { sendError } = require('../utils/responseHandler');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'No token provided. Please login.');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const result = await query(
      'SELECT id, name, email, role, employee_id, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return sendError(res, 401, 'User not found');
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return sendError(res, 403, 'Account has been disabled');
    }
    
    // Attach user to request
    req.user = user;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return sendError(res, 401, 'Invalid or expired token');
  }
};


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    const result = await query(
      'SELECT id, name, email, role, employee_id, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = result.rows[0];
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};