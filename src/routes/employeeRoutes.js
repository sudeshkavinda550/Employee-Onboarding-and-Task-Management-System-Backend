const express = require('express');
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const authValidator = require('../validators/authValidator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/profile', employeeController.getProfile);
router.put('/profile', authValidator.updateProfile, validate, employeeController.updateProfile);
router.get('/dashboard', employeeController.getDashboard);
router.get('/documents', employeeController.getDocuments);

module.exports = router;