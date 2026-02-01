const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// Employee profile endpoints (for all authenticated users)
router.get('/profile', employeeController.getProfile);
router.put('/profile', employeeController.updateProfile);
router.get('/dashboard', employeeController.getDashboard);
router.get('/documents', employeeController.getDocuments);

// Since upload middleware doesn't exist yet, create a simple one temporarily
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create a simple upload middleware for now
const createUploadMiddleware = () => {
  const uploadDir = path.join(__dirname, '../../uploads/profile-pictures');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExt = path.extname(file.originalname);
      cb(null, `profile-${uniqueSuffix}${fileExt}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  };

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  });
};

const upload = createUploadMiddleware();

router.post('/profile/picture', 
  upload.single('profilePicture'), 
  employeeController.uploadProfilePicture
);

module.exports = router;