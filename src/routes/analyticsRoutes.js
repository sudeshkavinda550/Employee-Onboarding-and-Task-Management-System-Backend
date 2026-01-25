const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { isHROrAdmin } = require('../middleware/roleCheck');

const router = express.Router();

// All routes require authentication and HR/Admin role
router.use(authenticate);
router.use(isHROrAdmin);

router.get('/dashboard-stats', analyticsController.getDashboardStats);
router.get('/completion-rates', analyticsController.getCompletionRates);
router.get('/department', analyticsController.getDepartmentAnalytics);
router.get('/time-to-completion', analyticsController.getTimeToCompletion);
router.get('/task-completion-times', analyticsController.getTaskCompletionTimes);
router.get('/employee-progress-trend', analyticsController.getEmployeeProgressTrend);
router.get('/overdue-tasks', analyticsController.getOverdueTasksAnalytics);
router.get('/document-status', analyticsController.getDocumentStatusAnalytics);
router.get('/onboarding-timeline/:employeeId', analyticsController.getOnboardingTimeline);
router.get('/export', analyticsController.exportAnalytics);

module.exports = router;