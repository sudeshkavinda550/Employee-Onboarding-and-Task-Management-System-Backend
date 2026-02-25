const Task = require('../models/Task');
const EmployeeTask = require('../models/EmployeeTask');
const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const notificationHelpers = require('../utils/notificationHelpers');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const pool = require('../config/database');

const taskController = {
  getMyTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),
  
  getTaskById: asyncHandler(async (req, res) => {
    const task = await EmployeeTask.findById(req.params.id);
    if (!task) {
      return sendError(res, 404, 'Task not found');
    }
    
    if (task.employee_id !== req.user.id && req.user.role === 'employee') {
      return sendError(res, 403, 'Access denied');
    }
    
    sendSuccess(res, 200, 'Task retrieved successfully', task);
  }),
  
  updateTaskStatus: asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    
    const task = await EmployeeTask.findById(req.params.id);
    if (!task) {
      return sendError(res, 404, 'Task not found');
    }
    
    if (task.employee_id !== req.user.id && req.user.role === 'employee') {
      return sendError(res, 403, 'Access denied');
    }
    
    const updatedTask = await EmployeeTask.updateStatus(req.params.id, status, notes);

    if (status === 'completed') {
      try {
        const employeeResult = await pool.query(
          'SELECT name FROM users WHERE id = $1',
          [req.user.id]
        );
        const taskResult = await pool.query(
          'SELECT t.title FROM tasks t JOIN employee_tasks et ON t.id = et.task_id WHERE et.id = $1',
          [req.params.id]
        );
        
        await notificationHelpers.notifyTaskCompleted(
          req.user.id,
          employeeResult.rows[0]?.name || 'Employee',
          taskResult.rows[0]?.title || 'Task'
        );

        const progressResult = await pool.query(
          `SELECT 
            COUNT(*) as total_tasks,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
          FROM employee_tasks
          WHERE employee_id = $1`,
          [req.user.id]
        );

        const totalTasks = parseInt(progressResult.rows[0].total_tasks);
        const completedTasks = parseInt(progressResult.rows[0].completed_tasks);
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        if (progressPercent >= 50 && progressPercent < 55) {
          await notificationService.sendHalfwayMilestoneNotification(
            req.user.id,
            completedTasks,
            totalTasks
          );
        }

        if (progressPercent === 100) {
          const employeeData = await pool.query(
            'SELECT name, start_date, manager_id FROM users WHERE id = $1',
            [req.user.id]
          );
          
          const completionDays = employeeData.rows[0].start_date 
            ? Math.floor((new Date() - new Date(employeeData.rows[0].start_date)) / (1000 * 60 * 60 * 24))
            : 0;
          
          const adminIds = await notificationHelpers.getAllAdminIds();
          
          await notificationHelpers.notifyOnboardingCompleted(
            req.user.id,
            employeeData.rows[0].manager_id,
            adminIds,
            employeeData.rows[0].name,
            completionDays
          );

          await pool.query(
            `UPDATE users 
            SET onboarding_status = 'completed', 
                onboarding_completed_date = CURRENT_DATE 
            WHERE id = $1`,
            [req.user.id]
          );
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }

    if (status === 'in_progress') {
      try {
        await pool.query(
          `UPDATE users 
          SET onboarding_status = 'in_progress' 
          WHERE id = $1 AND onboarding_status = 'not_started'`,
          [req.user.id]
        );
      } catch (err) {
        console.error('Status update error:', err);
      }
    }
    
    sendSuccess(res, 200, 'Task status updated successfully', updatedTask);
  }),
  
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
    
    await EmployeeTask.updateStatus(req.params.id, 'completed');

    try {
      const employeeResult = await pool.query(
        'SELECT name FROM users WHERE id = $1',
        [req.user.id]
      );
      
      await notificationHelpers.notifyDocumentUploaded(
        req.user.id,
        employeeResult.rows[0]?.name || 'Employee',
        req.file.originalname
      );
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }
    
    sendSuccess(res, 201, 'Document uploaded successfully', document);
  }),
  
  getTaskProgress: asyncHandler(async (req, res) => {
    const progress = await EmployeeTask.getProgress(req.user.id);
    sendSuccess(res, 200, 'Progress retrieved successfully', progress);
  }),
  
  markTaskAsRead: asyncHandler(async (req, res) => {
    const task = await EmployeeTask.markAsRead(req.params.id);
    sendSuccess(res, 200, 'Task marked as read', task);
  }),
  
  getOverdueTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.getOverdueTasks(req.user.id);
    sendSuccess(res, 200, 'Overdue tasks retrieved successfully', tasks);
  }),
  
  getTaskStats: asyncHandler(async (req, res) => {
    const employeeId = req.user.id;
    const progress = await EmployeeTask.getProgress(employeeId);
    
    sendSuccess(res, 200, 'Task statistics retrieved successfully', {
      total: progress.total || 0,
      completed: progress.completed || 0,
      inProgress: progress.in_progress || 0,
      pending: progress.pending || 0,
      overdue: progress.overdue || 0,
      percentage: progress.percentage || 0
    });
  }),
  
  getTaskSummary: asyncHandler(async (req, res) => {
    const employeeId = req.user.id;
    const tasks = await EmployeeTask.findByEmployeeId(employeeId);
    
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      taskType: task.task_type,
      estimatedTime: task.estimated_time || 30,
      dueDate: task.due_date,
      assignedDate: task.assigned_date,
      completedDate: task.completed_date,
      resourceUrl: task.resource_url,
      templateName: task.template_name,
      isRequired: task.is_required !== false,
      order: task.order_index || 0,
      notes: task.notes,
      priority: task.priority || 'medium',
      isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
    }));
    
    sendSuccess(res, 200, 'Task summary retrieved successfully', formattedTasks);
  }),
  
  getTodayTasks: asyncHandler(async (req, res) => {
    const employeeId = req.user.id;
    const tasks = await EmployeeTask.getTodayTasks(employeeId);
    
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      taskType: task.task_type,
      dueDate: task.due_date,
      isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
    }));
    
    sendSuccess(res, 200, "Today's tasks retrieved successfully", formattedTasks);
  }),
  
  bulkUpdateTaskStatus: asyncHandler(async (req, res) => {
    const { updates } = req.body;
    const employeeId = req.user.id;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return sendError(res, 400, 'No updates provided');
    }
    
    const updatedTasks = [];
    
    for (const update of updates) {
      const { taskId, status, notes } = update;
      
      const task = await EmployeeTask.findById(taskId);
      if (!task || task.employee_id !== employeeId) {
        return sendError(res, 403, `Access denied for task ${taskId}`);
      }
      
      const updatedTask = await EmployeeTask.updateStatus(taskId, status, notes);
      updatedTasks.push(updatedTask);
    }
    
    const progress = await EmployeeTask.getProgress(employeeId);
    
    sendSuccess(res, 200, 'Tasks updated successfully', {
      updatedTasks,
      progress: {
        total: progress.total || 0,
        completed: progress.completed || 0,
        percentage: progress.percentage || 0
      }
    });
  }),
  
  getTaskAnalytics: asyncHandler(async (req, res) => {
    const employeeId = req.user.id;
    const progress = await EmployeeTask.getProgress(employeeId);
    const detailedStats = await EmployeeTask.getDetailedStatistics(employeeId);
    
    sendSuccess(res, 200, 'Analytics retrieved successfully', {
      overview: {
        total: progress.total || 0,
        completed: progress.completed || 0,
        inProgress: progress.in_progress || 0,
        pending: progress.pending || 0,
        overdue: progress.overdue || 0,
        percentage: progress.percentage || 0
      },
      detailed: detailedStats || {}
    });
  }),
  
  getFilteredTasks: asyncHandler(async (req, res) => {
    const employeeId = req.user.id;
    const filters = {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      dueDate: req.query.dueDate,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };
    
    const result = await EmployeeTask.getTasksWithFilters(employeeId, filters);
    sendSuccess(res, 200, 'Filtered tasks retrieved successfully', result);
  }),
  
  getAllTasks: asyncHandler(async (req, res) => {
    const filters = {
      employee_id: req.query.employee_id,
      status: req.query.status,
    };
    
    sendSuccess(res, 200, 'Tasks retrieved successfully', []);
  }),
  
  getEmployeeTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.findByEmployeeId(req.params.employeeId);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),
  
  assignTask: asyncHandler(async (req, res) => {
    sendSuccess(res, 201, 'Task assigned successfully');
  }),
  
  updateTask: asyncHandler(async (req, res) => {
    const task = await Task.update(req.params.id, req.body);
    sendSuccess(res, 200, 'Task updated successfully', task);
  }),
  
  deleteTask: asyncHandler(async (req, res) => {
    await Task.delete(req.params.id);
    sendSuccess(res, 200, 'Task deleted successfully');
  })
};

module.exports = taskController;