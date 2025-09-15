import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { jwtService } from '../utils/jwtService';
import { authMiddleware } from '../middleware/authMiddleware';
import { databaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

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

export default router;
