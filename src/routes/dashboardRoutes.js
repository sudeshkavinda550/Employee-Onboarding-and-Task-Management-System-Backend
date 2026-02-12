const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(authenticate);

router.get('/employee', checkRole('employee'), dashboardController.getEmployeeDashboard);
router.get('/hr', checkRole('hr', 'admin'), dashboardController.getHRDashboard);
router.get('/admin', checkRole('admin'), dashboardController.getAdminDashboard);
router.get('/statistics', dashboardController.getTaskStatistics);

module.exports = router;