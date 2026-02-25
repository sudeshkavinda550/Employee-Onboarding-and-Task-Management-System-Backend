const pool = require('../config/database');
const notificationService = require('../services/notificationService');

const notificationHelpers = {
  async getAllAdminIds() {
    const result = await pool.query(
      'SELECT id FROM users WHERE role = $1 AND is_active = true',
      ['admin']
    );
    return result.rows.map(r => r.id);
  },

  async getAllHRIds() {
    const result = await pool.query(
      'SELECT id FROM users WHERE role = $1 AND is_active = true',
      ['hr']
    );
    return result.rows.map(r => r.id);
  },

  async getHRByDepartment(departmentId) {
    const result = await pool.query(
      'SELECT id FROM users WHERE role = $1 AND department_id = $2 AND is_active = true',
      ['hr', departmentId]
    );
    return result.rows.map(r => r.id);
  },

  async getEmployeeManager(employeeId) {
    const result = await pool.query(
      'SELECT manager_id FROM users WHERE id = $1',
      [employeeId]
    );
    return result.rows[0]?.manager_id;
  },

  async notifyHRAccountCreated(hrName, department, performedBy) {
    const adminIds = await notificationHelpers.getAllAdminIds();
    if (adminIds.length > 0) {
      await notificationService.sendHRAccountCreatedNotification(
        adminIds,
        hrName,
        department
      );
    }
  },

  async notifyHRAccountSuspended(hrName) {
    const adminIds = await notificationHelpers.getAllAdminIds();
    if (adminIds.length > 0) {
      await notificationService.sendHRAccountSuspendedNotification(
        adminIds,
        hrName
      );
    }
  },

  async notifyHRAccountDeleted(hrName) {
    const adminIds = await notificationHelpers.getAllAdminIds();
    if (adminIds.length > 0) {
      await notificationService.sendHRAccountDeletedNotification(
        adminIds,
        hrName
      );
    }
  },

  async notifyDangerAction(performedBy, action, details) {
    const adminIds = await notificationHelpers.getAllAdminIds();
    if (adminIds.length > 0) {
      await notificationService.sendDangerActionNotification(
        adminIds,
        performedBy,
        action,
        details
      );
    }
  },

  async notifySettingsChanged(changedBy, settingType) {
    const adminIds = await notificationHelpers.getAllAdminIds();
    if (adminIds.length > 0) {
      await notificationService.sendSettingsChangedNotification(
        adminIds,
        changedBy,
        settingType
      );
    }
  },

  async notifyTemplateCreated(hrName, templateName, taskCount) {
    const adminIds = await notificationHelpers.getAllAdminIds();
    if (adminIds.length > 0) {
      await notificationService.sendTemplateCreatedNotification(
        adminIds,
        hrName,
        templateName,
        taskCount
      );
    }
  },

  async notifyDocumentUploaded(employeeId, employeeName, documentName) {
    const managerId = await notificationHelpers.getEmployeeManager(employeeId);
    if (managerId) {
      await notificationService.sendDocumentUploadedNotification(
        managerId,
        employeeName,
        documentName
      );
    }
  },

  async notifyTaskCompleted(employeeId, employeeName, taskTitle) {
    const managerId = await notificationHelpers.getEmployeeManager(employeeId);
    if (managerId) {
      await notificationService.sendTaskCompletedNotification(
        managerId,
        employeeName,
        taskTitle
      );
    }
  },

  async notifyNewEmployee(hrId, employeeName, department, startDate) {
    await notificationService.sendNewEmployeeNotification(
      hrId,
      employeeName,
      department,
      startDate
    );
  },

  async notifyOnboardingCompleted(employeeId, hrId, adminIds, employeeName, completionDays) {
    await notificationService.sendOnboardingCompletedNotification(
      employeeId,
      completionDays
    );

    if (hrId) {
      await notificationService.create(
        hrId,
        'Employee Onboarding Complete',
        `${employeeName} has completed onboarding in ${completionDays} days`,
        'task_completed',
        '/hr/employees'
      );
    }

    if (adminIds && adminIds.length > 0) {
      await notificationService.createBulk(
        adminIds,
        'Onboarding Milestone',
        `${employeeName} completed onboarding in ${completionDays} days`,
        'system',
        '/admin/employees'
      );
    }
  },

  async checkAndNotifyOverdueOnboardings() {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.manager_id,
        COUNT(et.id) as overdue_count
      FROM users u
      LEFT JOIN employee_tasks et ON u.id = et.employee_id
      WHERE u.role = 'employee'
        AND u.onboarding_status = 'in_progress'
        AND et.status = 'overdue'
      GROUP BY u.id, u.name, u.manager_id
      HAVING COUNT(et.id) > 0
    `);

    const adminIds = await notificationHelpers.getAllAdminIds();
    
    for (const row of result.rows) {
      if (row.manager_id) {
        await notificationService.create(
          row.manager_id,
          'Overdue Tasks Alert',
          `${row.name} has ${row.overdue_count} overdue onboarding task(s)`,
          'system',
          '/hr/employees'
        );
      }
    }

    const totalOverdue = result.rows.length;
    if (totalOverdue > 0 && adminIds.length > 0) {
      await notificationService.sendBulkOnboardingOverdueNotification(
        adminIds,
        totalOverdue
      );
    }
  },

  async checkAndNotifyPendingDocuments() {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE status = 'pending'
    `);

    const pendingCount = parseInt(result.rows[0].count);
    
    if (pendingCount > 10) {
      const adminIds = await notificationHelpers.getAllAdminIds();
      if (adminIds.length > 0) {
        await notificationService.sendBulkDocumentPendingNotification(
          adminIds,
          pendingCount
        );
      }
    }
  },
};

module.exports = notificationHelpers;