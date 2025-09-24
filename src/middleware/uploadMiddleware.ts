import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Type-safe middleware wrapper to avoid Express type conflicts
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void;

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only allow 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific image file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  }
});

// Additional validation middleware for image uploads
export const validateImageUpload: MiddlewareFunction = (req: Request, res: Response, next: NextFunction): void => {
  console.log('🔍 Upload validation - req.file:', req.file);
  console.log('🔍 Upload validation - req.files:', req.files);
  console.log('🔍 Upload validation - req.body:', req.body);
  
  if (req.file) {
    // Additional file size validation (in case multer limits don't work)
    if (req.file.size > 5 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
      return;
    }

    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      res.status(400).json({
        success: false,
        error: 'Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.'
      });
      return;
    }
  }
  
  next();
};
