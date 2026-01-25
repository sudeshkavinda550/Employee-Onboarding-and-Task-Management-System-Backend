const User = require('../models/User');
const EmployeeTask = require('../models/EmployeeTask');
const Document = require('../models/Document');
const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const dashboardController = {
  /**
   * Get employee dashboard
   */
  getEmployeeDashboard: asyncHandler(async (req, res) => {
    const progress = await User.getProgress(req.user.id);
    const tasks = await EmployeeTask.findByEmployeeId(req.user.id);
    const documents = await Document.findByEmployeeId(req.user.id);
    const overdueTasks = await EmployeeTask.getOverdueTasks(req.user.id);
    
    sendSuccess(res, 200, 'Dashboard data retrieved successfully', {
      progress,
      pendingTasks: tasks.filter(t => t.status !== 'completed').slice(0, 5),
      recentDocuments: documents.slice(0, 3),
      overdueTasks,
    });
  }),
  
  /**
   * Get HR dashboard
   */
  getHRDashboard: asyncHandler(async (req, res) => {
    const stats = await analyticsService.getDashboardStats();
    const recentEmployees = await User.findAll({ role: 'employee' });
    const pendingDocuments = await Document.getPending();
    
    sendSuccess(res, 200, 'Dashboard data retrieved successfully', {
      stats,
      recentEmployees: recentEmployees.slice(0, 5),
      pendingDocuments: pendingDocuments.slice(0, 5),
    });
  }),
  
  /**
   * Get admin dashboard
   */
  getAdminDashboard: asyncHandler(async (req, res) => {
    const stats = await analyticsService.getDashboardStats();
    const departmentAnalytics = await analyticsService.getDepartmentAnalytics();
    const ActivityLog = require('../models/ActivityLog');
    const recentActivity = await ActivityLog.getRecent(20);
    
    sendSuccess(res, 200, 'Dashboard data retrieved successfully', {
      stats,
      departmentAnalytics,
      recentActivity,
    });
  }),
};

module.exports = dashboardController;
