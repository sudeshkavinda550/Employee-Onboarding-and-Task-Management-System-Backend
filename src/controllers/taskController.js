const Task = require('../models/Task');
const EmployeeTask = require('../models/EmployeeTask');
const taskService = require('../services/taskService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const taskController = {
  /**
   * Get current user's tasks
   */
  getMyTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),
  
  /**
   * Get task by ID
   */
  getTaskById: asyncHandler(async (req, res) => {
    const task = await EmployeeTask.findById(req.params.id);
    if (!task) {
      return sendError(res, 404, 'Task not found');
    }
    
    // Check if user owns the task
    if (task.employee_id !== req.user.id && req.user.role === 'employee') {
      return sendError(res, 403, 'Access denied');
    }
    
    sendSuccess(res, 200, 'Task retrieved successfully', task);
  }),
  
  /**
   * Update task status
   */
  updateTaskStatus: asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    
    const task = await EmployeeTask.findById(req.params.id);
    if (!task) {
      return sendError(res, 404, 'Task not found');
    }
    
    // Check if user owns the task
    if (task.employee_id !== req.user.id && req.user.role === 'employee') {
      return sendError(res, 403, 'Access denied');
    }
    
    const updatedTask = await taskService.updateTaskStatus(req.params.id, status, req.user.id);
    sendSuccess(res, 200, 'Task status updated successfully', updatedTask);
  }),
  
  /**
   * Upload task document
   */
  uploadTaskDocument: asyncHandler(async (req, res) => {
    if (!req.file) {
      return sendError(res, 400, 'No file uploaded');
    }
    
    const Document = require('../models/Document');
    const document = await Document.create({
      employee_id: req.user.id,
      task_id: req.params.id,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
    });
    
    // Update task status to completed
    await EmployeeTask.updateStatus(req.params.id, 'completed');
    
    sendSuccess(res, 201, 'Document uploaded successfully', document);
  }),
  
  /**
   * Get task progress
   */
  getTaskProgress: asyncHandler(async (req, res) => {
    const progress = await EmployeeTask.getProgress(req.user.id);
    sendSuccess(res, 200, 'Progress retrieved successfully', progress);
  }),
  
  /**
   * Mark task as read
   */
  markTaskAsRead: asyncHandler(async (req, res) => {
    const task = await EmployeeTask.markAsRead(req.params.id);
    sendSuccess(res, 200, 'Task marked as read', task);
  }),
  
  /**
   * Get overdue tasks
   */
  getOverdueTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.getOverdueTasks(req.user.id);
    sendSuccess(res, 200, 'Overdue tasks retrieved successfully', tasks);
  }),
  
  /**
   * Get all tasks (HR/Admin)
   */
  getAllTasks: asyncHandler(async (req, res) => {
    const filters = {
      employee_id: req.query.employee_id,
      status: req.query.status,
    };
    
    sendSuccess(res, 200, 'Tasks retrieved successfully', []);
  }),
  
  /**
   * Get employee tasks (HR/Admin)
   */
  getEmployeeTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.findByEmployeeId(req.params.employeeId);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),
  
  /**
   * Assign task (HR/Admin)
   */
  assignTask: asyncHandler(async (req, res) => {
    sendSuccess(res, 201, 'Task assigned successfully');
  }),
  
  /**
   * Update task (HR/Admin)
   */
  updateTask: asyncHandler(async (req, res) => {
    const task = await Task.update(req.params.id, req.body);
    sendSuccess(res, 200, 'Task updated successfully', task);
  }),
  
  /**
   * Delete task (HR/Admin)
   */
  deleteTask: asyncHandler(async (req, res) => {
    await Task.delete(req.params.id);
    sendSuccess(res, 200, 'Task deleted successfully');
  }),
  
  /**
   * Get task analytics (HR/Admin)
   */
  getTaskAnalytics: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Analytics retrieved successfully', {});
  }),
};

module.exports = taskController;
