const express = require('express');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const notificationController = require('../controllers/notificationController');
const { sendSuccess } = require('../utils/responseHandler');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// System settings
router.get('/settings', (req, res) => {
  sendSuccess(res, 200, 'Settings retrieved successfully', {
    message: 'Admin settings endpoint',
  });
});

router.put('/settings', (req, res) => {
  sendSuccess(res, 200, 'Settings updated successfully', {
    message: 'Admin settings update endpoint',
  });
});

// User management
router.get('/users', (req, res) => {
  sendSuccess(res, 200, 'Users retrieved successfully', {
    message: 'Admin users endpoint',
  });
});

// Notification management
router.post('/notifications', notificationController.createNotification);

// Activity logs
router.get('/activity-logs', (req, res) => {
  sendSuccess(res, 200, 'Activity logs retrieved successfully', {
    message: 'Admin activity logs endpoint',
  });
});

// System health
router.get('/system-health', (req, res) => {
  sendSuccess(res, 200, 'System health retrieved successfully', {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

module.exports = router;