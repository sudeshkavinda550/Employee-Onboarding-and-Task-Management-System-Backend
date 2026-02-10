const express = require('express');
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const taskValidator = require('../validators/taskValidator');
const { uploadSingle } = require('../middleware/fileUpload');

const router = express.Router();

router.use(authenticate);

router.get('/my-tasks', taskController.getMyTasks);
router.get('/progress', taskController.getTaskProgress);
router.get('/overdue', taskController.getOverdueTasks);
router.get('/:id', taskValidator.validateId, validate, taskController.getTaskById);
router.put('/:id/status', taskValidator.updateStatus, validate, taskController.updateTaskStatus);
router.post('/:id/upload', uploadSingle('document'), taskController.uploadTaskDocument);
router.post('/:id/mark-read', taskValidator.validateId, validate, taskController.markTaskAsRead);

router.get('/checklist/stats', taskController.getTaskStats);
router.get('/checklist/summary', taskController.getTaskSummary);
router.get('/checklist/today', taskController.getTodayTasks);
router.post('/checklist/bulk-status', taskController.bulkUpdateTaskStatus);
router.get('/checklist/analytics', taskController.getTaskAnalytics);
router.get('/checklist/filtered', taskController.getFilteredTasks);

module.exports = router;