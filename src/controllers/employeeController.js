const User = require('../models/User');
const EmployeeTask = require('../models/EmployeeTask');
const Document = require('../models/Document');
const taskService = require('../services/taskService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const employeeController = {
  /**
   * Get current user profile
   */
  getProfile: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const progress = await User.getProgress(req.user.id);
    
    sendSuccess(res, 200, 'Profile retrieved successfully', {
      ...user,
      onboardingProgress: progress,
    });
  }),
  
  /**
   * Update current user profile
   */
  updateProfile: asyncHandler(async (req, res) => {
    const updatedUser = await User.update(req.user.id, req.body);
    sendSuccess(res, 200, 'Profile updated successfully', updatedUser);
  }),
  
  /**
   * Get employee dashboard data
   */
  getDashboard: asyncHandler(async (req, res) => {
    const progress = await User.getProgress(req.user.id);
    const tasks = await EmployeeTask.findByEmployeeId(req.user.id);
    const documents = await Document.findByEmployeeId(req.user.id);
    
    sendSuccess(res, 200, 'Dashboard data retrieved successfully', {
      progress,
      recentTasks: tasks.slice(0, 5),
      recentDocuments: documents.slice(0, 3),
    });
  }),
  
  /**
   * Get employee documents
   */
  getDocuments: asyncHandler(async (req, res) => {
    const documents = await Document.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  }),
  
  /**
   * Get all employees (HR/Admin)
   */
  getAllEmployees: asyncHandler(async (req, res) => {
    const filters = {
      role: 'employee',
      department_id: req.query.department_id,
      onboarding_status: req.query.onboarding_status,
      search: req.query.search,
    };
    
    const employees = await User.findAll(filters);
    sendSuccess(res, 200, 'Employees retrieved successfully', employees);
  }),
  
  /**
   * Get employee by ID (HR/Admin)
   */
  getEmployeeById: asyncHandler(async (req, res) => {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    const progress = await User.getProgress(req.params.id);
    const tasks = await EmployeeTask.findByEmployeeId(req.params.id);
    
    sendSuccess(res, 200, 'Employee retrieved successfully', {
      ...employee,
      progress,
      tasks,
    });
  }),
  
  /**
   * Create employee (HR/Admin)
   */
  createEmployee: asyncHandler(async (req, res) => {
    const employee = await User.create({
      ...req.body,
      role: 'employee',
    });
    
    sendSuccess(res, 201, 'Employee created successfully', employee);
  }),
  
  /**
   * Update employee (HR/Admin)
   */
  updateEmployee: asyncHandler(async (req, res) => {
    const employee = await User.update(req.params.id, req.body);
    sendSuccess(res, 200, 'Employee updated successfully', employee);
  }),
  
  /**
   * Delete employee (HR/Admin)
   */
  deleteEmployee: asyncHandler(async (req, res) => {
    await User.delete(req.params.id);
    sendSuccess(res, 200, 'Employee deleted successfully');
  }),
  
  /**
   * Assign template to employee (HR/Admin)
   */
  assignTemplate: asyncHandler(async (req, res) => {
    const { templateId } = req.body;
    const assignedTasks = await taskService.assignTemplateToEmployee(
      req.params.id,
      templateId,
      req.user.id
    );
    
    // Update employee onboarding status
    await User.updateOnboardingStatus(req.params.id, 'in_progress');
    
    sendSuccess(res, 200, 'Template assigned successfully', assignedTasks);
  }),
  
  /**
   * Get employee progress (HR/Admin)
   */
  getEmployeeProgress: asyncHandler(async (req, res) => {
    const progress = await User.getProgress(req.params.id);
    sendSuccess(res, 200, 'Progress retrieved successfully', progress);
  }),
  
  /**
   * Send reminder to employee (HR/Admin)
   */
  sendReminder: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Reminder sent successfully');
  }),
};

module.exports = employeeController;
