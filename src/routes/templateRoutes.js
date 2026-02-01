const express = require('express');
const templateController = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');
const { isHROrAdmin } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const templateValidator = require('../validators/templateValidator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// CRITICAL FIX: Specific routes MUST come BEFORE parameterized routes
// ============================================

// Public routes - Employee-related (BEFORE /:id to avoid conflicts)
router.get('/employees/for-assignment', templateController.getEmployeesForAssignment);
router.get('/employees/progress', templateController.getAllEmployeesProgress);

// Public template routes (accessible by all authenticated users)
router.get('/', templateController.getAllTemplates);
router.get('/:id', templateValidator.validateId, validate, templateController.getTemplateById);
router.get('/:id/tasks', templateValidator.validateId, validate, templateController.getTemplateTasks);
router.get('/:id/assignments', templateValidator.validateId, validate, templateController.getTemplateAssignments);
router.get('/:id/analytics', templateValidator.validateId, validate, templateController.getTemplateAnalytics);

// ============================================
// HR/Admin only routes
// ============================================
router.use(isHROrAdmin);

// Template CRUD operations
router.post('/', templateValidator.create, validate, templateController.createTemplate);
router.put('/:id', templateValidator.validateId, templateValidator.update, validate, templateController.updateTemplate);
router.delete('/:id', templateValidator.validateId, validate, templateController.deleteTemplate);
router.post('/:id/duplicate', templateValidator.validateId, validate, templateController.duplicateTemplate);

// Task management
router.post('/:id/tasks', templateValidator.validateId, validate, templateController.addTaskToTemplate);
router.put('/:templateId/tasks/:taskId', templateController.updateTemplateTask);
router.delete('/:templateId/tasks/:taskId', templateController.removeTaskFromTemplate);

// Employee assignment (HR/Admin only)
router.post('/:id/assign/:employeeId', templateValidator.validateId, validate, templateController.assignTemplateToEmployee);

module.exports = router;