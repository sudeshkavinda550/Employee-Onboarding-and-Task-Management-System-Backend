const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Role-specific dashboard routes
router.get('/employee', checkRole('employee'), dashboardController.getEmployeeDashboard);
router.get('/hr', checkRole('hr', 'admin'), dashboardController.getHRDashboard);
router.get('/admin', checkRole('admin'), dashboardController.getAdminDashboard);

module.exports = router;