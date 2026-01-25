const { query } = require('../config/database');

const Notification = {
  /**
   * Create notification
   */
  create: async (notificationData) => {
    const { user_id, title, message, type, link } = notificationData;
    
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, title, message, type, link]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find notifications by user ID
   */
  findByUserId: async (user_id, limit = 20) => {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [user_id, limit]
    );
    
    return result.rows;
  },
  
  /**
   * Find unread notifications
   */
  findUnread: async (user_id) => {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND is_read = false
       ORDER BY created_at DESC`,
      [user_id]
    );
    
    return result.rows;
  },
  
  /**
   * Mark as read
   */
  markAsRead: async (id) => {
    const result = await query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Mark all as read
   */
  markAllAsRead: async (user_id) => {
    await query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [user_id]
    );
  },
  
  /**
   * Delete notification
   */
  delete: async (id) => {
    await query('DELETE FROM notifications WHERE id = $1', [id]);
  },
  
  /**
   * Get unread count
   */
  getUnreadCount: async (user_id) => {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [user_id]
    );
    
    return parseInt(result.rows[0].count);
  },
};

module.exports = Notification;
