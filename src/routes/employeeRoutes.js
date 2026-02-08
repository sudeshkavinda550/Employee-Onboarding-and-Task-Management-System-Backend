const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');
const { isHROrAdmin } = require('../middleware/roleCheck');

router.use(authenticate);

router.get('/profile', employeeController.getProfile);
router.put('/profile', employeeController.updateProfile);
router.get('/dashboard', employeeController.getDashboard);
router.get('/documents', employeeController.getDocuments);

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

router.use(isHROrAdmin);

// Get all employees
router.get('/', employeeController.getAllEmployees);

// Get employee by ID
router.get('/:id', employeeController.getEmployeeById);

// Create new employee
router.post('/', employeeController.createEmployee);

// Update employee
router.put('/:id', employeeController.updateEmployee);

// Delete employee
router.delete('/:id', employeeController.deleteEmployee);

// Get employee tasks/progress
router.get('/:id/tasks', employeeController.getEmployeeTasks);
router.get('/:id/progress', employeeController.getEmployeeProgress);

// Send reminder to employee
router.post('/:id/reminder', employeeController.sendReminder);

module.exports = router;