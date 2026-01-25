const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

console.log('Initializing email service...');
console.log('Email configuration check:', {
  EMAIL_USER: process.env.EMAIL_USER ? '✓ Set' : '✗ Not set',
  EMAIL_PASS: process.env.EMAIL_PASS ? '✓ Set' : '✗ Not set',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587
});

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials missing!');
    console.error('   EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
    console.error('   EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
    throw new Error('Email credentials are missing. Check your .env file');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false 
    }
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('Email transporter verification failed:', error.message);
      logger.error('Email transporter verification failed:', error.message);
    } else {
      console.log('Email server is ready to send messages');
      logger.info('Email server is ready to send messages');
    }
  });

  return transporter;
};

const transporter = createTransporter();

/**
 * Send welcome email after registration
 */
const sendWelcomeEmail = async (email, name) => {
  try {
    console.log(`Sending welcome email to: ${email}`);
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'OnboardPro'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to OnboardPro!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome ${name}!</h2>
          <p>Thank you for joining OnboardPro. Your account has been successfully created.</p>
          <p>We're excited to have you on board!</p>
        </div>
      `,
      text: `Welcome ${name}!\n\nThank you for joining OnboardPro. Your account has been successfully created.\n\nWe're excited to have you on board!`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to: ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    logger.info(`Welcome email sent to: ${email} - Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending welcome email to ${email}:`, error.message);
    logger.error(`Failed to send welcome email: ${error.message}`);
    throw error;
  }
};

/**
 * Send password reset OTP
 */
const sendPasswordResetOTP = async (email, name, otp) => {
  try {
    console.log(`Sending password reset OTP to: ${email}`);
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'OnboardPro'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP - OnboardPro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>You requested to reset your password. Use the OTP code below:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p><strong>This OTP will expire in 10 minutes.</strong></p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
      `,
      text: `Hello ${name},\n\nYou requested to reset your password. Use this OTP code:\n\n${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this reset, please ignore this email.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP sent to: ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    logger.info(`Password reset OTP sent to: ${email} - Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending password reset OTP to ${email}:`, error.message);
    logger.error(`Failed to send OTP email: ${error.message}`);
    throw error;
  }
};

const testEmailConnection = async () => {
  try {
    console.log('Testing email connection...');
    const isVerified = await transporter.verify();
    console.log('Email connection verified:', isVerified);
    return isVerified;
  } catch (error) {
    console.error('Email connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  transporter,
  sendWelcomeEmail,
  sendPasswordResetOTP,
  testEmailConnection
};