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
   * Get HR dashboard with analytics
   */
  getHRDashboard: asyncHandler(async (req, res) => {
    const stats = await analyticsService.getDashboardStats();
    
    const recentEmployees = await User.findAll({ 
      role: 'employee',
      limit: 5,
      orderBy: 'createdAt',
      order: 'DESC'
    });
    
    const employeesWithProgress = await Promise.all(
      recentEmployees.map(async (employee) => {
        const tasks = await EmployeeTask.findByEmployeeId(employee.id);
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const progressPercentage = tasks.length > 0 
          ? Math.round((completedTasks / tasks.length) * 100) 
          : 0;
        
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          onboardingStatus: employee.onboardingStatus,
          progressPercentage,
          startDate: employee.startDate,
          completedAt: employee.completedAt,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt
        };
      })
    );
    
    sendSuccess(res, 200, 'HR Dashboard data retrieved successfully', {
      stats,
      recentEmployees: employeesWithProgress,
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
    
    sendSuccess(res, 200, 'Admin Dashboard data retrieved successfully', {
      stats,
      departmentAnalytics,
      recentActivity,
    });
  }),
};

module.exports = dashboardController;