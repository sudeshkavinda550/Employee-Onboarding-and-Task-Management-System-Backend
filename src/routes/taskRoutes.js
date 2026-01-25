const express = require('express');
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const taskValidator = require('../validators/taskValidator');
const { uploadSingle } = require('../middleware/fileUpload');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee task routes
router.get('/my-tasks', taskController.getMyTasks);
router.get('/progress', taskController.getTaskProgress);
router.get('/overdue', taskController.getOverdueTasks);
router.get('/:id', taskValidator.validateId, validate, taskController.getTaskById);
router.put('/:id/status', taskValidator.updateStatus, validate, taskController.updateTaskStatus);
router.post('/:id/upload', uploadSingle('document'), taskController.uploadTaskDocument);
router.post('/:id/mark-read', taskValidator.validateId, validate, taskController.markTaskAsRead);

module.exports = router;