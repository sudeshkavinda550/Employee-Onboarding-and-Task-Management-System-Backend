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

const sendEmployeeCredentialsEmail = async ({ name, email, employeeId, password, position, startDate, department }) => {
  try {
    console.log(`Sending employee credentials email to: ${email}`);
    
    const companyName = process.env.COMPANY_NAME || 'OnboardPro';
    const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'To be confirmed';

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || companyName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to ${companyName} - Your Account Credentials`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${companyName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Main Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header with Gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;">
                        Welcome to ${companyName}!
                      </h1>
                      <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                        We're excited to have you on our team
                      </p>
                    </td>
                  </tr>

                  <!-- Greeting Section -->
                  <tr>
                    <td style="padding: 40px 30px 20px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                        Dear <strong style="color: #111827;">${name}</strong>,
                      </p>
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                        Congratulations on joining ${companyName} as a <strong style="color: #667eea;">${position || 'team member'}</strong>! 
                        Your onboarding journey begins on <strong style="color: #667eea;">${formattedStartDate}</strong>.
                      </p>
                      ${department ? `<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                        You'll be working with the <strong style="color: #667eea;">${department}</strong> team.
                      </p>` : ''}
                    </td>
                  </tr>

                  <!-- Credentials Card -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; border: 2px solid #e5e7eb; overflow: hidden;">
                        <!-- Card Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                            <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">
                              🔐 Your Login Credentials
                            </h2>
                          </td>
                        </tr>
                        
                        <!-- Card Body -->
                        <tr>
                          <td style="padding: 30px;">
                            <!-- Employee ID -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                              <tr>
                                <td style="padding: 12px 0;">
                                  <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                    Employee ID
                                  </div>
                                  <div style="font-size: 18px; font-weight: bold; color: #111827; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                                    ${employeeId}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <!-- Email -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                              <tr>
                                <td style="padding: 12px 0;">
                                  <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                    Email Address
                                  </div>
                                  <div style="font-size: 16px; font-weight: 600; color: #111827; background-color: #ffffff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                                    ${email}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <!-- Temporary Password -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding: 12px 0;">
                                  <div style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                    Temporary Password
                                  </div>
                                  <div style="font-size: 18px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px 16px; border-radius: 8px; border: 2px solid #fca5a5;">
                                    ${password}
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Security Notice -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
                        <tr>
                          <td>
                            <div style="font-size: 16px; font-weight: bold; color: #92400e; margin-bottom: 8px;">
                              ⚠️ Important Security Notice
                            </div>
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350f;">
                              For your security, please <strong>change your password immediately</strong> after your first login. 
                              Never share your password with anyone, including IT staff or management.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Next Steps -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #111827;">
                        📋 Next Steps
                      </h3>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 10px 0;">
                            <div style="display: flex; align-items: start;">
                              <span style="background-color: #667eea; color: #ffffff; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; margin-right: 12px; flex-shrink: 0;">1</span>
                              <span style="font-size: 15px; color: #374151; line-height: 1.6;">
                                Log in to the system using your email and temporary password
                              </span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <div style="display: flex; align-items: start;">
                              <span style="background-color: #667eea; color: #ffffff; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; margin-right: 12px; flex-shrink: 0;">2</span>
                              <span style="font-size: 15px; color: #374151; line-height: 1.6;">
                                Change your password to something secure and memorable
                              </span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <div style="display: flex; align-items: start;">
                              <span style="background-color: #667eea; color: #ffffff; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; margin-right: 12px; flex-shrink: 0;">3</span>
                              <span style="font-size: 15px; color: #374151; line-height: 1.6;">
                                Complete your profile and start your onboarding tasks
                              </span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Support Section -->
                  <tr>
                    <td style="padding: 0 30px 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; padding: 20px;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #1e40af;">
                              💬 Need Help?
                            </p>
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e40af;">
                              If you have any questions or encounter any issues during the onboarding process, 
                              please don't hesitate to contact our HR team. We're here to help make your transition smooth!
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Closing -->
                  <tr>
                    <td style="padding: 0 30px 40px 30px;">
                      <p style="margin: 0 0 5px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                        We look forward to working with you!
                      </p>
                      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #111827;">
                        Best regards,<br/>
                        <span style="color: #667eea;">The ${companyName} Team</span>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px 0; font-size: 12px; color: #9ca3af;">
                        This is an automated email. Please do not reply to this message.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                        © ${new Date().getFullYear()} ${companyName}. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Welcome to ${companyName}!

Dear ${name},

Congratulations on joining ${companyName} as a ${position || 'team member'}! Your onboarding journey begins on ${formattedStartDate}.

${department ? `You'll be working with the ${department} team.\n\n` : ''}
YOUR LOGIN CREDENTIALS
─────────────────────────────────────

Employee ID: ${employeeId}
Email Address: ${email}
Temporary Password: ${password}

⚠️ IMPORTANT SECURITY NOTICE
────────────────────────────
For your security, please change your password immediately after your first login. Never share your password with anyone, including IT staff or management.

NEXT STEPS
──────────
1. Log in to the system using your email and temporary password
2. Change your password to something secure and memorable
3. Complete your profile and start your onboarding tasks

NEED HELP?
──────────
If you have any questions or encounter any issues during the onboarding process, please don't hesitate to contact our HR team.

We look forward to working with you!

Best regards,
The ${companyName} Team

────────────────────────────────────
This is an automated email. Please do not reply to this message.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Employee credentials email sent to: ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    logger.info(`Employee credentials email sent to: ${email} - Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending employee credentials email to ${email}:`, error.message);
    logger.error(`Failed to send employee credentials email: ${error.message}`);
    throw error;
  }
};

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
  sendEmployeeCredentialsEmail,
  sendPasswordResetOTP,
  testEmailConnection
};