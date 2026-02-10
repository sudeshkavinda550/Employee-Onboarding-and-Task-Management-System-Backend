const Task = require('../models/Task');
const EmployeeTask = require('../models/EmployeeTask');
const notificationService = require('./notificationService');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const { query } = require('../config/database');

const taskService = {
  /**
   * Assign template to employee
   */
  assignTemplateToEmployee: async (employeeId, templateId, assignedBy) => {
    try {
      const assignedTasks = await EmployeeTask.assignFromTemplate(employeeId, templateId);
      
      for (const task of assignedTasks) {
        const taskDetails = await Task.findById(task.task_id);
        await notificationService.sendTaskAssignedNotification(employeeId, taskDetails.title);
      }
      
      return assignedTasks;
    } catch (error) {
      logger.error('Assign template error:', error);
      throw error;
    }
  },
  
  /**
   * Update task status and notify
   */
  updateTaskStatus: async (taskId, status, userId) => {
    try {
      const updatedTask = await EmployeeTask.updateStatus(taskId, status);
      
      if (status === 'completed') {
        await notificationService.create(
          userId,
          'Task Completed',
          'Great job! You completed a task.',
          'task_completed',
          '/employee/tasks'
        );
      }
      
      return updatedTask;
    } catch (error) {
      logger.error('Update task status error:', error);
      throw error;
    }
  },
  
  /**
   * Send reminders for overdue tasks
   */
  sendOverdueReminders: async () => {
    try {
      const overdueTasks = await EmployeeTask.getOverdueTasks();
      
      for (const task of overdueTasks) {
        await notificationService.sendTaskReminderNotification(
          task.employee_id,
          task.title
        );
        
        await emailService.sendTaskReminderEmail(
          task.employee_email,
          task.employee_name,
          task.title,
          task.due_date
        );
      }
      
      logger.info(`Sent reminders for ${overdueTasks.length} overdue tasks`);
    } catch (error) {
      logger.error('Send overdue reminders error:', error);
      throw error;
    }
  },
  
  /**
   * Get comprehensive task data for dashboard
   */
  getDashboardData: async (employeeId) => {
    try {
      const [progress, tasks, todayTasks] = await Promise.all([
        EmployeeTask.getProgress(employeeId),
        EmployeeTask.findByEmployeeId(employeeId),
        EmployeeTask.getTodayTasks(employeeId)
      ]);
      
      const totalEstimatedTime = tasks.reduce((sum, task) => 
        sum + (task.estimated_time || 0), 0
      );
      
      const completedTime = tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, task) => sum + (task.estimated_time || 0), 0);
      
      const pendingTime = tasks
        .filter(t => t.status === 'pending')
        .reduce((sum, task) => sum + (task.estimated_time || 0), 0);
      
      return {
        stats: {
          total: progress.total || 0,
          completed: progress.completed || 0,
          pending: progress.pending || 0,
          inProgress: progress.in_progress || 0,
          overdue: progress.overdue || 0,
          percentage: progress.percentage || 0,
          totalEstimatedTime,
          completedTime,
          pendingTime,
          completionRate: progress.total > 0 ? (progress.completed / progress.total) * 100 : 0
        },
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          taskType: task.task_type,
          estimatedTime: task.estimated_time,
          dueDate: task.due_date,
          assignedDate: task.assigned_date,
          completedDate: task.completed_date,
          resourceUrl: task.resource_url,
          templateName: task.template_name,
          isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
        })),
        todayTasks: todayTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          isOverdue: task.due_date && new Date(task.due_date) < new Date()
        })),
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Get dashboard data error:', error);
      throw error;
    }
  },
  
  /**
   * Process bulk status updates 
   */
  processBulkUpdates: async (employeeId, updates) => {
    try {
      const results = [];
      
      for (const update of updates) {
        const { taskId, status, notes } = update;
        
        const task = await EmployeeTask.findById(taskId);
        if (!task || task.employee_id !== employeeId) {
          throw new Error(`Task ${taskId} not found or access denied`);
        }
        
        const updatedTask = await EmployeeTask.updateStatus(taskId, status, notes);
        results.push(updatedTask);
        
        if (status === 'completed') {
          await notificationService.create(
            employeeId,
            'Task Completed',
            `You completed task: ${task.title}`,
            'task_completed',
            '/employee/dashboard'
          );
        }
      }
      
      const progress = await EmployeeTask.getProgress(employeeId);
      
      return {
        updatedTasks: results,
        progress
      };
    } catch (error) {
      logger.error('Bulk update error:', error);
      throw error;
    }
  },
  
  /**
   * Get task completion trends
   */
  getCompletionTrends: async (employeeId, days = 7) => {
    try {
      const result = await query(
        `SELECT 
          DATE(completed_date) as date,
          COUNT(*) as completed_tasks,
          SUM(estimated_time) as total_time_spent
        FROM employee_tasks et
        JOIN tasks t ON et.task_id = t.id
        WHERE et.employee_id = $1 
          AND et.status = 'completed'
          AND et.completed_date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(completed_date)
        ORDER BY date DESC`,
        [employeeId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Get completion trends error:', error);
      throw error;
    }
  },
  
  /**
   * Update overdue task statuses
   */
  updateOverdueTasks: async () => {
    try {
      await EmployeeTask.updateOverdueStatuses();
      logger.info('Overdue task statuses updated');
    } catch (error) {
      logger.error('Update overdue tasks error:', error);
      throw error;
    }
  }
};

module.exports = taskService;