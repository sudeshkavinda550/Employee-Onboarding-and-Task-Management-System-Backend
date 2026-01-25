const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const notificationService = {
  /**
   * Create notification
   */
  create: async (userId, title, message, type = 'system', link = null) => {
    try {
      const notification = await Notification.create({
        user_id: userId,
        title,
        message,
        type,
        link,
      });
      
      return notification;
    } catch (error) {
      logger.error('Notification creation error:', error);
      throw error;
    }
  },
  
  /**
   * Send task assigned notification
   */
  sendTaskAssignedNotification: async (userId, taskTitle) => {
    return await notificationService.create(
      userId,
      'New Task Assigned',
      `You have been assigned a new task: ${taskTitle}`,
      'task_assigned',
      '/employee/tasks'
    );
  },
  
  /**
   * Send task reminder notification
   */
  sendTaskReminderNotification: async (userId, taskTitle) => {
    return await notificationService.create(
      userId,
      'Task Reminder',
      `Reminder: Please complete your task: ${taskTitle}`,
      'task_reminder',
      '/employee/tasks'
    );
  },
  
  /**
   * Send document approved notification
   */
  sendDocumentApprovedNotification: async (userId, documentName) => {
    return await notificationService.create(
      userId,
      'Document Approved',
      `Your document "${documentName}" has been approved`,
      'document_approved',
      '/employee/documents'
    );
  },
  
  /**
   * Send document rejected notification
   */
  sendDocumentRejectedNotification: async (userId, documentName) => {
    return await notificationService.create(
      userId,
      'Document Rejected',
      `Your document "${documentName}" has been rejected. Please check the reason and resubmit.`,
      'document_rejected',
      '/employee/documents'
    );
  },
};

module.exports = notificationService;