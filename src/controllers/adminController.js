const { query, pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const adminController = {
  getStats: async (req, res) => {
    try {
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'employee') as total_employees,
          (SELECT COUNT(*) FROM users WHERE role = 'hr') as hr_managers,
          (SELECT COUNT(*) FROM users WHERE role = 'employee' AND onboarding_status = 'in_progress') as active_onboardings,
          (SELECT COUNT(*) FROM employee_tasks WHERE status = 'overdue') as overdue_tasks,
          (SELECT COUNT(*) FROM users WHERE role = 'employee' AND onboarding_status = 'completed') as completed_onboardings,
          (SELECT COUNT(*) FROM templates) as total_templates,
          100 as system_health
      `;

      const avgQuery = `
        SELECT COALESCE(
          AVG(EXTRACT(DAY FROM (onboarding_completed_date::timestamp - start_date::timestamp))), 0
        ) as avg_days
        FROM users 
        WHERE role = 'employee' 
          AND onboarding_status = 'completed'
          AND onboarding_completed_date IS NOT NULL
          AND start_date IS NOT NULL
      `;

      const [statsResult, avgResult] = await Promise.all([
        pool.query(statsQuery),
        pool.query(avgQuery)
      ]);

      const row = statsResult.rows[0];

      const stats = {
        totalUsers: parseInt(row.total_employees || 0) + parseInt(row.hr_managers || 0),
        activeEmployees: parseInt(row.total_employees || 0),
        totalTemplates: parseInt(row.total_templates || 0),
        systemHealth: 100,
        hrManagers: parseInt(row.hr_managers || 0),
        completedOnboardings: parseInt(row.completed_onboardings || 0),
        activeOnboardings: parseInt(row.active_onboardings || 0),
        overdueTasks: parseInt(row.overdue_tasks || 0),
        avgCompletionDays: Math.round(parseFloat(avgResult.rows[0]?.avg_days) || 0)
      };

      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  },

  getDeptStats: async (req, res) => {
    try {
      const query = `
        SELECT 
          d.name as department,
          COUNT(u.id) as total_employees,
          COUNT(CASE WHEN u.onboarding_status = 'completed' THEN 1 END) as completed,
          ROUND(
            (COUNT(CASE WHEN u.onboarding_status = 'completed' THEN 1 END)::numeric / 
            NULLIF(COUNT(u.id), 0) * 100), 0
          ) as completion_rate
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id AND u.role = 'employee'
        GROUP BY d.id, d.name
        HAVING COUNT(u.id) > 0
        ORDER BY d.name
      `;

      const result = await pool.query(query);

      const stats = result.rows.map(row => ({
        department: row.department,
        totalEmployees: parseInt(row.total_employees),
        completionRate: parseInt(row.completion_rate) || 0
      }));

      res.json(stats);
    } catch (error) {
      console.error('Get dept stats error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch department statistics' });
    }
  },

  getRecentActivity: async (req, res) => {
    try {
      const query = `
        SELECT 
          al.id,
          al.action,
          al.details,
          al.created_at,
          u.name as actor_name,
          u.role as actor_role,
          CASE 
            WHEN al.created_at > NOW() - INTERVAL '1 minute' THEN 'Just now'
            WHEN al.created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM NOW() - al.created_at)::text || 'm ago'
            WHEN al.created_at > NOW() - INTERVAL '1 day' THEN EXTRACT(HOUR FROM NOW() - al.created_at)::text || 'h ago'
            ELSE EXTRACT(DAY FROM NOW() - al.created_at)::text || 'd ago'
          END as time_ago
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
      `;

      const result = await pool.query(query);

      const activities = result.rows.map(row => ({
        action: row.action,
        detail: row.details?.message || JSON.stringify(row.details),
        actorName: row.actor_name || 'System',
        actorRole: row.actor_role || 'system',
        timeAgo: row.time_ago
      }));

      res.json(activities);
    } catch (error) {
      console.error('Get recent activity error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch recent activity' });
    }
  },

  getSystemHealth: async (req, res) => {
    try {
      const activeSessionsQuery = `
        SELECT COUNT(DISTINCT user_id) as count
        FROM activity_logs
        WHERE created_at > NOW() - INTERVAL '30 minutes'
      `;

      const result = await pool.query(activeSessionsQuery);

      const health = {
        apiStatus: 'Operational',
        storageUsed: '24.6 GB / 100 GB',
        emailService: 'Active',
        lastBackup: '2h ago',
        uptime: '99.98%',
        activeSessions: parseInt(result.rows[0].count) || 0
      };

      res.json(health);
    } catch (error) {
      console.error('Get system health error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch system health' });
    }
  },

  getHRAccounts: async (req, res) => {
    try {
      const query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.department_id,
          u.is_active as status,
          u.created_at,
          u.updated_at,
          d.name as department,
          (SELECT COUNT(*) FROM users WHERE manager_id = u.id) as employee_count,
          (SELECT MAX(created_at) FROM activity_logs WHERE user_id = u.id) as last_login
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = 'hr'
        ORDER BY u.created_at DESC
      `;

      const result = await pool.query(query);

      const accounts = result.rows.map(row => ({
        _id: row.id,
        id: row.id,
        name: row.name,
        email: row.email,
        department: row.department,
        departmentId: row.department_id,
        status: row.status ? 'active' : 'suspended',
        employeeCount: parseInt(row.employee_count),
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json(accounts);
    } catch (error) {
      console.error('Get HR accounts error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch HR accounts' });
    }
  },

  createHRAccount: async (req, res) => {
    const client = await pool.connect();
    try {
      const { name, email, password, department } = req.body;

      if (!name || !email || !password || !department) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      await client.query('BEGIN');

      const checkQuery = 'SELECT id FROM users WHERE email = $1';
      const checkResult = await client.query(checkQuery, [email]);

      if (checkResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Email already exists' });
      }

      const deptQuery = 'SELECT id FROM departments WHERE name = $1';
      const deptResult = await client.query(deptQuery, [department]);

      if (deptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Department not found' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery = `
        INSERT INTO users (name, email, password, role, department_id, is_active, email_verified, start_date)
        VALUES ($1, $2, $3, 'hr', $4, true, true, CURRENT_DATE)
        RETURNING id, name, email, department_id, is_active, created_at
      `;

      const result = await client.query(insertQuery, [name, email, hashedPassword, deptResult.rows[0].id]);

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'create_hr_account', 'user', $2, $3)
      `;
      await client.query(logQuery, [
        req.user.id,
        result.rows[0].id,
        JSON.stringify({ name, email, department })
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        _id: result.rows[0].id,
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        department,
        departmentId: result.rows[0].department_id,
        status: result.rows[0].is_active ? 'active' : 'suspended',
        createdAt: result.rows[0].created_at
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create HR account error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to create HR account' });
    } finally {
      client.release();
    }
  },

  updateHRStatus: async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { action } = req.body;

      const newStatus = action === 'suspend' ? false : true;

      await client.query('BEGIN');

      const updateQuery = `
        UPDATE users 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND role = 'hr'
        RETURNING id, name, email, is_active
      `;

      const result = await client.query(updateQuery, [newStatus, id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'HR account not found' });
      }

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'user', $3, $4)
      `;
      await client.query(logQuery, [
        req.user.id,
        action === 'suspend' ? 'suspend_hr_account' : 'restore_hr_account',
        id,
        JSON.stringify({ name: result.rows[0].name })
      ]);

      await client.query('COMMIT');

      res.json({
        _id: result.rows[0].id,
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        status: result.rows[0].is_active ? 'active' : 'suspended'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update HR status error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to update HR status' });
    } finally {
      client.release();
    }
  },

  deleteHRAccount: async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      const checkQuery = 'SELECT name FROM users WHERE id = $1 AND role = $2';
      const checkResult = await client.query(checkQuery, [id, 'hr']);

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'HR account not found' });
      }

      const deleteQuery = 'DELETE FROM users WHERE id = $1 AND role = $2';
      await client.query(deleteQuery, [id, 'hr']);

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'delete_hr_account', 'user', $2, $3)
      `;
      await client.query(logQuery, [
        req.user.id,
        id,
        JSON.stringify({ name: checkResult.rows[0].name })
      ]);

      await client.query('COMMIT');

      res.json({ message: 'HR account deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete HR account error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to delete HR account' });
    } finally {
      client.release();
    }
  },

  getAllEmployees: async (req, res) => {
    try {
      const query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.position,
          u.department_id,
          u.onboarding_status,
          u.start_date,
          u.onboarding_completed_date as completed_date,
          d.name as department,
          hr.name as hr_name,
          t.name as template_name,
          COALESCE(task_stats.total_tasks, 0) as total_tasks,
          COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
          CASE 
            WHEN COALESCE(task_stats.total_tasks, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(task_stats.completed_tasks, 0)::numeric / task_stats.total_tasks * 100), 0)
          END as progress
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN users hr ON u.manager_id = hr.id
        LEFT JOIN templates t ON d.id = t.department_id
        LEFT JOIN LATERAL (
          SELECT 
            COUNT(*) as total_tasks,
            COUNT(CASE WHEN et.status = 'completed' THEN 1 END) as completed_tasks
          FROM employee_tasks et
          WHERE et.employee_id = u.id
        ) task_stats ON true
        WHERE u.role = 'employee'
        ORDER BY u.created_at DESC
      `;

      const result = await pool.query(query);

      const employees = result.rows.map(row => ({
        _id: row.id,
        id: row.id,
        name: row.name,
        email: row.email,
        position: row.position,
        department: row.department,
        departmentId: row.department_id,
        hrName: row.hr_name,
        templateName: row.template_name,
        onboardingStatus: row.onboarding_status,
        startDate: row.start_date,
        completedDate: row.completed_date,
        totalTasks: parseInt(row.total_tasks),
        completedTasks: parseInt(row.completed_tasks),
        progress: parseInt(row.progress)
      }));

      res.json(employees);
    } catch (error) {
      console.error('Get all employees error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  },

  getAllTemplates: async (req, res) => {
    try {
      const query = `
        SELECT 
          t.id,
          t.name,
          t.description,
          t.created_at,
          u.name as created_by_name,
          (SELECT COUNT(*) FROM tasks WHERE template_id = t.id) as task_count,
          (SELECT COUNT(*) FROM users WHERE department_id = t.department_id AND role = 'employee') as usage_count,
          (
            SELECT AVG(EXTRACT(DAY FROM (onboarding_completed_date::timestamp - start_date::timestamp)))
            FROM users 
            WHERE department_id = t.department_id 
              AND onboarding_status = 'completed'
              AND onboarding_completed_date IS NOT NULL
              AND start_date IS NOT NULL
          ) as avg_completion_days
        FROM templates t
        LEFT JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
      `;

      const result = await pool.query(query);

      const templateIds = result.rows.map(t => t.id);

      let tasksResult = { rows: [] };
      if (templateIds.length > 0) {
        const tasksQuery = `
          SELECT 
            id,
            template_id,
            title,
            description,
            task_type,
            order_index
          FROM tasks
          WHERE template_id = ANY($1::uuid[])
          ORDER BY template_id, order_index
        `;
        tasksResult = await pool.query(tasksQuery, [templateIds]);
      }

      const tasksByTemplate = {};
      tasksResult.rows.forEach(task => {
        if (!tasksByTemplate[task.template_id]) {
          tasksByTemplate[task.template_id] = [];
        }
        tasksByTemplate[task.template_id].push({
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.task_type
        });
      });

      const templates = result.rows.map(row => ({
        _id: row.id,
        id: row.id,
        name: row.name,
        description: row.description,
        createdByName: row.created_by_name,
        createdAt: row.created_at,
        tasks: tasksByTemplate[row.id] || [],
        usageCount: parseInt(row.usage_count) || 0,
        avgCompletionDays: row.avg_completion_days ? Math.round(row.avg_completion_days) : null
      }));

      res.json(templates);
    } catch (error) {
      console.error('Get all templates error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  },

  getAllDocuments: async (req, res) => {
    try {
      const query = `
        SELECT 
          d.id,
          d.filename,
          d.original_filename,
          d.file_type,
          d.file_size,
          d.status,
          d.uploaded_date,
          u.name as employee_name,
          u.department_id,
          dept.name as department,
          t.title as task_title
        FROM documents d
        LEFT JOIN users u ON d.employee_id = u.id
        LEFT JOIN departments dept ON u.department_id = dept.id
        LEFT JOIN tasks t ON d.task_id = t.id
        ORDER BY d.uploaded_date DESC
      `;

      const result = await pool.query(query);

      const documents = result.rows.map(row => ({
        _id: row.id,
        id: row.id,
        filename: row.filename || row.original_filename,
        originalFilename: row.original_filename,
        fileType: row.file_type,
        fileSize: row.file_size,
        status: row.status,
        uploadedAt: row.uploaded_date,
        employeeName: row.employee_name,
        department: row.department,
        taskTitle: row.task_title
      }));

      res.json(documents);
    } catch (error) {
      console.error('Get all documents error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  },

  getAuditLog: async (req, res) => {
    try {
      const { page = 1, limit = 15, role, action, search, dateFrom, dateTo } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      if (role && role !== 'all') {
        whereConditions.push(`u.role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }

      if (action && action !== 'all') {
        whereConditions.push(`al.action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(
          u.name ILIKE $${paramIndex} OR 
          al.action ILIKE $${paramIndex} OR 
          al.details::text ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (dateFrom) {
        whereConditions.push(`al.created_at >= $${paramIndex}`);
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereConditions.push(`al.created_at <= $${paramIndex}::date + interval '1 day'`);
        params.push(dateTo);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const countQuery = `
        SELECT COUNT(*) as total
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
      `;

      const dataQuery = `
        SELECT 
          al.id,
          al.action,
          al.details,
          al.created_at,
          u.name as actor_name,
          u.role as actor_role
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, params.slice(0, -2)),
        pool.query(dataQuery, params)
      ]);

      const logs = dataResult.rows.map(row => ({
        _id: row.id,
        id: row.id,
        action: row.action,
        detail: row.details?.message || JSON.stringify(row.details),
        actorName: row.actor_name || 'System',
        actorRole: row.actor_role || 'system',
        role: row.actor_role || 'system',
        createdAt: row.created_at
      }));

      res.json({
        logs,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      });
    } catch (error) {
      console.error('Get audit log error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch audit log' });
    }
  },

  exportAuditLog: async (req, res) => {
    try {
      const query = `
        SELECT 
          al.id,
          al.action,
          al.details,
          al.created_at,
          u.name as actor_name,
          u.role as actor_role
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 5000
      `;

      const result = await pool.query(query);

      const csvRows = ['ID,Role,Actor,Action,Detail,Date,Time'];

      result.rows.forEach(row => {
        const detail = row.details?.message || JSON.stringify(row.details) || '';
        const date = new Date(row.created_at);
        csvRows.push([
          row.id,
          (row.actor_role || 'system').toUpperCase(),
          `"${row.actor_name || 'System'}"`,
          row.action,
          `"${detail.replace(/"/g, '""')}"`,
          date.toLocaleDateString(),
          date.toLocaleTimeString()
        ].join(','));
      });

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
      res.send(csv);
    } catch (error) {
      console.error('Export audit log error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to export audit log' });
    }
  },

  getSettings: async (req, res) => {
    try {
      const settingsQuery = `
        SELECT key, value, category
        FROM system_settings
        ORDER BY category, key
      `;

      const result = await pool.query(settingsQuery);

      const settings = {
        company: {},
        defaults: {},
        toggles: {},
        integrations: {}
      };

      result.rows.forEach(row => {
        if (row.category in settings) {
          settings[row.category][row.key] = row.value;
        }
      });

      if (Object.keys(settings.company).length === 0) {
        settings.company = { companyName: '', industry: '', headquarters: '', timezone: 'UTC', companySize: '11–50' };
      }
      if (Object.keys(settings.defaults).length === 0) {
        settings.defaults = { onboardingDays: 10, gracePeriod: 2, approvalTimeout: 3, maxFileSizeMB: 25 };
      }
      if (Object.keys(settings.toggles).length === 0) {
        settings.toggles = {
          sendReminders: true, overdueAlerts: true, completionCongrats: true,
          autoCredentials: true, inactivityReminder: false, weeklyDigest: true,
          require2FA: false, sessionTimeout: true, logDocumentAccess: true
        };
      }
      if (Object.keys(settings.integrations).length === 0) {
        settings.integrations = { sendgrid: false, slack: false, s3: false, googleSSO: false };
      }

      res.json(settings);
    } catch (error) {
      if (error.code === '42P01') {
        return res.json({
          company: { companyName: '', industry: '', headquarters: '', timezone: 'UTC', companySize: '11–50' },
          defaults: { onboardingDays: 10, gracePeriod: 2, approvalTimeout: 3, maxFileSizeMB: 25 },
          toggles: {
            sendReminders: true, overdueAlerts: true, completionCongrats: true,
            autoCredentials: true, inactivityReminder: false, weeklyDigest: true,
            require2FA: false, sessionTimeout: true, logDocumentAccess: true
          },
          integrations: { sendgrid: false, slack: false, s3: false, googleSSO: false }
        });
      }
      console.error('Get settings error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  },

  saveSettings: async (req, res) => {
    const client = await pool.connect();
    try {
      const { company, defaults, toggles } = req.body;

      await client.query('BEGIN');

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS system_settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          key VARCHAR(100) NOT NULL,
          value JSONB NOT NULL,
          category VARCHAR(50) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category, key)
        )
      `;
      await client.query(createTableQuery);

      const upsertQuery = `
        INSERT INTO system_settings (key, value, category)
        VALUES ($1, $2, $3)
        ON CONFLICT (category, key) 
        DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `;

      const updates = [];

      if (company) {
        Object.entries(company).forEach(([key, value]) => {
          updates.push(client.query(upsertQuery, [key, JSON.stringify(value), 'company']));
        });
      }
      if (defaults) {
        Object.entries(defaults).forEach(([key, value]) => {
          updates.push(client.query(upsertQuery, [key, JSON.stringify(value), 'defaults']));
        });
      }
      if (toggles) {
        Object.entries(toggles).forEach(([key, value]) => {
          updates.push(client.query(upsertQuery, [key, JSON.stringify(value), 'toggles']));
        });
      }

      await Promise.all(updates);

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES ($1, 'update_settings', 'system', $2)
      `;
      await client.query(logQuery, [req.user.id, JSON.stringify({ company, defaults, toggles })]);

      await client.query('COMMIT');

      res.json({ company, defaults, toggles, integrations: {} });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Save settings error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to save settings' });
    } finally {
      client.release();
    }
  },

  dangerResetTemplates: async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM employee_tasks');
      await client.query('DELETE FROM tasks');
      await client.query('DELETE FROM templates');

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES ($1, 'danger_reset_templates', 'system', $2)
      `;
      await client.query(logQuery, [req.user.id, JSON.stringify({ action: 'All templates deleted' })]);

      await client.query('COMMIT');

      res.json({ message: 'All templates deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Reset templates error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to reset templates' });
    } finally {
      client.release();
    }
  },

  dangerPurgeInactive: async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const deleteQuery = `
        DELETE FROM users
        WHERE role != 'admin'
          AND id NOT IN (
            SELECT DISTINCT user_id
            FROM activity_logs
            WHERE created_at > NOW() - INTERVAL '90 days'
          )
        RETURNING id
      `;

      const result = await client.query(deleteQuery);

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES ($1, 'danger_purge_inactive', 'system', $2)
      `;
      await client.query(logQuery, [req.user.id, JSON.stringify({ deletedCount: result.rows.length })]);

      await client.query('COMMIT');

      res.json({ message: `Deleted ${result.rows.length} inactive accounts` });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Purge inactive error:', error.message, '| Code:', error.code);
      res.status(500).json({ message: 'Failed to purge inactive accounts' });
    } finally {
      client.release();
    }
  }
};

module.exports = adminController;