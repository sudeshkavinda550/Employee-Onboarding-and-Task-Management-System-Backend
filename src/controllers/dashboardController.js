const { query } = require('../config/database');
const User = require('../models/User');
const EmployeeTask = require('../models/EmployeeTask');
const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const dashboardController = {
  getEmployeeDashboard: asyncHandler(async (req, res) => {
    const employeeId = req.user.id;
    
    try {
      const progressResult = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COALESCE(
            ROUND(
              (COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / 
              NULLIF(COUNT(*)::numeric, 0)) * 100, 
              0
            ),
            0
          ) as percentage
         FROM employee_tasks
         WHERE employee_id = $1`,
        [employeeId]
      );
      
      const pendingTasksResult = await query(
        `SELECT 
          et.id,
          et.status,
          et.assigned_date,
          et.due_date,
          et.completed_date,
          t.title,
          t.description,
          t.priority,
          t.estimated_duration,
          d.name as department_name
         FROM employee_tasks et
         JOIN tasks t ON et.task_id = t.id
         LEFT JOIN departments d ON t.department_id = d.id
         WHERE et.employee_id = $1 
         AND et.status IN ('pending', 'in_progress')
         ORDER BY 
           CASE t.priority 
             WHEN 'high' THEN 1
             WHEN 'medium' THEN 2
             WHEN 'low' THEN 3
             ELSE 4
           END,
           et.due_date ASC NULLS LAST
         LIMIT 5`,
        [employeeId]
      );
      
      const recentDocsResult = await query(
        `SELECT 
          d.id,
          d.original_filename as filename,
          d.uploaded_date as "uploadedDate",
          d.status,
          d.file_size as "fileSize",
          d.file_type as "fileType",
          t.title as task_title
         FROM documents d
         LEFT JOIN employee_tasks et ON d.task_id = et.id
         LEFT JOIN tasks t ON et.task_id = t.id
         WHERE d.employee_id = $1
         ORDER BY d.uploaded_date DESC
         LIMIT 5`,
        [employeeId]
      );
      
      const overdueTasksResult = await query(
        `SELECT 
          et.id,
          et.due_date as "dueDate",
          t.title,
          t.priority
         FROM employee_tasks et
         JOIN tasks t ON et.task_id = t.id
         WHERE et.employee_id = $1 
         AND et.status != 'completed'
         AND et.due_date < CURRENT_DATE
         ORDER BY et.due_date ASC`,
        [employeeId]
      );
      
      const upcomingTasksResult = await query(
        `SELECT 
          et.id,
          et.due_date as "dueDate",
          t.title,
          t.priority
         FROM employee_tasks et
         JOIN tasks t ON et.task_id = t.id
         WHERE et.employee_id = $1 
         AND et.status != 'completed'
         AND et.due_date >= CURRENT_DATE
         AND et.due_date <= CURRENT_DATE + INTERVAL '7 days'
         ORDER BY et.due_date ASC
         LIMIT 5`,
        [employeeId]
      );
      
      const trendResult = await query(
        `SELECT 
          DATE(completed_date) as date,
          COUNT(*) as count
         FROM employee_tasks
         WHERE employee_id = $1
         AND status = 'completed'
         AND completed_date >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY DATE(completed_date)
         ORDER BY date ASC`,
        [employeeId]
      );
      
      const progress = progressResult.rows[0];
      
      const dashboardData = {
        progress: {
          total: parseInt(progress.total) || 0,
          completed: parseInt(progress.completed) || 0,
          pending: parseInt(progress.pending) || 0,
          in_progress: parseInt(progress.in_progress) || 0,
          percentage: parseInt(progress.percentage) || 0
        },
        pendingTasks: pendingTasksResult.rows,
        recentDocuments: recentDocsResult.rows,
        overdueTasks: overdueTasksResult.rows,
        upcomingTasks: upcomingTasksResult.rows,
        completionTrend: trendResult.rows
      };
      
      sendSuccess(res, 200, 'Dashboard data retrieved successfully', dashboardData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }),
  
  getTaskStatistics: asyncHandler(async (req, res) => {
    const employeeId = req.user.id;
    
    const statsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_date >= CURRENT_DATE - INTERVAL '7 days') as completed_this_week,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue_count,
        AVG(
          CASE 
            WHEN status = 'completed' AND completed_date IS NOT NULL AND assigned_date IS NOT NULL
            THEN EXTRACT(EPOCH FROM (completed_date - assigned_date))/86400
          END
        ) as avg_completion_days
       FROM employee_tasks
       WHERE employee_id = $1`,
      [employeeId]
    );
    
    sendSuccess(res, 200, 'Task statistics retrieved successfully', statsResult.rows[0]);
  }),
  
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