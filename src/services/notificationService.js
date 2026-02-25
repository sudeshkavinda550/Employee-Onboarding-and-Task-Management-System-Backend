const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const notificationService = {
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

  createBulk: async (userIds, title, message, type = 'system', link = null) => {
    try {
      const notifications = await Promise.all(
        userIds.map(userId => 
          notificationService.create(userId, title, message, type, link)
        )
      );
      return notifications;
    } catch (error) {
      logger.error('Bulk notification creation error:', error);
      throw error;
    }
  },

  sendTaskAssignedNotification: async (userId, taskTitle, templateName) => {
    return await notificationService.create(
      userId,
      'New Task Assigned',
      `You have been assigned: ${taskTitle}${templateName ? ` from ${templateName}` : ''}`,
      'task_assigned',
      '/employee/tasks'
    );
  },

  sendTaskReminderNotification: async (userId, taskTitle, dueDate) => {
    const dueDateStr = dueDate ? ` (Due: ${new Date(dueDate).toLocaleDateString()})` : '';
    return await notificationService.create(
      userId,
      'Task Reminder',
      `Reminder: Please complete "${taskTitle}"${dueDateStr}`,
      'task_reminder',
      '/employee/tasks'
    );
  },

  sendTaskOverdueNotification: async (userId, taskTitle) => {
    return await notificationService.create(
      userId,
      'Task Overdue',
      `Your task "${taskTitle}" is overdue. Please complete it as soon as possible.`,
      'task_reminder',
      '/employee/tasks'
    );
  },

  sendTaskCompletedNotification: async (hrUserId, employeeName, taskTitle) => {
    return await notificationService.create(
      hrUserId,
      'Task Completed',
      `${employeeName} has completed the task: ${taskTitle}`,
      'task_completed',
      '/hr/employees'
    );
  },

  sendDocumentUploadedNotification: async (hrUserId, employeeName, documentName) => {
    return await notificationService.create(
      hrUserId,
      'New Document Uploaded',
      `${employeeName} has uploaded: ${documentName}`,
      'document_uploaded',
      '/hr/documents'
    );
  },

  sendDocumentApprovedNotification: async (userId, documentName) => {
    return await notificationService.create(
      userId,
      'Document Approved',
      `Your document "${documentName}" has been approved`,
      'document_approved',
      '/employee/documents'
    );
  },

  sendDocumentRejectedNotification: async (userId, documentName, reason) => {
    const reasonMsg = reason ? ` Reason: ${reason}` : '';
    return await notificationService.create(
      userId,
      'Document Rejected',
      `Your document "${documentName}" has been rejected.${reasonMsg} Please resubmit.`,
      'document_rejected',
      '/employee/documents'
    );
  },

  sendOnboardingStartedNotification: async (userId, templateName, totalTasks) => {
    return await notificationService.create(
      userId,
      'Welcome! Onboarding Started',
      `Your onboarding journey has begun with ${totalTasks} tasks in "${templateName}". Let's get started!`,
      'system',
      '/employee/tasks'
    );
  },

  sendOnboardingCompletedNotification: async (userId, completionDays) => {
    const employeeNotif = await notificationService.create(
      userId,
      'Onboarding Complete!',
      `Congratulations! You've completed your onboarding in ${completionDays} days. Welcome to the team!`,
      'task_completed',
      '/employee/dashboard'
    );
    return employeeNotif;
  },

  sendHalfwayMilestoneNotification: async (userId, completedTasks, totalTasks) => {
    return await notificationService.create(
      userId,
      'Halfway There!',
      `Great progress! You've completed ${completedTasks} of ${totalTasks} tasks. Keep going!`,
      'system',
      '/employee/tasks'
    );
  },

  sendNewEmployeeNotification: async (hrUserId, employeeName, department, startDate) => {
    return await notificationService.create(
      hrUserId,
      'New Employee Added',
      `${employeeName} from ${department} is starting on ${new Date(startDate).toLocaleDateString()}`,
      'system',
      '/hr/employees'
    );
  },

  sendTemplateAssignedNotification: async (hrUserId, employeeName, templateName) => {
    return await notificationService.create(
      hrUserId,
      'Template Assigned',
      `Successfully assigned "${templateName}" to ${employeeName}`,
      'system',
      '/hr/employees'
    );
  },

  sendHRAccountCreatedNotification: async (adminUserIds, hrName, department) => {
    return await notificationService.createBulk(
      adminUserIds,
      'New HR Account Created',
      `${hrName} has been added as HR Manager for ${department}`,
      'system',
      '/admin/hr'
    );
  },

  sendHRAccountSuspendedNotification: async (adminUserIds, hrName) => {
    return await notificationService.createBulk(
      adminUserIds,
      'HR Account Suspended',
      `HR Manager ${hrName} has been suspended`,
      'system',
      '/admin/hr'
    );
  },

  sendHRAccountDeletedNotification: async (adminUserIds, hrName) => {
    return await notificationService.createBulk(
      adminUserIds,
      'HR Account Deleted',
      `HR Manager ${hrName} has been permanently deleted`,
      'system',
      '/admin/hr'
    );
  },

  sendBulkOnboardingOverdueNotification: async (adminUserIds, overdueCount) => {
    return await notificationService.createBulk(
      adminUserIds,
      'Overdue Onboardings Alert',
      `${overdueCount} employees have overdue onboarding tasks requiring attention`,
      'system',
      '/admin/employees'
    );
  },

  sendSystemHealthAlertNotification: async (adminUserIds, alertType, message) => {
    return await notificationService.createBulk(
      adminUserIds,
      `System Alert: ${alertType}`,
      message,
      'system',
      '/admin/dashboard'
    );
  },

  sendTemplateCreatedNotification: async (adminUserIds, hrName, templateName, taskCount) => {
    return await notificationService.createBulk(
      adminUserIds,
      'New Template Created',
      `${hrName} created "${templateName}" with ${taskCount} tasks`,
      'system',
      '/admin/templates'
    );
  },

  sendBulkDocumentPendingNotification: async (adminUserIds, pendingCount) => {
    if (pendingCount > 0) {
      return await notificationService.createBulk(
        adminUserIds,
        'Documents Pending Review',
        `${pendingCount} documents are waiting for HR review`,
        'system',
        '/admin/documents'
      );
    }
  },

  sendEmployeeInactivityNotification: async (hrUserId, employeeName, daysSinceActivity) => {
    return await notificationService.create(
      hrUserId,
      'Employee Inactivity Alert',
      `${employeeName} has been inactive for ${daysSinceActivity} days. Consider sending a reminder.`,
      'system',
      '/hr/employees'
    );
  },

  sendWeeklyDigestNotification: async (userId, stats) => {
    const { completedTasks, pendingTasks, documentsUploaded, role } = stats;
    let message = '';
    
    if (role === 'employee') {
      message = `This week: ${completedTasks} tasks completed, ${pendingTasks} pending, ${documentsUploaded} documents uploaded`;
    } else if (role === 'hr') {
      message = `This week: ${stats.newEmployees} new employees, ${stats.completedOnboardings} completed onboardings, ${stats.documentsReviewed} documents reviewed`;
    } else if (role === 'admin') {
      message = `This week: ${stats.totalEmployees} total employees, ${stats.activeOnboardings} active onboardings, ${stats.systemEvents} system events`;
    }

    return await notificationService.create(
      userId,
      'Weekly Summary',
      message,
      'system',
      `/${role}/dashboard`
    );
  },

  sendPasswordResetNotification: async (userId, userName) => {
    return await notificationService.create(
      userId,
      'Password Reset Successful',
      `Your password has been successfully reset. If you didn't make this change, please contact support immediately.`,
      'system',
      '/employee/profile'
    );
  },

  sendAccountCredentialsNotification: async (userId, email, temporaryPassword) => {
    return await notificationService.create(
      userId,
      'Account Credentials',
      `Your account has been created. Email: ${email}. Please change your password on first login.`,
      'system',
      '/employee/profile'
    );
  },

  sendMentionNotification: async (userId, mentionedBy, context, link) => {
    return await notificationService.create(
      userId,
      'You were mentioned',
      `${mentionedBy} mentioned you in ${context}`,
      'system',
      link
    );
  },

  sendDangerActionNotification: async (adminUserIds, performedBy, action, details) => {
    return await notificationService.createBulk(
      adminUserIds,
      `Danger Action Performed: ${action}`,
      `${performedBy} executed: ${details}`,
      'system',
      '/admin/analytics'
    );
  },

  sendSettingsChangedNotification: async (adminUserIds, changedBy, settingType) => {
    return await notificationService.createBulk(
      adminUserIds,
      'System Settings Updated',
      `${changedBy} modified ${settingType} settings`,
      'system',
      '/admin/settings'
    );
  },

  sendDataExportNotification: async (userId, exportType, recordCount) => {
    return await notificationService.create(
      userId,
      'Data Export Ready',
      `Your ${exportType} export with ${recordCount} records is ready for download`,
      'system',
      '/admin/analytics'
    );
  },

  sendComplianceAlertNotification: async (adminUserIds, hrUserIds, alertMessage) => {
    const allUserIds = [...adminUserIds, ...hrUserIds];
    return await notificationService.createBulk(
      allUserIds,
      'Compliance Alert',
      alertMessage,
      'system',
      '/admin/dashboard'
    );
  },

  sendBirthdayNotification: async (userId, employeeName) => {
    return await notificationService.create(
      userId,
      'Birthday Celebration!',
      `Today is ${employeeName}'s birthday! Take a moment to wish them well.`,
      'system',
      '/employee/dashboard'
    );
  },

  sendWorkAnniversaryNotification: async (userId, employeeName, years) => {
    return await notificationService.create(
      userId,
      `Work Anniversary - ${years} Year${years > 1 ? 's' : ''}!`,
      `Congratulations to ${employeeName} on ${years} year${years > 1 ? 's' : ''} with the company!`,
      'system',
      '/employee/dashboard'
    );
  },

  sendOnboardingDelayedNotification: async (hrUserId, adminUserIds, employeeName, delayDays) => {
    const message = `${employeeName}'s onboarding is delayed by ${delayDays} days`;
    
    await notificationService.create(
      hrUserId,
      'Onboarding Delayed',
      message,
      'system',
      '/hr/employees'
    );

    if (delayDays > 7) {
      await notificationService.createBulk(
        adminUserIds,
        'Onboarding Delay Alert',
        message,
        'system',
        '/admin/employees'
      );
    }
  },

  sendBulkReminderSentNotification: async (hrUserId, employeeCount, reminderType) => {
    return await notificationService.create(
      hrUserId,
      'Bulk Reminder Sent',
      `${reminderType} reminder sent to ${employeeCount} employees`,
      'system',
      '/hr/employees'
    );
  },

  sendIntegrationStatusNotification: async (adminUserIds, integration, status, message) => {
    const statusEmoji = status === 'connected' ? '✅' : '❌';
    return await notificationService.createBulk(
      adminUserIds,
      `${statusEmoji} Integration ${status}: ${integration}`,
      message,
      'system',
      '/admin/settings'
    );
  },

  sendBackupCompletedNotification: async (adminUserIds, backupSize, recordCount) => {
    return await notificationService.createBulk(
      adminUserIds,
      'Backup Completed',
      `System backup completed successfully. ${recordCount} records backed up (${backupSize})`,
      'system',
      '/admin/settings'
    );
  },

  sendLowStorageNotification: async (adminUserIds, usagePercent, remainingSpace) => {
    return await notificationService.createBulk(
      adminUserIds,
      'Low Storage Warning',
      `Storage is ${usagePercent}% full. Only ${remainingSpace} remaining.`,
      'system',
      '/admin/dashboard'
    );
  },

  sendFailedLoginAttemptNotification: async (adminUserIds, email, attemptCount, ipAddress) => {
    return await notificationService.createBulk(
      adminUserIds,
      'Security Alert: Failed Login Attempts',
      `${attemptCount} failed login attempts for ${email} from IP ${ipAddress}`,
      'system',
      '/admin/analytics'
    );
  },

  sendMassDeleteNotification: async (adminUserIds, performedBy, entityType, count) => {
    return await notificationService.createBulk(
      adminUserIds,
      `Mass Delete: ${entityType}`,
      `${performedBy} deleted ${count} ${entityType} records`,
      'system',
      '/admin/analytics'
    );
  },
};

module.exports = notificationService;