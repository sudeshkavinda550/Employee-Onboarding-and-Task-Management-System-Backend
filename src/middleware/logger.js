const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Log API requests
 */
const logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || null,
    });
  });
  
  next();
};

/**
 * Log user activity to database
 */
const logActivity = (action, entityType = null) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        await query(
          `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user.id,
            action,
            entityType,
            req.params.id || null,
            JSON.stringify(req.body),
            req.ip,
            req.get('user-agent'),
          ]
        );
      }
    } catch (error) {
      logger.error('Activity logging error:', error);
    }
    
    next();
  };
};

module.exports = {
  logRequest,
  logActivity,
};