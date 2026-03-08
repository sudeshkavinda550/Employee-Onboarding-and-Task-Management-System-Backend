const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const emailService = require('../config/email');

const adminController = {
 getStats: async (req, res) => {
  try {
    const analyticsService = require('../services/analyticsService');
    const stats = await analyticsService.getDashboardStats();

    res.json({
      totalUsers:            (stats.totalEmployees || 0),
      activeEmployees:       stats.totalEmployees       || 0,
      totalTemplates:        stats.totalTemplates       || 0,
      systemHealth:          100,
      hrManagers:            stats.hrManagers           || 0,
      completedOnboardings:  stats.onboardingCompleted  || 0,
      activeOnboardings:     stats.onboardingInProgress || 0,
      overdueTasks:          stats.overdueTasks         || 0,
      averageCompletionDays: stats.averageCompletionDays|| 0,
      completionRate:        stats.completionRate       || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},
  getDeptStats: async (req, res) => {
    try {
      const query = `
        SELECT 
          d.name as department,
          COUNT(u.id) as total_employees,
          COUNT(CASE WHEN u.onboarding_status = 'completed' THEN 1 END) as completed,
          COALESCE(ROUND(
            (COUNT(CASE WHEN u.onboarding_status = 'completed' THEN 1 END)::numeric / 
            NULLIF(COUNT(u.id), 0) * 100), 0
          ), 0) as completion_rate
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id AND u.role = 'employee'
        GROUP BY d.id, d.name
        HAVING COUNT(u.id) > 0
        ORDER BY d.name
      `;

      const result = await pool.query(query);
      
      const stats = result.rows.map(row => ({
        department: row.department,
        totalEmployees: parseInt(row.total_employees || 0),
        completionRate: parseInt(row.completion_rate || 0)
      }));

      res.json(stats);
    } catch (error) {
      console.error('Get dept stats error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch department statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
            WHEN al.created_at > NOW() - INTERVAL '1 hour' THEN 
              FLOOR(EXTRACT(EPOCH FROM (NOW() - al.created_at)) / 60)::text || 'm ago'
            WHEN al.created_at > NOW() - INTERVAL '1 day' THEN 
              FLOOR(EXTRACT(EPOCH FROM (NOW() - al.created_at)) / 3600)::text || 'h ago'
            ELSE 
              FLOOR(EXTRACT(EPOCH FROM (NOW() - al.created_at)) / 86400)::text || 'd ago'
          END as time_ago
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
      `;

      const result = await pool.query(query);
      
      const activities = result.rows.map(row => {
        let detailText = 'No details';
        
        if (row.details) {
          try {
            let parsed = row.details;
            if (typeof row.details === 'string') {
              parsed = JSON.parse(row.details);
            }
            
            if (parsed.name && parsed.email) {
              detailText = `Created account for ${parsed.name} (${parsed.email})`;
            } else if (parsed.name) {
              detailText = `Account: ${parsed.name}`;
            } else if (parsed.message) {
              detailText = parsed.message;
            } else {
              const entries = Object.entries(parsed)
                .filter(([k, v]) => v && k !== 'password')
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
              detailText = entries || 'Action performed';
            }
          } catch (e) {
            detailText = typeof row.details === 'string' ? row.details : 'Action performed';
          }
        }

        return {
          id: row.id,
          action: row.action,
          detail: detailText,
          actorName: row.actor_name || 'System',
          actorRole: row.actor_role || 'system',
          timeAgo: row.time_ago
        };
      });

      res.json(activities);
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch recent activity',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
        activeSessions: parseInt(result.rows[0]?.count || 0)
      };

      res.json(health);
    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch system health',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getHRAccounts: async (req, res) => {
    try {
      const query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.employee_id,
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
        employeeId: row.employee_id,
        department: row.department,
        departmentId: row.department_id,
        status: row.status ? 'active' : 'suspended',
        employeeCount: parseInt(row.employee_count || 0),
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json(accounts);
    } catch (error) {
      console.error('Get HR accounts error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch HR accounts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  createHRAccount: async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    await pool.query('BEGIN');

    const checkQuery = 'SELECT id FROM users WHERE email = $1';
    const checkResult = await pool.query(checkQuery, [email]);
    
    if (checkResult.rows.length > 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Email already exists' });
    }

    const deptQuery = 'SELECT id FROM departments WHERE name = $1';
    const deptResult = await pool.query(deptQuery, [department]);
    
    if (deptResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Department not found' });
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const employee_id = `HR${year}${month}${random}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO users (name, email, password, employee_id, role, department_id, is_active, email_verified, start_date)
      VALUES ($1, $2, $3, $4, 'hr', $5, true, true, CURRENT_DATE)
      RETURNING id, name, email, employee_id, department_id, is_active, created_at
    `;

    const result = await pool.query(insertQuery, [name, email, hashedPassword, employee_id, deptResult.rows[0].id]);

    const logQuery = `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'create_hr_account', 'user', $2, $3)
    `;
    await pool.query(logQuery, [
      req.user.id,
      result.rows[0].id,
      JSON.stringify({ name, email, employee_id, department })
    ]);

    await pool.query('COMMIT');

    try {
      await emailService.sendHRAccountCredentialsEmail({
        name,
        email,
        employeeId: employee_id,
        password,
        department
      });
      console.log(`HR credentials email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('Failed to send HR credentials email:', emailError.message);
    }

    res.status(201).json({
      _id: result.rows[0].id,
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      employeeId: result.rows[0].employee_id,
      department,
      departmentId: result.rows[0].department_id,
      status: result.rows[0].is_active ? 'active' : 'suspended',
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Create HR account error:', error);
    res.status(500).json({ 
      message: 'Failed to create HR account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},
  updateHRStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;

      const newStatus = action === 'suspend' ? false : true;

      await pool.query('BEGIN');

      const updateQuery = `
        UPDATE users 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND role = 'hr'
        RETURNING id, name, email, is_active
      `;

      const result = await pool.query(updateQuery, [newStatus, id]);

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ message: 'HR account not found' });
      }

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'user', $3, $4)
      `;
      await pool.query(logQuery, [
        req.user.id,
        action === 'suspend' ? 'suspend_hr_account' : 'restore_hr_account',
        id,
        JSON.stringify({ name: result.rows[0].name })
      ]);

      await pool.query('COMMIT');

      res.json({
        _id: result.rows[0].id,
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        status: result.rows[0].is_active ? 'active' : 'suspended'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Update HR status error:', error);
      res.status(500).json({ 
        message: 'Failed to update HR status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  deleteHRAccount: async (req, res) => {
    try {
      const { id } = req.params;

      await pool.query('BEGIN');

      const checkQuery = 'SELECT name FROM users WHERE id = $1 AND role = $2';
      const checkResult = await pool.query(checkQuery, [id, 'hr']);

      if (checkResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ message: 'HR account not found' });
      }

      const deleteQuery = 'DELETE FROM users WHERE id = $1 AND role = $2';
      await pool.query(deleteQuery, [id, 'hr']);

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'delete_hr_account', 'user', $2, $3)
      `;
      await pool.query(logQuery, [
        req.user.id,
        id,
        JSON.stringify({ name: checkResult.rows[0].name })
      ]);

      await pool.query('COMMIT');

      res.json({ message: 'HR account deleted successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Delete HR account error:', error);
      res.status(500).json({ 
        message: 'Failed to delete HR account',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
        totalTasks: parseInt(row.total_tasks || 0),
        completedTasks: parseInt(row.completed_tasks || 0),
        progress: parseInt(row.progress || 0)
      }));

      res.json(employees);
    } catch (error) {
      console.error('Get all employees error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch employees',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
            SELECT COALESCE(AVG(onboarding_completed_date - start_date), 0)
            FROM users 
            WHERE department_id = t.department_id 
              AND onboarding_status = 'completed'
              AND onboarding_completed_date IS NOT NULL
          ) as avg_completion_days
        FROM templates t
        LEFT JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
      `;

      const result = await pool.query(query);

      const tasksQuery = `
        SELECT 
          id,
          template_id,
          title,
          description,
          task_type as type,
          order_index
        FROM tasks
        WHERE template_id = ANY($1)
        ORDER BY template_id, order_index
      `;

      const templateIds = result.rows.map(t => t.id);
      const tasksResult = templateIds.length > 0 
        ? await pool.query(tasksQuery, [templateIds])
        : { rows: [] };

      const tasksByTemplate = {};
      tasksResult.rows.forEach(task => {
        if (!tasksByTemplate[task.template_id]) {
          tasksByTemplate[task.template_id] = [];
        }
        tasksByTemplate[task.template_id].push({
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type
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
        usageCount: parseInt(row.usage_count || 0),
        avgCompletionDays: row.avg_completion_days ? Math.round(parseFloat(row.avg_completion_days)) : null
      }));

      res.json(templates);
    } catch (error) {
      console.error('Get all templates error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch templates',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
      console.error('Get all documents error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch documents',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

      const logs = dataResult.rows.map(row => {
        let detailText = 'No details';
        if (row.details) {
          try {
            let parsed = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
            detailText = parsed.message || JSON.stringify(parsed);
          } catch (e) {
            detailText = typeof row.details === 'string' ? row.details : JSON.stringify(row.details);
          }
        }

        return {
          _id: row.id,
          id: row.id,
          action: row.action,
          detail: detailText,
          actorName: row.actor_name || 'System',
          actorRole: row.actor_role || 'system',
          role: row.actor_role || 'system',
          createdAt: row.created_at
        };
      });

      res.json({
        logs,
        total: parseInt(countResult.rows[0].total || 0),
        page: parseInt(page),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total || 0) / limit)
      });
    } catch (error) {
      console.error('Get audit log error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch audit log',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

      const csvRows = [
        'ID,Role,Actor,Action,Detail,Date,Time'
      ];

      result.rows.forEach(row => {
        let detail = 'No details';
        if (row.details) {
          try {
            let parsed = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
            detail = parsed.message || JSON.stringify(parsed);
          } catch (e) {
            detail = typeof row.details === 'string' ? row.details : '';
          }
        }
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
      console.error('Export audit log error:', error);
      res.status(500).json({ 
        message: 'Failed to export audit log',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getSettings: async (req, res) => {
    try {
      const settingsQuery = `
        SELECT 
          key,
          value,
          category
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
          try {
            settings[row.category][row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          } catch (e) {
            settings[row.category][row.key] = row.value;
          }
        }
      });

      if (Object.keys(settings.company).length === 0) {
        settings.company = {
          companyName: '',
          industry: '',
          headquarters: '',
          timezone: 'UTC',
          companySize: '11–50'
        };
      }

      if (Object.keys(settings.defaults).length === 0) {
        settings.defaults = {
          onboardingDays: 10,
          gracePeriod: 2,
          approvalTimeout: 3,
          maxFileSizeMB: 25
        };
      }

      if (Object.keys(settings.toggles).length === 0) {
        settings.toggles = {
          sendReminders: true,
          overdueAlerts: true,
          completionCongrats: true,
          autoCredentials: true,
          inactivityReminder: false,
          weeklyDigest: true,
          require2FA: false,
          sessionTimeout: true,
          logDocumentAccess: true
        };
      }

      if (Object.keys(settings.integrations).length === 0) {
        settings.integrations = {
          sendgrid: false,
          slack: false,
          s3: false,
          googleSSO: false
        };
      }

      res.json(settings);
    } catch (error) {
      if (error.code === '42P01') {
        const defaultSettings = {
          company: { companyName: '', industry: '', headquarters: '', timezone: 'UTC', companySize: '11–50' },
          defaults: { onboardingDays: 10, gracePeriod: 2, approvalTimeout: 3, maxFileSizeMB: 25 },
          toggles: {
            sendReminders: true, overdueAlerts: true, completionCongrats: true,
            autoCredentials: true, inactivityReminder: false, weeklyDigest: true,
            require2FA: false, sessionTimeout: true, logDocumentAccess: true
          },
          integrations: { sendgrid: false, slack: false, s3: false, googleSSO: false }
        };
        return res.json(defaultSettings);
      }
      console.error('Get settings error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch settings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  saveSettings: async (req, res) => {
    try {
      const { company, defaults, toggles } = req.body;

      await pool.query('BEGIN');

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
      await pool.query(createTableQuery);

      const upsertQuery = `
        INSERT INTO system_settings (key, value, category)
        VALUES ($1, $2, $3)
        ON CONFLICT (category, key) 
        DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `;

      const updates = [];
      
      if (company) {
        Object.entries(company).forEach(([key, value]) => {
          updates.push(pool.query(upsertQuery, [key, JSON.stringify(value), 'company']));
        });
      }

      if (defaults) {
        Object.entries(defaults).forEach(([key, value]) => {
          updates.push(pool.query(upsertQuery, [key, JSON.stringify(value), 'defaults']));
        });
      }

      if (toggles) {
        Object.entries(toggles).forEach(([key, value]) => {
          updates.push(pool.query(upsertQuery, [key, JSON.stringify(value), 'toggles']));
        });
      }

      await Promise.all(updates);

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES ($1, 'update_settings', 'system', $2)
      `;
      await pool.query(logQuery, [
        req.user.id,
        JSON.stringify({ company, defaults, toggles })
      ]);

      await pool.query('COMMIT');

      res.json({ company, defaults, toggles, integrations: {} });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Save settings error:', error);
      res.status(500).json({ 
        message: 'Failed to save settings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  dangerResetTemplates: async (req, res) => {
    try {
      await pool.query('BEGIN');

      await pool.query('DELETE FROM employee_tasks');
      await pool.query('DELETE FROM tasks');
      await pool.query('DELETE FROM templates');

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES ($1, 'danger_reset_templates', 'system', $2)
      `;
      await pool.query(logQuery, [
        req.user.id,
        JSON.stringify({ action: 'All templates deleted' })
      ]);

      await pool.query('COMMIT');

      res.json({ message: 'All templates deleted successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Reset templates error:', error);
      res.status(500).json({ 
        message: 'Failed to reset templates',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  dangerPurgeInactive: async (req, res) => {
    try {
      await pool.query('BEGIN');

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

      const result = await pool.query(deleteQuery);

      const logQuery = `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES ($1, 'danger_purge_inactive', 'system', $2)
      `;
      await pool.query(logQuery, [
        req.user.id,
        JSON.stringify({ deletedCount: result.rows.length })
      ]);

      await pool.query('COMMIT');

      res.json({ message: `Deleted ${result.rows.length} inactive accounts` });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Purge inactive error:', error);
      res.status(500).json({ 
        message: 'Failed to purge inactive accounts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = adminController;