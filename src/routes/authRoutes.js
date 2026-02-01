const express = require('express');
const authController = require('../controllers/authController');
const authValidator = require('../validators/authValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const emailService = require('../config/email');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, authValidator.register, validate, authController.register);
router.post('/login', authLimiter, authValidator.login, validate, authController.login);
router.post('/forgot-password', authLimiter, authValidator.forgotPassword, validate, authController.forgotPassword);
router.post('/reset-password', authLimiter, authValidator.resetPassword, validate, authController.resetPassword);
router.post('/refresh', authController.refreshToken);
router.get('/verify-email', authController.verifyEmail);

// Email test route
router.post('/test-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and name are required'
      });
    }
    
    console.log('Testing email to:', email);
    
    // Test simple email first
    const testMailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'TEST: Email Configuration Test - OnboardPro',
      text: `Hello ${name},\n\nThis is a test email from OnboardPro to verify email configuration.\n\nIf you receive this, email is working correctly!\n\nSent at: ${new Date().toLocaleString()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #667eea; text-align: center;">Email Test Successful!</h1>
            <p>Hello <strong>${name}</strong>,</p>
            <p>This is a test email from OnboardPro to verify email configuration.</p>
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-weight: bold;">If you receive this, email is working correctly!</p>
            </div>
            <p><strong>Details:</strong></p>
            <ul>
              <li><strong>To:</strong> ${email}</li>
              <li><strong>From:</strong> ${process.env.EMAIL_FROM}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated test email from OnboardPro.
            </p>
          </div>
        </body>
        </html>
      `
    };

    const transporter = emailService.transporter;

    transporter.verify((error, success) => {
      if (error) {
        console.error('Transporter verification failed:', error);
      } else {
        console.log('Transporter verified:', success);
      }
    });
    
    const info = await transporter.sendMail(testMailOptions);
    
    console.log('Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted recipients:', info.accepted);
    
    res.status(200).json({
      status: 'success',
      message: 'Test email sent successfully! Check your inbox (and spam folder).',
      data: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack
    });
    
    // More specific error messages
    let userMessage = 'Failed to send test email';
    if (error.code === 'EAUTH') {
      userMessage = 'Authentication failed. Check your email credentials (App Password).';
    } else if (error.code === 'ESOCKET') {
      userMessage = 'Connection failed. Check your network or SMTP settings.';
    }
    
    res.status(500).json({
      status: 'error',
      message: userMessage,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        command: error.command,
        fullError: error.toString()
      } : undefined
    });
  }
});

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authValidator.updateProfile, validate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);
router.get('/verify', authenticate, authController.verifyToken);
router.put('/change-password', authenticate, authValidator.changePassword, validate, authController.changePassword);

// Profile picture routes
router.post('/profile/picture', authenticate, upload.single('profilePicture'), authController.uploadProfilePicture);
router.delete('/profile/picture', authenticate, authController.deleteProfilePicture);

// Admin routes
router.get('/users', authenticate, authController.getAllUsers);
router.put('/users/:userId/status', authenticate, authController.updateUserStatus);

module.exports = router;