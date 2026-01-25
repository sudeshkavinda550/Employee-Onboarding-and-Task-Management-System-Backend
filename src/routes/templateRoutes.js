const express = require('express');
const templateController = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');
const { isHROrAdmin } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const templateValidator = require('../validators/templateValidator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public template routes 
router.get('/', templateController.getAllTemplates);
router.get('/:id', templateValidator.validateId, validate, templateController.getTemplateById);
router.get('/:id/tasks', templateValidator.validateId, validate, templateController.getTemplateTasks);

// HR/Admin only routes
router.use(isHROrAdmin);

router.post('/', templateValidator.create, validate, templateController.createTemplate);
router.put('/:id', templateValidator.update, validate, templateController.updateTemplate);
router.delete('/:id', templateValidator.validateId, validate, templateController.deleteTemplate);
router.post('/:id/duplicate', templateValidator.duplicate, validate, templateController.duplicateTemplate);
router.post('/:id/tasks', templateController.addTaskToTemplate);
router.put('/:templateId/tasks/:taskId', templateController.updateTemplateTask);
router.delete('/:templateId/tasks/:taskId', templateController.removeTaskFromTemplate);
router.post('/:id/assign/:employeeId', templateController.assignTemplateToEmployee);

module.exports = router;