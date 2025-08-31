import * as jwt from 'jsonwebtoken';
import { User } from '../types';
import { logger } from '../utils/logger';

export class JWTService {
  private secret: jwt.Secret;
  private expiresIn: string;

  constructor() {
    this.secret = process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-in-production';
    this.expiresIn = process.env['JWT_EXPIRES_IN'] || '24h';
  }

  generateToken(user: User): string {
    try {
      const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };

      // @ts-ignore - Bypass strict TypeScript checking for jwt.sign
      return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
    } catch (error) {
      logger.error('JWT token generation error:', error);
      throw new Error('Failed to generate token');
    }
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      logger.error('JWT token verification error:', error);
      throw new Error('Invalid token');
    }
  }

  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('JWT token decode error:', error);
      throw new Error('Failed to decode token');
    }
  }

  refreshToken(token: string): string {
    try {
      const decoded = this.verifyToken(token);
      const payload = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName,
        lastName: decoded.lastName
      };

      // @ts-ignore - Bypass strict TypeScript checking for jwt.sign
      return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
    } catch (error) {
      logger.error('JWT token refresh error:', error);
      throw new Error('Failed to refresh token');
    }
  }
}

export const jwtService = new JWTService();
