const Template = require('../models/Template');
const Task = require('../models/Task');
const templateService = require('../services/templateService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const templateController = {
  /**
   * Get all templates
   */
  getAllTemplates: asyncHandler(async (req, res) => {
    const filters = {
      department_id: req.query.department_id,
      search: req.query.search,
    };
    
    const templates = await Template.findAll(filters);
    sendSuccess(res, 200, 'Templates retrieved successfully', templates);
  }),
  
  /**
   * Get template by ID
   */
  getTemplateById: asyncHandler(async (req, res) => {
    const template = await templateService.getTemplateWithTasks(req.params.id);
    if (!template) {
      return sendError(res, 404, 'Template not found');
    }
    
    sendSuccess(res, 200, 'Template retrieved successfully', template);
  }),
  
  /**
   * Create template
   */
  createTemplate: asyncHandler(async (req, res) => {
    const { tasks, ...templateData } = req.body;
    
    const template = await templateService.createTemplateWithTasks(
      templateData,
      tasks,
      req.user.id
    );
    
    sendSuccess(res, 201, 'Template created successfully', template);
  }),
  
  /**
   * Update template
   */
  updateTemplate: asyncHandler(async (req, res) => {
    const template = await Template.update(req.params.id, req.body);
    sendSuccess(res, 200, 'Template updated successfully', template);
  }),
  
  /**
   * Delete template
   */
  deleteTemplate: asyncHandler(async (req, res) => {
    await Template.delete(req.params.id);
    sendSuccess(res, 200, 'Template deleted successfully');
  }),
  
  /**
   * Duplicate template
   */
  duplicateTemplate: asyncHandler(async (req, res) => {
    const template = await Template.duplicate(req.params.id, req.user.id);
    sendSuccess(res, 201, 'Template duplicated successfully', template);
  }),
  
  /**
   * Get template tasks
   */
  getTemplateTasks: asyncHandler(async (req, res) => {
    const tasks = await Task.findByTemplateId(req.params.id);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),
  
  /**
   * Add task to template
   */
  addTaskToTemplate: asyncHandler(async (req, res) => {
    const task = await Task.create({
      ...req.body,
      template_id: req.params.id,
    });
    
    sendSuccess(res, 201, 'Task added successfully', task);
  }),
  
  /**
   * Remove task from template
   */
  removeTaskFromTemplate: asyncHandler(async (req, res) => {
    await Task.delete(req.params.taskId);
    sendSuccess(res, 200, 'Task removed successfully');
  }),
  
  /**
   * Update template task
   */
  updateTemplateTask: asyncHandler(async (req, res) => {
    const task = await Task.update(req.params.taskId, req.body);
    sendSuccess(res, 200, 'Task updated successfully', task);
  }),
  
  /**
   * Assign template to employee
   */
  assignTemplateToEmployee: asyncHandler(async (req, res) => {
    const taskService = require('../services/taskService');
    const assignedTasks = await taskService.assignTemplateToEmployee(
      req.params.employeeId,
      req.params.id,
      req.user.id
    );
    
    sendSuccess(res, 200, 'Template assigned successfully', assignedTasks);
  }),
  
  /**
   * Get template analytics
   */
  getTemplateAnalytics: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Analytics retrieved successfully', {});
  }),
};

module.exports = templateController;