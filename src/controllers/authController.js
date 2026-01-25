const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const emailService = require('../config/email');
const logger = require('../utils/logger');

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    console.log('Registration attempt started');
    const { name, email, password, role = 'employee', phone, date_of_birth, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required'
      });
    }

    console.log('Checking if user exists:', email);
    const checkUserSql = 'SELECT id FROM users WHERE email = $1';
    const existingUser = await query(checkUserSql, [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('User already exists:', email);
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    console.log('Hashing password');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Generate employee ID
    const employeeId = `EMP${Date.now().toString().slice(-6)}`;

    console.log('Creating user in database');
    const createUserSql = `
      INSERT INTO users (
        name, email, password, role, employee_id, phone, 
        date_of_birth, address, email_verified, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, employee_id, phone, date_of_birth, 
                address, onboarding_status, is_active, email_verified, created_at
    `;
    
    const result = await query(createUserSql, [
      name, email, password_hash, role, employeeId, phone, 
      date_of_birth, address
    ]);

    const user = result.rows[0];
    console.log('User created in database - ID:', user.id);

    // Send WELCOME email 
    try {
      console.log('Attempting to send welcome email to:', email);
      console.log('Email service check:', {
        hasService: !!emailService,
        hasSendWelcomeEmail: !!emailService.sendWelcomeEmail,
        envEmailUser: process.env.EMAIL_USER,
        envEmailFrom: process.env.EMAIL_FROM
      });
      
      await emailService.sendWelcomeEmail(email, name);
      
      console.log('Welcome email sent successfully to:', email);
      logger.info(`Welcome email sent to: ${email}`);
    } catch (emailError) {
      console.error('ERROR sending welcome email:', emailError);
      console.error('Error details:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        stack: emailError.stack
      });
      
      logger.warn(`Failed to send welcome email: ${emailError.message}`);
    }

    // Generate tokens
    console.log('Generating JWT tokens');
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    delete user.password;

    console.log('Registration successful for:', email);
    logger.info(`New user registered: ${email} (ID: ${user.id})`);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Welcome to OnboardPro!',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('REGISTRATION ERROR:', error);
    console.error('Error stack:', error.stack);
    logger.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify user email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification token is required'
      });
    }

    // Find user by verification token
    const findUserSql = `
      SELECT * FROM users 
      WHERE email_verification_token = $1 
      AND email_verification_expires > NOW()
    `;
    const result = await query(findUserSql, [token]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    const user = result.rows[0];

    // Verify email
    const verifyEmailSql = `
      UPDATE users 
      SET email_verified = true, 
          email_verification_token = NULL,
          email_verification_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, employee_id, email_verified
    `;
    
    const verifiedResult = await query(verifyEmailSql, [user.id]);
    const verifiedUser = verifiedResult.rows[0];

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
      console.log('Welcome email sent after verification:', user.email);
    } catch (emailError) {
      console.error('Error sending welcome email after verification:', emailError);
      logger.warn(`Failed to send welcome email: ${emailError.message}`);
    }

    logger.info(`Email verified for user: ${user.email} (ID: ${user.id})`);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You can now login.',
      data: verifiedUser
    });

  } catch (error) {
    console.error('Email verification error:', error);
    logger.error('Email verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error verifying email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * User login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Find user
    const findUserSql = 'SELECT * FROM users WHERE email = $1';
    console.log('Executing SQL:', findUserSql);
    
    const result = await query(findUserSql, [email]);
    console.log('Query returned rows:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('User not found:', email);
      logger.warn(`Failed login attempt: User not found - ${email}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];
    console.log('User found - ID:', user.id, 'Email:', user.email);

    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      console.log('Account locked for user:', email);
      return res.status(403).json({
        status: 'error',
        message: 'Account is locked. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      console.log('Account inactive:', email);
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Check password
    console.log('Verifying password');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      const newAttempts = (user.login_attempts || 0) + 1;
      let lockedUntil = null;
      
      if (newAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); 
        console.log('Account locked for 15 minutes:', email);
      }
      
      const updateAttemptsSql = `
        UPDATE users 
        SET login_attempts = $1, 
            account_locked_until = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;
      
      await query(updateAttemptsSql, [newAttempts, lockedUntil, user.id]);
      
      console.log(`Failed login attempt for ${email} (Attempt: ${newAttempts})`);
      logger.warn(`Failed login attempt for user: ${email} (Attempt: ${newAttempts})`);
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const resetAttemptsSql = `
      UPDATE users 
      SET login_attempts = 0, 
          account_locked_until = NULL,
          last_login = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await query(resetAttemptsSql, [user.id]);

    // Generate tokens
    console.log('Generating tokens for user:', user.id);
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    const userResponse = { ...user };
    delete userResponse.password;
    delete userResponse.reset_password_token;
    delete userResponse.email_verification_token;

    console.log('Login successful for:', email);
    logger.info(`User logged in: ${email} (ID: ${user.id})`);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('🔥 LOGIN ERROR:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    logger.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Forgot password - Send OTP
 */
exports.forgotPassword = async (req, res) => {
  try {
    console.log('Forgot password request for:', req.body.email);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const findUserSql = 'SELECT * FROM users WHERE email = $1';
    const result = await query(findUserSql, [email]);
    
    if (result.rows.length === 0) {
      console.log('No user found (for security), but sending success response');
      return res.status(200).json({
        status: 'success',
        message: 'If an account exists with this email, you will receive a password reset OTP.'
      });
    }

    const user = result.rows[0];
    console.log('User found for password reset:', email);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

    const updateOtpSql = `
      UPDATE users 
      SET reset_password_token = $1,
          reset_password_expires = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    
    await query(updateOtpSql, [otp, otpExpires, user.id]);

    // Send OTP email
    try {
      console.log('Sending password reset OTP to:', email);
      await emailService.sendPasswordResetOTP(user.email, user.name, otp);
      console.log('Password reset OTP sent to:', email);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      logger.warn(`Failed to send OTP email: ${emailError.message}`);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP email'
      });
    }

    logger.info(`Password reset OTP sent to: ${email}`);

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email. Valid for 10 minutes.',
      data: { email }
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    logger.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error sending OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password with OTP
 */
exports.resetPassword = async (req, res) => {
  try {
    console.log('Reset password request');
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, OTP, and new password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find user by email and OTP
    const findUserSql = `
      SELECT * FROM users 
      WHERE email = $1 
      AND reset_password_token = $2 
      AND reset_password_expires > NOW()
    `;
    
    const result = await query(findUserSql, [email, otp]);
    
    if (result.rows.length === 0) {
      console.log('Invalid or expired OTP for:', email);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP'
      });
    }

    const user = result.rows[0];
    console.log('Valid OTP for user:', email);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Update password and clear OTP
    const updatePasswordSql = `
      UPDATE users 
      SET password = $1,
          reset_password_token = NULL,
          reset_password_expires = NULL,
          login_attempts = 0,
          account_locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role
    `;
    
    const updatedResult = await query(updatePasswordSql, [password_hash, user.id]);
    const updatedUser = updatedResult.rows[0];

    console.log('Password reset successful for:', email);
    logger.info(`Password reset successful for user: ${user.email} (ID: ${user.id})`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful. You can now login with your new password.',
      data: updatedUser
    });

  } catch (error) {
    console.error('Reset password error:', error);
    logger.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const findUserSql = 'SELECT id, role, is_active FROM users WHERE id = $1';
    const result = await query(findUserSql, [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated'
      });
    }

    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    logger.info(`Token refreshed for user ID: ${user.id}`);

    res.status(200).json({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token expired'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Error refreshing token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔵 Fetching profile for user ID:', userId);

    const findUserSql = `
      SELECT id, name, email, role, employee_id, phone, 
             date_of_birth, address, onboarding_status, 
             is_active, email_verified, created_at, updated_at, last_login
      FROM users 
      WHERE id = $1
    `;
    
    const result = await query(findUserSql, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    console.log('Profile fetched for user ID:', userId);
    logger.info(`Profile fetched for user ID: ${userId}`);

    res.status(200).json({
      status: 'success',
      data: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    logger.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, date_of_birth, address } = req.body;

    console.log('Updating profile for user ID:', userId);
    console.log('Update data:', { name, phone, date_of_birth, address });

    if (!name && !phone && !date_of_birth && !address) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one field is required to update'
      });
    }

    const updateUserSql = `
      UPDATE users 
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          date_of_birth = COALESCE($3, date_of_birth),
          address = COALESCE($4, address),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, name, email, role, employee_id, phone, 
                date_of_birth, address, onboarding_status, 
                is_active, email_verified, created_at, updated_at
    `;
    
    const result = await query(updateUserSql, [
      name, phone, date_of_birth, address, userId
    ]);

    const updatedUser = result.rows[0];
    console.log('Profile updated for user ID:', userId);
    logger.info(`Profile updated for user ID: ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    logger.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change password 
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('Changing password for user ID:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 8 characters long'
      });
    }

    const findUserSql = 'SELECT password FROM users WHERE id = $1';
    const result = await query(findUserSql, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      console.log('Wrong current password for user ID:', userId);
      logger.warn(`Failed password change attempt for user ID: ${userId}`);
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be different from current password'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const updatePasswordSql = `
      UPDATE users 
      SET password = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await query(updatePasswordSql, [password_hash, userId]);

    console.log('Password changed for user ID:', userId);
    logger.info(`Password changed for user ID: ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    logger.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user 
 */
exports.logout = async (req, res) => {
  try {
    console.log('Logging out user ID:', req.user?.id);
    
    logger.info(`User logged out: ID ${req.user?.id}`);
    
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    logger.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify token validity
 */
exports.verifyToken = async (req, res) => {
  try {
    console.log('Token verified for user:', req.user.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    logger.error('Token verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error verifying token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all users (Admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    console.log('Getting all users - Admin:', req.user.id);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin only.'
      });
    }

    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    if (role) {
      whereClause += `WHERE role = $${paramCount}`;
      queryParams.push(role);
      paramCount++;
    }

    if (search) {
      const searchCondition = `name ILIKE $${paramCount} OR email ILIKE $${paramCount}`;
      whereClause += whereClause ? ` AND (${searchCondition})` : `WHERE ${searchCondition}`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Get total count
    const countSql = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await query(countSql, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const usersSql = `
      SELECT id, name, email, role, employee_id, phone, 
             date_of_birth, address, onboarding_status, 
             is_active, email_verified, created_at, updated_at, last_login
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const usersResult = await query(usersSql, [...queryParams, limit, offset]);

    console.log('Users fetched - Count:', usersResult.rows.length);
    
    res.status(200).json({
      status: 'success',
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    logger.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user status (Admin only)
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active, onboarding_status, role } = req.body;

    console.log('Updating user status - Admin:', req.user.id, 'Target user:', userId);
    console.log('Update data:', { is_active, onboarding_status, role });

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin only.'
      });
    }

    if (is_active === undefined && !onboarding_status && !role) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one field is required to update'
      });
    }

    if (userId == req.user.id && (role !== undefined || is_active === false)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot modify your own role or deactivate your own account'
      });
    }

    const updateUserSql = `
      UPDATE users 
      SET is_active = COALESCE($1, is_active),
          onboarding_status = COALESCE($2, onboarding_status),
          role = COALESCE($3, role),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, email, role, employee_id, is_active, 
                onboarding_status, created_at, updated_at
    `;
    
    const result = await query(updateUserSql, [
      is_active, onboarding_status, role, userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const updatedUser = result.rows[0];
    console.log('User status updated for ID:', userId);
    logger.info(`User status updated for ID: ${userId} by admin ID: ${req.user.id}`);

    res.status(200).json({
      status: 'success',
      message: 'User status updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update user status error:', error);
    logger.error('Update user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;