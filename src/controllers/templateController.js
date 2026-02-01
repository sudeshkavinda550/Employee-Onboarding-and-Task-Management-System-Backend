const Template = require('../models/Template');
const Task = require('../models/Task');
const EmployeeTask = require('../models/EmployeeTask');
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
    const { tasks, ...templateData } = req.body;
    
    // FIX: Check if template exists first
    const existingTemplate = await Template.findById(req.params.id);
    if (!existingTemplate) {
      return sendError(res, 404, 'Template not found');
    }
    
    // Update template
    const template = await Template.update(req.params.id, templateData);
    
    // If tasks are provided, delete old tasks and create new ones
    if (tasks && Array.isArray(tasks)) {
      // Delete existing tasks
      const existingTasks = await Task.findByTemplateId(req.params.id);
      for (const task of existingTasks) {
        await Task.delete(task.id);
      }
      
      // Create new tasks
      const tasksWithTemplateId = tasks.map(task => ({
        ...task,
        template_id: req.params.id,
      }));
      await Task.bulkCreate(tasksWithTemplateId);
    }
    
    // Get updated template with tasks
    const updatedTemplate = await templateService.getTemplateWithTasks(req.params.id);
    
    sendSuccess(res, 200, 'Template updated successfully', updatedTemplate);
  }),
  
  /**
   * Delete template
   */
  deleteTemplate: asyncHandler(async (req, res) => {
    // FIX: Check if template exists
    const template = await Template.findById(req.params.id);
    if (!template) {
      return sendError(res, 404, 'Template not found');
    }
    
    // FIX: Check if template is assigned to any employees
    const { query } = require('../config/database');
    const assignmentCheck = await query(
      'SELECT COUNT(*) as count FROM employee_tasks WHERE template_id = $1',
      [req.params.id]
    );
    
    if (parseInt(assignmentCheck.rows[0].count) > 0) {
      return sendError(
        res, 
        400, 
        'Cannot delete template that is assigned to employees. Please unassign it first.'
      );
    }
    
    await Template.delete(req.params.id);
    sendSuccess(res, 200, 'Template deleted successfully');
  }),
  
  /**
   * Duplicate template
   */
  duplicateTemplate: asyncHandler(async (req, res) => {
    // FIX: Check if template exists
    const existingTemplate = await Template.findById(req.params.id);
    if (!existingTemplate) {
      return sendError(res, 404, 'Template not found');
    }
    
    const template = await Template.duplicate(req.params.id, req.user.id);
    const duplicatedTemplate = await templateService.getTemplateWithTasks(template.id);
    sendSuccess(res, 201, 'Template duplicated successfully', duplicatedTemplate);
  }),
  
  /**
   * Get template tasks
   */
  getTemplateTasks: asyncHandler(async (req, res) => {
    // FIX: Check if template exists
    const template = await Template.findById(req.params.id);
    if (!template) {
      return sendError(res, 404, 'Template not found');
    }
    
    const tasks = await Task.findByTemplateId(req.params.id);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),
  
  /**
   * Add task to template
   */
  addTaskToTemplate: asyncHandler(async (req, res) => {
    // FIX: Check if template exists
    const template = await Template.findById(req.params.id);
    if (!template) {
      return sendError(res, 404, 'Template not found');
    }
    
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
    // FIX: Check if task exists
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return sendError(res, 404, 'Task not found');
    }
    
    // FIX: Verify task belongs to the template
    if (task.template_id !== req.params.templateId) {
      return sendError(res, 400, 'Task does not belong to this template');
    }
    
    await Task.delete(req.params.taskId);
    sendSuccess(res, 200, 'Task removed successfully');
  }),
  
  /**
   * Update template task
   */
  updateTemplateTask: asyncHandler(async (req, res) => {
    // FIX: Check if task exists
    const existingTask = await Task.findById(req.params.taskId);
    if (!existingTask) {
      return sendError(res, 404, 'Task not found');
    }
    
    // FIX: Verify task belongs to the template
    if (existingTask.template_id !== req.params.templateId) {
      return sendError(res, 400, 'Task does not belong to this template');
    }
    
    const task = await Task.update(req.params.taskId, req.body);
    sendSuccess(res, 200, 'Task updated successfully', task);
  }),
  
  /**
   * Assign template to employee
   */
  assignTemplateToEmployee: asyncHandler(async (req, res) => {
    const { employeeId, id: templateId } = req.params;
    
    // FIX 1: Check if template exists
    const template = await Template.findById(templateId);
    if (!template) {
      return sendError(res, 404, 'Template not found');
    }
    
    // FIX 2: Check if template has tasks
    const tasks = await Task.findByTemplateId(templateId);
    if (!tasks || tasks.length === 0) {
      return sendError(res, 400, 'Cannot assign template without tasks');
    }
    
    // FIX 3: Check if employee exists and has 'employee' role
    const { query } = require('../config/database');
    const employeeCheck = await query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [employeeId]
    );
    
    if (employeeCheck.rows.length === 0) {
      return sendError(res, 404, 'Employee not found');
    }
    
    const employee = employeeCheck.rows[0];
    
    if (!employee.is_active) {
      return sendError(res, 400, 'Cannot assign template to inactive employee');
    }
    
    if (employee.role !== 'employee') {
      return sendError(res, 400, 'Only employees can be assigned templates');
    }
    
    // FIX 4: Check if template is already assigned to this employee
    const existingAssignment = await query(
      'SELECT COUNT(*) as count FROM employee_tasks WHERE employee_id = $1 AND template_id = $2',
      [employeeId, templateId]
    );
    
    if (parseInt(existingAssignment.rows[0].count) > 0) {
      return sendError(res, 400, 'Template is already assigned to this employee');
    }
    
    // Assign template
    const assignedTasks = await EmployeeTask.assignToEmployee(
      employeeId,
      templateId,
      req.user.id
    );
    
    sendSuccess(res, 200, 'Template assigned successfully', assignedTasks);
  }),
  
  /**
   * Get employees for assignment (only employees, not HR or admin)
   */
  getEmployeesForAssignment: asyncHandler(async (req, res) => {
    const { query } = require('../config/database');
    
    // FIX: Add optional template_id to exclude already assigned employees
    const templateId = req.query.template_id;
    
    let queryText = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.employee_id,
        u.position,
        u.start_date,
        u.onboarding_status,
        d.name as department_name
    `;
    
    // Add assignment status if template_id is provided
    if (templateId) {
      queryText += `,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM employee_tasks et 
            WHERE et.employee_id = u.id AND et.template_id = $1
          ) THEN true 
          ELSE false 
        END as is_assigned
      `;
    }
    
    queryText += `
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.role = 'employee' AND u.is_active = true
       ORDER BY u.name ASC
    `;
    
    const result = templateId 
      ? await query(queryText, [templateId])
      : await query(queryText);
    
    sendSuccess(res, 200, 'Employees retrieved successfully', result.rows);
  }),
  
  /**
   * Get employees assigned to a template with their progress
   */
  getTemplateAssignments: asyncHandler(async (req, res) => {
    const { id: templateId } = req.params;
    
    // FIX: Check if template exists
    const template = await Template.findById(templateId);
    if (!template) {
      return sendError(res, 404, 'Template not found');
    }
    
    const { query } = require('../config/database');
    
    const result = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.employee_id,
        u.position,
        u.start_date,
        u.onboarding_status,
        d.name as department_name,
        COUNT(et.id) as total_tasks,
        COUNT(CASE WHEN et.status = 'completed' THEN 1 END) as completed_tasks,
        ROUND(
          (COUNT(CASE WHEN et.status = 'completed' THEN 1 END)::numeric / 
           NULLIF(COUNT(et.id), 0)::numeric) * 100, 
          2
        ) as progress_percentage,
        MIN(et.assigned_date) as assigned_date,
        MAX(et.due_date) as due_date
       FROM employee_tasks et
       JOIN users u ON et.employee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE et.template_id = $1
       GROUP BY u.id, d.name
       ORDER BY assigned_date DESC`,
      [templateId]
    );
    
    sendSuccess(res, 200, 'Template assignments retrieved successfully', result.rows);
  }),
  
  /**
   * Get all employees with onboarding progress
   */
  getAllEmployeesProgress: asyncHandler(async (req, res) => {
    const employees = await EmployeeTask.getAllEmployeesProgress();
    sendSuccess(res, 200, 'Employee progress retrieved successfully', employees);
  }),
  
  /**
   * Get template analytics
   */
  getTemplateAnalytics: asyncHandler(async (req, res) => {
    const { id: templateId } = req.params;
    
    // FIX: Check if template exists
    const template = await Template.findById(templateId);
    if (!template) {
      return sendError(res, 404, 'Template not found');
    }
    
    const { query } = require('../config/database');
    
    // Get basic template stats
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT et.employee_id) as total_assignments,
        COUNT(CASE WHEN et.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN et.status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN et.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        AVG(CASE 
          WHEN et.status = 'completed' AND et.completed_date IS NOT NULL
          THEN EXTRACT(EPOCH FROM (et.completed_date - et.assigned_date))/86400 
        END) as avg_completion_days
       FROM employee_tasks et
       WHERE et.template_id = $1`,
      [templateId]
    );
    
    // FIX: Return empty object with zero values if no data
    const stats = statsResult.rows[0] || {
      total_assignments: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      avg_completion_days: null
    };
    
    sendSuccess(res, 200, 'Analytics retrieved successfully', stats);
  }),
};

module.exports = templateController;