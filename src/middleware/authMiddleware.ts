import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../utils/jwtService';
import { supabaseService } from '../services/supabaseService';
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
      
      // Get user from database to ensure they still exist and are active
      const userResponse = await supabaseService().getUserById(decoded.id);
      
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
