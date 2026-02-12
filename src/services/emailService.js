const nodemailer = require('nodemailer');
const emailTransporter = require('../config/email');
const logger = require('../utils/logger');

const emailService = {
  sendEmail: async (to, subject, html) => {
    try {
      if (!to) {
        logger.error('[sendEmail] No recipient email provided');
        return false;
      }

      const fromName = process.env.EMAIL_FROM_NAME || 'OnboardPro';
      const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@onboardpro.com';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      };
      
      const info = await emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Email sending error:', error);
      throw error;
    }
  },
  
  sendWelcomeEmail: async (to, name) => {
    try {
      if (!to) {
        logger.error('[sendWelcomeEmail] No email provided');
        return false;
      }

      const employeeName = name || 'Employee';
      const subject = 'Welcome to OnboardPro';
      const html = `
        <h1>Welcome ${employeeName}!</h1>
        <p>Thank you for joining OnboardPro. We're excited to have you on board!</p>
        <p>Please complete your onboarding tasks to get started.</p>
        <br>
        <p>Best regards,<br>The OnboardPro Team</p>
      `;
      
      return await emailService.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('[sendWelcomeEmail] Error:', error);
      throw error;
    }
  },
  
  sendPasswordResetEmail: async (to, name, resetToken) => {
    try {
      if (!to) {
        logger.error('[sendPasswordResetEmail] No email provided');
        return false;
      }

      const employeeName = name || 'User';
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const subject = 'Password Reset Request';
      const html = `
        <h1>Password Reset Request</h1>
        <p>Hi ${employeeName},</p>
        <p>You requested to reset your password. Click the link below to reset:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>The OnboardPro Team</p>
      `;
      
      return await emailService.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('[sendPasswordResetEmail] Error:', error);
      throw error;
    }
  },
  
  sendTaskAssignedEmail: async (to, name, taskTitle) => {
    try {
      if (!to) {
        logger.error('[sendTaskAssignedEmail] No email provided');
        return false;
      }

      const employeeName = name || 'Employee';
      const subject = 'New Task Assigned';
      const html = `
        <h1>New Task Assigned</h1>
        <p>Hi ${employeeName},</p>
        <p>You have been assigned a new task: <strong>${taskTitle}</strong></p>
        <p>Please log in to your account to view and complete the task.</p>
        <br>
        <p>Best regards,<br>The OnboardPro Team</p>
      `;
      
      return await emailService.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('[sendTaskAssignedEmail] Error:', error);
      throw error;
    }
  },
  
  sendTaskReminderEmail: async (to, name, taskTitle, dueDate) => {
    try {
      if (!to) {
        logger.error('[sendTaskReminderEmail] No email provided');
        return false;
      }

      const employeeName = name || 'Employee';
      const subject = 'Task Reminder';
      const html = `
        <h1>Task Reminder</h1>
        <p>Hi ${employeeName},</p>
        <p>This is a reminder about your pending task: <strong>${taskTitle}</strong></p>
        <p>Due date: ${new Date(dueDate).toLocaleDateString()}</p>
        <p>Please complete it as soon as possible.</p>
        <br>
        <p>Best regards,<br>The OnboardPro Team</p>
      `;
      
      return await emailService.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('[sendTaskReminderEmail] Error:', error);
      throw error;
    }
  },
  
  sendDocumentApprovedEmail: async (to, name, documentName) => {
    try {
      if (!to) {
        logger.error('[sendDocumentApprovedEmail] No email provided');
        return false;
      }

      const employeeName = name || 'Employee';
      const subject = 'Document Approved';
      const html = `
        <h1>Document Approved</h1>
        <p>Hi ${employeeName},</p>
        <p>Your document <strong>${documentName}</strong> has been approved.</p>
        <br>
        <p>Best regards,<br>The OnboardPro Team</p>
      `;
      
      return await emailService.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('[sendDocumentApprovedEmail] Error:', error);
      throw error;
    }
  },
  
  sendDocumentRejectedEmail: async (to, name, documentName, reason) => {
    try {
      if (!to) {
        logger.error('[sendDocumentRejectedEmail] No email provided');
        return false;
      }

      const employeeName = name || 'Employee';
      const subject = 'Document Rejected';
      const html = `
        <h1>Document Rejected</h1>
        <p>Hi ${employeeName},</p>
        <p>Your document <strong>${documentName}</strong> has been rejected.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please upload a corrected version.</p>
        <br>
        <p>Best regards,<br>The OnboardPro Team</p>
      `;
      
      return await emailService.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('[sendDocumentRejectedEmail] Error:', error);
      throw error;
    }
  },
};

module.exports = emailService;