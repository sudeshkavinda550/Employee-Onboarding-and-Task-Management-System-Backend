const { query } = require('../config/database');

const ActivityLog = {
  /**
   * Create activity log
   */
  create: async (logData) => {
    const {
      user_id,
      action,
      entity_type,
      entity_id,
      details,
      ip_address,
      user_agent,
    } = logData;
    
    const result = await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, action, entity_type, entity_id, details, ip_address, user_agent]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find logs by user ID
   */
  findByUserId: async (user_id, limit = 50) => {
    const result = await query(
      `SELECT * FROM activity_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [user_id, limit]
    );
    
    return result.rows;
  },
  
  /**
   * Find all logs with filters
   */
  findAll: async (filters = {}) => {
    let queryText = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.user_id) {
      queryText += ` AND al.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }
    
    if (filters.action) {
      queryText += ` AND al.action = $${paramCount}`;
      params.push(filters.action);
      paramCount++;
    }
    
    if (filters.entity_type) {
      queryText += ` AND al.entity_type = $${paramCount}`;
      params.push(filters.entity_type);
      paramCount++;
    }
    
    if (filters.startDate) {
      queryText += ` AND al.created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }
    
    if (filters.endDate) {
      queryText += ` AND al.created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }
    
    queryText += ` ORDER BY al.created_at DESC LIMIT ${filters.limit || 100}`;
    
    const result = await query(queryText, params);
    return result.rows;
  },
  
  /**
   * Get recent activity
   */
  getRecent: async (limit = 20) => {
    const result = await query(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  },
  
  /**
   * Delete old logs
   */
  deleteOld: async (days = 90) => {
    await query(
      `DELETE FROM activity_logs
       WHERE created_at < NOW() - INTERVAL '${days} days'`
    );
  },
};

module.exports = ActivityLog;