const pool = require('../config/database');
const logger = require('../utils/logger');

class Notification {
  static async findByUserId(userId, limit = 20) {
    try {
      logger.info(`[Notification.findByUserId] Fetching notifications for user: ${userId}`);
      
      const result = await pool.query(
        `SELECT id, user_id, title, message, type, is_read, link, created_at 
         FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );
      
      logger.info(`[Notification.findByUserId] Found ${result.rows.length} notifications`);
      
      return result.rows.map(n => ({
        ...n,
        priority: 'low'
      }));
    } catch (error) {
      logger.error('[Notification.findByUserId] Error:', error);
      throw error;
    }
  }

  static async findUnread(userId) {
    try {
      const result = await pool.query(
        `SELECT id, user_id, title, message, type, is_read, link, created_at 
         FROM notifications 
         WHERE user_id = $1 AND is_read = false 
         ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows.map(n => ({
        ...n,
        priority: 'low'
      }));
    } catch (error) {
      logger.error('[Notification.findUnread] Error:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      logger.info(`[Notification.getUnreadCount] Counting for user: ${userId}`);
      
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      );
      
      logger.info(`[Notification.getUnreadCount] Result:`, result.rows[0]);
      
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      logger.error('[Notification.getUnreadCount] Error:', error);
      logger.error('[Notification.getUnreadCount] userId:', userId);
      throw error;
    }
  }

  static async markAsRead(notificationId) {
    try {
      await pool.query(
        'UPDATE notifications SET is_read = true WHERE id = $1',
        [notificationId]
      );
      
      const result = await pool.query(
        'SELECT id, user_id, title, message, type, is_read, link, created_at FROM notifications WHERE id = $1',
        [notificationId]
      );
      
      return result.rows[0] ? { ...result.rows[0], priority: 'low' } : null;
    } catch (error) {
      logger.error('[Notification.markAsRead] Error:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      await pool.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1',
        [userId]
      );
      
      logger.info(`[Notification.markAllAsRead] Marked all as read for user: ${userId}`);
    } catch (error) {
      logger.error('[Notification.markAllAsRead] Error:', error);
      throw error;
    }
  }

  static async delete(notificationId) {
    try {
      await pool.query(
        'DELETE FROM notifications WHERE id = $1',
        [notificationId]
      );
      
      logger.info(`[Notification.delete] Deleted notification: ${notificationId}`);
    } catch (error) {
      logger.error('[Notification.delete] Error:', error);
      throw error;
    }
  }

  static async clearAll(userId) {
    try {
      const result = await pool.query(
        'DELETE FROM notifications WHERE user_id = $1',
        [userId]
      );
      
      logger.info(`[Notification.clearAll] Cleared ${result.rowCount} notifications for user: ${userId}`);
      return result.rowCount;
    } catch (error) {
      logger.error('[Notification.clearAll] Error:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, user_id, title, message, type, is_read, link, created_at`,
        [
          data.user_id,
          data.title,
          data.message,
          data.type || 'system',
          data.link || null
        ]
      );
      
      logger.info(`[Notification.create] Created notification: ${result.rows[0].id}`);
      return result.rows[0] ? { ...result.rows[0], priority: 'low' } : null;
    } catch (error) {
      logger.error('[Notification.create] Error:', error);
      throw error;
    }
  }
}

module.exports = Notification;