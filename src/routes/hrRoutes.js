const express = require('express');
const employeeController = require('../controllers/employeeController');
const taskController = require('../controllers/taskController');
const documentController = require('../controllers/documentController');
const templateController = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');
const { isHROrAdmin } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const employeeValidator = require('../validators/employeeValidator');
const documentValidator = require('../validators/documentValidator');

const router = express.Router();

// All routes require authentication and HR/Admin role
router.use(authenticate);
router.use(isHROrAdmin);

// Employee management (HR only)
router.get('/employees', employeeController.getAllEmployees);
router.get('/employees/:id', employeeValidator.validateId, validate, employeeController.getEmployeeById);
router.post('/employees', employeeValidator.create, validate, employeeController.createEmployee);
router.put('/employees/:id', employeeValidator.update, validate, employeeController.updateEmployee);
router.delete('/employees/:id', employeeValidator.validateId, validate, employeeController.deleteEmployee);
router.post('/employees/:id/assign-template', employeeValidator.assignTemplate, validate, employeeController.assignTemplate);
router.get('/employees/:id/progress', employeeValidator.validateId, validate, employeeController.getEmployeeProgress);
router.post('/employees/:id/send-reminder', employeeValidator.validateId, validate, employeeController.sendReminder);

// Task management
router.get('/tasks', taskController.getAllTasks);
router.get('/employees/:employeeId/tasks', taskController.getEmployeeTasks);
router.post('/tasks/assign', taskController.assignTask);
router.put('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);
router.get('/tasks/analytics', taskController.getTaskAnalytics);

// Document management
router.get('/documents', documentController.getAllDocuments);
router.get('/documents/pending', documentController.getPendingDocuments);
router.put('/documents/:id/approve', documentValidator.approve, validate, documentController.approveDocument);
router.put('/documents/:id/reject', documentValidator.reject, validate, documentController.rejectDocument);

// Template management
router.get('/templates/analytics', templateController.getTemplateAnalytics);

module.exports = router;