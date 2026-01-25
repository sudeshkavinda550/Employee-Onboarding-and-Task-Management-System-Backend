const Task = require('../models/Task');
const EmployeeTask = require('../models/EmployeeTask');
const notificationService = require('./notificationService');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const taskService = {
  /**
   * Assign template to employee
   */
  assignTemplateToEmployee: async (employeeId, templateId, assignedBy) => {
    try {
      // Assign tasks from template
      const assignedTasks = await EmployeeTask.assignFromTemplate(employeeId, templateId);
      
      // Send notifications for each task
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
};

module.exports = taskService;