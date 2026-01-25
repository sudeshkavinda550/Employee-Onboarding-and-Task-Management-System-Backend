const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const analyticsController = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: asyncHandler(async (req, res) => {
    const stats = await analyticsService.getDashboardStats();
    sendSuccess(res, 200, 'Dashboard stats retrieved successfully', stats);
  }),
  
  /**
   * Get completion rates
   */
  getCompletionRates: asyncHandler(async (req, res) => {
    const period = req.query.period || 'month';
    const rates = await analyticsService.getCompletionRates(period);
    sendSuccess(res, 200, 'Completion rates retrieved successfully', rates);
  }),
  
  /**
   * Get department analytics
   */
  getDepartmentAnalytics: asyncHandler(async (req, res) => {
    const analytics = await analyticsService.getDepartmentAnalytics();
    sendSuccess(res, 200, 'Department analytics retrieved successfully', analytics);
  }),
  
  /**
   * Get time to completion metrics
   */
  getTimeToCompletion: asyncHandler(async (req, res) => {
    const metrics = await analyticsService.getTimeToCompletion();
    sendSuccess(res, 200, 'Time to completion metrics retrieved successfully', metrics);
  }),
  
  /**
   * Get task completion times
   */
  getTaskCompletionTimes: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Task completion times retrieved successfully', {});
  }),
  
  /**
   * Get employee progress trend
   */
  getEmployeeProgressTrend: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Employee progress trend retrieved successfully', {});
  }),
  
  /**
   * Get overdue tasks analytics
   */
  getOverdueTasksAnalytics: asyncHandler(async (req, res) => {
    const EmployeeTask = require('../models/EmployeeTask');
    const overdueTasks = await EmployeeTask.getOverdueTasks();
    
    sendSuccess(res, 200, 'Overdue tasks analytics retrieved successfully', {
      total: overdueTasks.length,
      tasks: overdueTasks,
    });
  }),
  
  /**
   * Get document status analytics
   */
  getDocumentStatusAnalytics: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Document status analytics retrieved successfully', {});
  }),
  
  /**
   * Get onboarding timeline
   */
  getOnboardingTimeline: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Onboarding timeline retrieved successfully', {});
  }),
  
  /**
   * Export analytics
   */
  exportAnalytics: asyncHandler(async (req, res) => {
    const format = req.query.format || 'json';
    
    // TODO: Implement analytics export
    sendSuccess(res, 200, 'Analytics exported successfully', {
      format,
      message: 'Export functionality not yet implemented',
    });
  }),
};

module.exports = analyticsController;