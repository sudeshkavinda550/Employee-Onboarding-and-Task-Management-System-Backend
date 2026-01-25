const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { generateAccessToken, generateRefreshToken, generateResetToken } = require('../utils/generateToken');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const authService = {
  /**
   * Register new user
   */
  register: async (userData) => {
    try {
      // Check if user exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }
      
      // Create user
      const user = await User.create(userData);
      
      // Generate tokens
      const accessToken = generateAccessToken({ id: user.id, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });
      
      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.name);
      
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employee_id: user.employee_id,
        },
        token: accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  },
  
  /**
   * Login user
   */
  login: async (email, password) => {
    try {
      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Check if account is active
      if (!user.is_active) {
        throw new Error('Account has been disabled');
      }
      
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }
      
      // Generate tokens
      const accessToken = generateAccessToken({ id: user.id, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });
      
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employee_id: user.employee_id,
        },
        token: accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  },
  
  /**
   * Request password reset
   */
  forgotPassword: async (email) => {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        return { message: 'If email exists, reset link has been sent' };
      }
      
      // Generate reset token
      const resetToken = generateResetToken();
      const expires = new Date(Date.now() + 3600000); 
      
      // Save token to database
      await User.setResetToken(email, resetToken, expires);
      
      // Send reset email
      await emailService.sendPasswordResetEmail(email, user.name, resetToken);
      
      return { message: 'Password reset link sent to email' };
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  },
  
  /**
   * Reset password
   */
  resetPassword: async (token, newPassword) => {
    try {
      // Find user by token
      const user = await User.findByResetToken(token);
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }
      
      // Update password
      await User.updatePassword(user.id, newPassword);
      
      // Clear reset token
      await User.clearResetToken(user.id);
      
      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  },
  
  /**
   * Change password
   */
  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      const user = await User.findById(userId);
      
      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      await User.updatePassword(userId, newPassword);
      
      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  },
};

module.exports = authService;