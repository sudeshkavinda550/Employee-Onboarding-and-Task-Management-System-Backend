const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');
const logger = require('../utils/logger');

const emailService = {
  /**
   * Send email
   */
  sendEmail: async (to, subject, html) => {
    try {
      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to,
        subject,
        html,
      };
      
      const info = await emailConfig.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Email sending error:', error);
      throw error;
    }
  },
  
  /**
   * Send welcome email
   */
  sendWelcomeEmail: async (to, name) => {
    const subject = 'Welcome to OnboardPro';
    const html = `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for joining OnboardPro. We're excited to have you on board!</p>
      <p>Please complete your onboarding tasks to get started.</p>
      <br>
      <p>Best regards,<br>The OnboardPro Team</p>
    `;
    
    return await emailService.sendEmail(to, subject, html);
  },
  
  /**
   * Send password reset email
   */
  sendPasswordResetEmail: async (to, name, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Click the link below to reset:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <br>
      <p>Best regards,<br>The OnboardPro Team</p>
    `;
    
    return await emailService.sendEmail(to, subject, html);
  },
  
  /**
   * Send task assigned email
   */
  sendTaskAssignedEmail: async (to, name, taskTitle) => {
    const subject = 'New Task Assigned';
    const html = `
      <h1>New Task Assigned</h1>
      <p>Hi ${name},</p>
      <p>You have been assigned a new task: <strong>${taskTitle}</strong></p>
      <p>Please log in to your account to view and complete the task.</p>
      <br>
      <p>Best regards,<br>The OnboardPro Team</p>
    `;
    
    return await emailService.sendEmail(to, subject, html);
  },
  
  /**
   * Send task reminder email
   */
  sendTaskReminderEmail: async (to, name, taskTitle, dueDate) => {
    const subject = 'Task Reminder';
    const html = `
      <h1>Task Reminder</h1>
      <p>Hi ${name},</p>
      <p>This is a reminder about your pending task: <strong>${taskTitle}</strong></p>
      <p>Due date: ${new Date(dueDate).toLocaleDateString()}</p>
      <p>Please complete it as soon as possible.</p>
      <br>
      <p>Best regards,<br>The OnboardPro Team</p>
    `;
    
    return await emailService.sendEmail(to, subject, html);
  },
  
  /**
   * Send document approved email
   */
  sendDocumentApprovedEmail: async (to, name, documentName) => {
    const subject = 'Document Approved';
    const html = `
      <h1>Document Approved</h1>
      <p>Hi ${name},</p>
      <p>Your document <strong>${documentName}</strong> has been approved.</p>
      <br>
      <p>Best regards,<br>The OnboardPro Team</p>
    `;
    
    return await emailService.sendEmail(to, subject, html);
  },
  
  /**
   * Send document rejected email
   */
  sendDocumentRejectedEmail: async (to, name, documentName, reason) => {
    const subject = 'Document Rejected';
    const html = `
      <h1>Document Rejected</h1>
      <p>Hi ${name},</p>
      <p>Your document <strong>${documentName}</strong> has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please upload a corrected version.</p>
      <br>
      <p>Best regards,<br>The OnboardPro Team</p>
    `;
    
    return await emailService.sendEmail(to, subject, html);
  },
};

module.exports = emailService;