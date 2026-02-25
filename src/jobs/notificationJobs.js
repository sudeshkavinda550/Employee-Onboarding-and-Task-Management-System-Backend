const notificationHelpers = require('../utils/notificationHelpers');
const notificationService = require('../services/notificationService');
const pool = require('../config/database');

const notificationJobs = {
  // Run daily at 9 AM
  async sendOverdueReminders() {
    console.log('Running overdue reminders job...');
    
    const overdueTasksResult = await pool.query(`
      SELECT 
        et.id,
        et.employee_id,
        t.title,
        et.due_date,
        u.name as employee_name
      FROM employee_tasks et
      JOIN tasks t ON et.task_id = t.id
      JOIN users u ON et.employee_id = u.id
      WHERE et.status = 'overdue'
        AND et.due_date < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE user_id = et.employee_id 
            AND type = 'task_reminder'
            AND created_at > NOW() - INTERVAL '1 day'
        )
    `);

    for (const task of overdueTasksResult.rows) {
      try {
        await notificationService.sendTaskOverdueNotification(
          task.employee_id,
          task.title
        );
      } catch (err) {
        console.error('Error sending overdue notification:', err);
      }
    }

    console.log(`Sent ${overdueTasksResult.rows.length} overdue reminders`);
  },

  // Run every Monday at 8 AM
  async sendWeeklyDigests() {
    console.log('Running weekly digest job...');
    
    const usersResult = await pool.query(`
      SELECT id, role FROM users WHERE is_active = true
    `);

    for (const user of usersResult.rows) {
      try {
        let stats = {};
        
        if (user.role === 'employee') {
          const employeeStats = await pool.query(`
            SELECT 
              COUNT(CASE WHEN status = 'completed' AND completed_date > NOW() - INTERVAL '7 days' THEN 1 END) as completed_tasks,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
              (SELECT COUNT(*) FROM documents WHERE employee_id = $1 AND uploaded_date > NOW() - INTERVAL '7 days') as documents_uploaded
            FROM employee_tasks
            WHERE employee_id = $1
          `, [user.id]);
          
          stats = {
            ...employeeStats.rows[0],
            role: 'employee'
          };
        }
        
        await notificationService.sendWeeklyDigestNotification(user.id, stats);
      } catch (err) {
        console.error('Error sending weekly digest:', err);
      }
    }

    console.log(`Sent ${usersResult.rows.length} weekly digests`);
  },

  // Run daily at 10 AM
  async checkOverdueOnboardings() {
    try {
      await notificationHelpers.checkAndNotifyOverdueOnboardings();
    } catch (err) {
      console.error('Error checking overdue onboardings:', err);
    }
  },

  // Run daily at 11 AM
  async checkPendingDocuments() {
    try {
      await notificationHelpers.checkAndNotifyPendingDocuments();
    } catch (err) {
      console.error('Error checking pending documents:', err);
    }
  },
};

module.exports = notificationJobs;