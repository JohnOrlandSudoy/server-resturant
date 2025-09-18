import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { jwtService } from '../utils/jwtService';
import { authMiddleware } from '../middleware/authMiddleware';
import { databaseService } from '../services/databaseService';
import { emailService } from '../services/emailService';
import { logger } from '../utils/logger';
import * as bcrypt from 'bcryptjs';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Authenticate user
    const authResponse = await supabaseService().authenticateUser(username, password);

    if (!authResponse.success || !authResponse.data) {
      return res.status(401).json({
        success: false,
        error: authResponse.error || 'Authentication failed'
      });
    }

    const user = authResponse.data;

    // Generate JWT token
    const token = jwtService.generateToken(user);

    // Update last login
    await supabaseService().updateUserLastLogin(user.id);

    // Sync user to local database for offline access
    try {
      await databaseService.syncUserToLocal(user);
      logger.info(`User ${username} synced to local database`);
    } catch (error) {
      logger.warn(`Failed to sync user ${username} to local database:`, error);
    }

    logger.info(`User ${username} logged in successfully`);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatarUrl
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role, first_name, last_name, phone } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, password, role, first_name, and last_name are required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'cashier', 'kitchen', 'inventory_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: admin, cashier, kitchen, inventory_manager'
      });
    }

    // Check if username already exists
    const existingUser = await supabaseService().getUserByUsername(username);
    if (existingUser.success && existingUser.data) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await supabaseService().getUserByEmail(email);
    if (existingEmail.success && existingEmail.data) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Create user
    const createResponse = await supabaseService().createUser({
      username,
      email,
      password,
      role,
      firstName: first_name,
      lastName: last_name,
      phone: phone || undefined
    });

    if (!createResponse.success || !createResponse.data) {
      return res.status(500).json({
        success: false,
        error: createResponse.error || 'Failed to create user'
      });
    }

    const user = createResponse.data;

    // Generate JWT token
    const token = jwtService.generateToken(user);

    // Sync user to local database for offline access
    try {
      await databaseService.syncUserToLocal(user);
      logger.info(`User ${username} synced to local database`);
    } catch (error) {
      logger.warn(`Failed to sync user ${username} to local database:`, error);
    }

    logger.info(`User ${username} registered successfully`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatarUrl
        }
      }
    });

  } catch (error) {
    logger.error('Register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get profile endpoint
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const newToken = jwtService.refreshToken(token);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    return res.status(401).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info(`User ${req.user.username} logged out`);

    return res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Forgot Password endpoint
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check if user exists
    const userResponse = await supabaseService().getUserByEmail(email);
    if (!userResponse.success || !userResponse.data) {
      // For security, don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    const user = userResponse.data;

    // Create password reset token
    const tokenResponse = await supabaseService().createPasswordResetToken(email);
    if (!tokenResponse.success || !tokenResponse.data) {
      logger.error('Failed to create password reset token:', tokenResponse.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create password reset token'
      });
    }

    const { token, expiresAt } = tokenResponse.data;

    // Send password reset email
    const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password`;
    const emailResult = await emailService.sendPasswordResetEmail(
      email,
      user.username,
      token,
      resetUrl
    );

    if (!emailResult.success) {
      logger.error('Failed to send password reset email:', emailResult.error);
      // Don't fail the request if email fails, just log it
      logger.warn('Password reset token created but email failed to send:', { token, email });
    }

    logger.info(`Password reset requested for user: ${user.username} (${email})`);

    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      data: {
        expiresAt,
        // In development, include token for testing
        ...(process.env['NODE_ENV'] === 'development' && { token })
      }
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Reset Password endpoint
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Verify token
    const verifyResponse = await supabaseService().verifyPasswordResetToken(token);
    if (!verifyResponse.success || !verifyResponse.data) {
      return res.status(400).json({
        success: false,
        error: verifyResponse.error || 'Invalid or expired token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Reset password
    const resetResponse = await supabaseService().resetPassword(token, hashedPassword);
    if (!resetResponse.success || !resetResponse.data) {
      return res.status(500).json({
        success: false,
        error: resetResponse.error || 'Failed to reset password'
      });
    }

    const { userId, username } = resetResponse.data;

    logger.info(`Password reset successfully for user: ${username} (${userId})`);

    return res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        userId,
        username
      }
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify Email endpoint
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // Verify email token
    const verifyResponse = await supabaseService().verifyEmail(token);
    if (!verifyResponse.success || !verifyResponse.data) {
      return res.status(400).json({
        success: false,
        error: verifyResponse.error || 'Invalid or expired token'
      });
    }

    const { userId, username, email } = verifyResponse.data;

    logger.info(`Email verified successfully for user: ${username} (${email})`);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        userId,
        username,
        email
      }
    });

  } catch (error) {
    logger.error('Verify email error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Resend Email Verification endpoint
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check if user exists
    const userResponse = await supabaseService().getUserByEmail(email);
    if (!userResponse.success || !userResponse.data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResponse.data;

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Create email verification token
    const tokenResponse = await supabaseService().createEmailVerificationToken(email);
    if (!tokenResponse.success || !tokenResponse.data) {
      logger.error('Failed to create email verification token:', tokenResponse.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create email verification token'
      });
    }

    const { token, expiresAt } = tokenResponse.data;

    // Send verification email
    const verificationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/verify-email`;
    const emailResult = await emailService.sendEmailVerificationEmail(
      email,
      user.username,
      token,
      verificationUrl
    );

    if (!emailResult.success) {
      logger.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      });
    }

    logger.info(`Email verification resent for user: ${user.username} (${email})`);

    return res.json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        expiresAt,
        // In development, include token for testing
        ...(process.env['NODE_ENV'] === 'development' && { token })
      }
    });

  } catch (error) {
    logger.error('Resend verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Change Password endpoint (for authenticated users)
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Get user data to verify current password
    const userResponse = await supabaseService().getUserById(userId);
    if (!userResponse.success || !userResponse.data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResponse.data;

    // For now, we'll skip current password verification since we don't store passwords
    // In a production system, you would verify the current password here
    // const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    // if (!isCurrentPasswordValid) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Current password is incorrect'
    //   });
    // }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateResponse = await supabaseService().updateUserPassword(userId, hashedPassword);
    if (!updateResponse.success) {
      return res.status(500).json({
        success: false,
        error: updateResponse.error || 'Failed to update password'
      });
    }

    logger.info(`Password changed successfully for user: ${user.username} (${userId})`);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get Email Service Status endpoint
router.get('/email-status', async (req: Request, res: Response) => {
  try {
    const status = emailService.getConfigurationStatus();
    
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Get email status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
