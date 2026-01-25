const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const notificationController = {
  /**
   * Get user notifications
   */
  getNotifications: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await Notification.findByUserId(req.user.id, limit);
    sendSuccess(res, 200, 'Notifications retrieved successfully', notifications);
  }),
  
  /**
   * Get unread notifications
   */
  getUnreadNotifications: asyncHandler(async (req, res) => {
    const notifications = await Notification.findUnread(req.user.id);
    sendSuccess(res, 200, 'Unread notifications retrieved successfully', notifications);
  }),
  
  /**
   * Get unread count
   */
  getUnreadCount: asyncHandler(async (req, res) => {
    const count = await Notification.getUnreadCount(req.user.id);
    sendSuccess(res, 200, 'Unread count retrieved successfully', { count });
  }),
  
  /**
   * Mark notification as read
   */
  markAsRead: asyncHandler(async (req, res) => {
    const notification = await Notification.markAsRead(req.params.id);
    sendSuccess(res, 200, 'Notification marked as read', notification);
  }),
  
  /**
   * Mark all as read
   */
  markAllAsRead: asyncHandler(async (req, res) => {
    await Notification.markAllAsRead(req.user.id);
    sendSuccess(res, 200, 'All notifications marked as read');
  }),
  
  /**
   * Delete notification
   */
  deleteNotification: asyncHandler(async (req, res) => {
    await Notification.delete(req.params.id);
    sendSuccess(res, 200, 'Notification deleted successfully');
  }),
  
  /**
   * Create notification (Admin/HR)
   */
  createNotification: asyncHandler(async (req, res) => {
    const { user_id, title, message, type, link } = req.body;
    
    const notification = await Notification.create({
      user_id,
      title,
      message,
      type,
      link,
    });
    
    sendSuccess(res, 201, 'Notification created successfully', notification);
  }),
};

module.exports = notificationController;