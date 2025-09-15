import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../utils/jwtService';
import { supabaseService } from '../services/supabaseService';
import { offlineService } from '../services/offlineService';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      io?: any;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwtService.verifyToken(token);
      
      // Try to get user from database (online first, then offline)
      let userResponse;
      
      if (offlineService.getIsOnline()) {
        // Online: Try Supabase first
        try {
          userResponse = await supabaseService().getUserById(decoded.id);
        } catch (error) {
          logger.warn('Supabase user lookup failed, falling back to offline:', error);
          userResponse = await getOfflineUser(decoded.id);
        }
      } else {
        // Offline: Use local database
        userResponse = await getOfflineUser(decoded.id);
      }
      
      if (!userResponse.success || !userResponse.data) {
        res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
        return;
      }

      // Add user to request object
      req.user = userResponse.data;
      
      next();
    } catch (tokenError) {
      logger.error('Token verification failed:', tokenError);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Helper function to get user from offline database
async function getOfflineUser(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const dbService = offlineService['dbService']; // Access private property
    const user = await dbService.getLocalUser(userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Convert database user to User interface
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      isActive: user.is_active === 1,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
    
    return { success: true, data: userData };
  } catch (error) {
    logger.error('Offline user lookup failed:', error);
    return { success: false, error: 'Failed to lookup user' };
  }
}

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const adminOnly = roleMiddleware(['admin']);
export const cashierOrAdmin = roleMiddleware(['admin', 'cashier']);
export const kitchenOrAdmin = roleMiddleware(['admin', 'kitchen']);
export const inventoryManagerOrAdmin = roleMiddleware(['admin', 'inventory_manager']);
