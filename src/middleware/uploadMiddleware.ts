import multer from 'multer';

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
export const validateImageUpload = (req: any, res: any, next: any) => {
  console.log('🔍 Upload validation - req.file:', req.file);
  console.log('🔍 Upload validation - req.files:', req.files);
  console.log('🔍 Upload validation - req.body:', req.body);
  
  if (req.file) {
    // Additional file size validation (in case multer limits don't work)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
    }

    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.'
      });
    }
  }
  
  next();
};
