const { query } = require('../config/database');

const EmployeeTask = {
  /**
   * Assign template to employee (creates employee_tasks for all template tasks)
   */
  assignToEmployee: async (employee_id, template_id, assigned_by_id) => {
    const tasksResult = await query(
      'SELECT * FROM tasks WHERE template_id = $1 ORDER BY order_index',
      [template_id]
    );
    
    if (tasksResult.rows.length === 0) {
      throw new Error('Template has no tasks');
    }
    
    const templateResult = await query(
      'SELECT estimated_completion_days FROM templates WHERE id = $1',
      [template_id]
    );
    
    const estimatedDays = templateResult.rows[0]?.estimated_completion_days || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + estimatedDays);
    
    const createdTasks = [];
    
    for (const task of tasksResult.rows) {
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_tasks' AND column_name = 'assigned_by'
      `);
      
      let queryText, params;
      
      if (columnCheck.rows.length > 0 && assigned_by_id) {
        queryText = `
          INSERT INTO employee_tasks 
          (employee_id, task_id, status, assigned_date, due_date, assigned_by)
          VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP, $3, $4)
          ON CONFLICT (employee_id, task_id) DO NOTHING
          RETURNING *
        `;
        params = [employee_id, task.id, dueDate, assigned_by_id];
      } else {
        queryText = `
          INSERT INTO employee_tasks 
          (employee_id, task_id, status, assigned_date, due_date)
          VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP, $3)
          ON CONFLICT (employee_id, task_id) DO NOTHING
          RETURNING *
        `;
        params = [employee_id, task.id, dueDate];
      }
      
      const result = await query(queryText, params);
      
      if (result.rows[0]) {
        createdTasks.push(result.rows[0]);
      }
    }
    
    await query(
      `UPDATE users 
       SET onboarding_status = 'in_progress',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND onboarding_status = 'not_started'`,
      [employee_id]
    );
    
    return createdTasks;
  },

  /**
   * Assign tasks to employee from template 
   */
  assignFromTemplate: async (employee_id, template_id) => {
    const tasksResult = await query(
      'SELECT * FROM tasks WHERE template_id = $1 ORDER BY order_index',
      [template_id]
    );
    
    const templateResult = await query(
      'SELECT estimated_completion_days FROM templates WHERE id = $1',
      [template_id]
    );
    
    const estimatedDays = templateResult.rows[0]?.estimated_completion_days || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + estimatedDays);
    
    const promises = tasksResult.rows.map(task => {
      return query(
        `INSERT INTO employee_tasks (employee_id, task_id, status, due_date)
         VALUES ($1, $2, 'pending', $3)
         ON CONFLICT (employee_id, task_id) DO NOTHING
         RETURNING *`,
        [employee_id, task.id, dueDate]
      );
    });
    
    const results = await Promise.all(promises);
    return results.map(r => r.rows[0]).filter(Boolean);
  },
  
  /**
   * Get employee tasks
   */
  findByEmployeeId: async (employee_id) => {
    const result = await query(
      `SELECT et.*, t.title, t.description, t.task_type, t.is_required, t.estimated_time,
              t.resource_url, tm.name as template_name
       FROM employee_tasks et
       JOIN tasks t ON et.task_id = t.id
       JOIN templates tm ON t.template_id = tm.id
       WHERE et.employee_id = $1
       ORDER BY t.order_index ASC`,
      [employee_id]
    );
    
    return result.rows;
  },
  
  /**
   * Find employee task by ID
   */
  findById: async (id) => {
    try {
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_tasks' AND column_name = 'assigned_by'
      `);
      
      let queryText;
      
      if (columnCheck.rows.length > 0) {
        queryText = `
          SELECT et.*, t.title, t.description, t.task_type, t.is_required, t.estimated_time,
                t.resource_url, tm.name as template_name, u.name as assigned_by_name
          FROM employee_tasks et
          JOIN tasks t ON et.task_id = t.id
          JOIN templates tm ON t.template_id = tm.id
          LEFT JOIN users u ON et.assigned_by = u.id
          WHERE et.id = $1
        `;
      } else {
        queryText = `
          SELECT et.*, t.title, t.description, t.task_type, t.is_required, t.estimated_time,
                t.resource_url, tm.name as template_name
          FROM employee_tasks et
          JOIN tasks t ON et.task_id = t.id
          JOIN templates tm ON t.template_id = tm.id
          WHERE et.id = $1
        `;
      }
      
      const result = await query(queryText, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in findById:', error);
      return null;
    }
  },
  
  /**
   * Update task status
   */
  updateStatus: async (id, status, notes = null) => {
    const completedDate = status === 'completed' ? new Date() : null;
    const startedDate = status === 'in_progress' ? new Date() : null;
    
    const result = await query(
      `UPDATE employee_tasks
       SET status = $1, 
           completed_date = COALESCE($2, completed_date),
           started_date = COALESCE($3, started_date),
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, completedDate, startedDate, notes, id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Mark task as read
   */
  markAsRead: async (id) => {
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employee_tasks' AND column_name = 'is_read'
    `);
    
    if (columnCheck.rows.length > 0) {
      const result = await query(
        `UPDATE employee_tasks
         SET is_read = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    } else {
      const result = await query(
        `SELECT * FROM employee_tasks WHERE id = $1`,
        [id]
      );
      return result.rows[0];
    }
  },
  
  /**
   * Get employee progress
   */
  getProgress: async (employee_id) => {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
        ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as percentage
      FROM employee_tasks
      WHERE employee_id = $1`,
      [employee_id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Get overdue tasks
   */
  getOverdueTasks: async (employee_id = null) => {
    let queryText = `
      SELECT et.*, t.title, t.description, u.name as employee_name, u.email as employee_email
      FROM employee_tasks et
      JOIN tasks t ON et.task_id = t.id
      JOIN users u ON et.employee_id = u.id
      WHERE et.status != 'completed' AND et.due_date < NOW()
    `;
    
    const params = [];
    
    if (employee_id) {
      queryText += ' AND et.employee_id = $1';
      params.push(employee_id);
    }
    
    queryText += ' ORDER BY et.due_date ASC';
    
    const result = await query(queryText, params);
    return result.rows;
  },
  
  /**
   * Update overdue statuses
   */
  updateOverdueStatuses: async () => {
    await query(
      `UPDATE employee_tasks
       SET status = 'overdue'
       WHERE status IN ('pending', 'in_progress') AND due_date < NOW()`
    );
  },

  /**
   * Get all employees with their onboarding progress
   */
  getAllEmployeesProgress: async () => {
    const result = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.employee_id,
        u.position,
        u.start_date,
        u.onboarding_status,
        d.name as department_name,
        COUNT(et.id) as total_tasks,
        COUNT(CASE WHEN et.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN et.status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN et.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        ROUND(
          (COUNT(CASE WHEN et.status = 'completed' THEN 1 END)::numeric / 
           NULLIF(COUNT(et.id), 0)::numeric) * 100, 
          2
        ) as progress_percentage
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN employee_tasks et ON u.id = et.employee_id
       WHERE u.role = 'employee'
       GROUP BY u.id, d.name
       ORDER BY u.start_date DESC`
    );
    
    return result.rows;
  },
  
  /**
   * Get detailed task statistics 
   */
  getDetailedStatistics: async (employee_id) => {
    try {
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_tasks' AND column_name = 'started_date'
      `);
      
      let avgCompletionTimeQuery = 'NULL as avg_completion_time';
      if (columnCheck.rows.length > 0) {
        avgCompletionTimeQuery = `
          AVG(
            CASE WHEN et.status = 'completed' 
            THEN EXTRACT(EPOCH FROM (et.completed_date - et.started_date)) / 60 
            ELSE NULL 
            END
          ) as avg_completion_time
        `;
      }
      
      const result = await query(
        `WITH task_stats AS (
          SELECT 
            et.status,
            COUNT(*) as count,
            SUM(t.estimated_time) as total_estimated_time,
            ${avgCompletionTimeQuery}
          FROM employee_tasks et
          JOIN tasks t ON et.task_id = t.id
          WHERE et.employee_id = $1
          GROUP BY et.status
        ),
        category_stats AS (
          SELECT 
            t.task_type as category,
            COUNT(*) as total,
            COUNT(CASE WHEN et.status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN et.status = 'in_progress' THEN 1 END) as in_progress,
            COUNT(CASE WHEN et.status = 'pending' THEN 1 END) as pending
          FROM employee_tasks et
          JOIN tasks t ON et.task_id = t.id
          WHERE et.employee_id = $1
          GROUP BY t.task_type
          ORDER BY total DESC
        ),
        daily_completion AS (
          SELECT 
            DATE(et.completed_date) as completion_date,
            COUNT(*) as tasks_completed
          FROM employee_tasks et
          WHERE et.employee_id = $1 
            AND et.status = 'completed'
            AND et.completed_date >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY DATE(et.completed_date)
          ORDER BY completion_date
        )
        SELECT 
          COALESCE((SELECT json_agg(task_stats) FROM task_stats), '[]'::json) as status_distribution,
          COALESCE((SELECT json_agg(category_stats) FROM category_stats), '[]'::json) as category_breakdown,
          COALESCE((SELECT json_agg(daily_completion) FROM daily_completion), '[]'::json) as recent_completions`,
        [employee_id]
      );
      
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error in getDetailedStatistics:', error);
      return {};
    }
  },
  
  /**
   * Get tasks with filters 
   */
  getTasksWithFilters: async (employee_id, filters = {}) => {
    const {
      status,
      category,
      priority,
      dueDate,
      search,
      page = 1,
      limit = 20
    } = filters;
    
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employee_tasks' AND column_name = 'assigned_by'
    `);
    
    let assignedByJoin = '';
    let assignedBySelect = '';
    
    if (columnCheck.rows.length > 0) {
      assignedByJoin = 'LEFT JOIN users u ON et.assigned_by = u.id';
      assignedBySelect = ', u.name as assigned_by_name';
    }
    
    let queryText = `
      SELECT 
        et.*,
        t.title,
        t.description,
        t.task_type,
        t.estimated_time,
        t.resource_url,
        t.order_index,
        tm.name as template_name
        ${assignedBySelect}
      FROM employee_tasks et
      JOIN tasks t ON et.task_id = t.id
      JOIN templates tm ON t.template_id = tm.id
      ${assignedByJoin}
      WHERE et.employee_id = $1
    `;
    
    const params = [employee_id];
    let paramCount = 2;
    
    if (status && status !== 'all') {
      if (status === 'overdue') {
        queryText += ` AND et.due_date < NOW() AND et.status != 'completed'`;
      } else {
        queryText += ` AND et.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
    }
    
    if (category) {
      queryText += ` AND t.task_type = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (priority) {
      queryText += ` AND et.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }
    
    if (search) {
      queryText += ` AND (
        t.title ILIKE $${paramCount} OR 
        t.description ILIKE $${paramCount} OR
        tm.name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    if (dueDate) {
      queryText += ` AND DATE(et.due_date) = $${paramCount}`;
      params.push(dueDate);
      paramCount++;
    }
    
    const countQuery = queryText.replace('SELECT et.*, t.title', 'SELECT COUNT(*) as total_count');
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0]?.total_count) || 0;
    
    const offset = (page - 1) * limit;
    queryText += `
      ORDER BY 
        CASE 
          WHEN et.status = 'pending' THEN 1
          WHEN et.status = 'in_progress' THEN 2
          WHEN et.status = 'completed' THEN 3
          ELSE 4
        END,
        t.order_index ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    
    params.push(limit, offset);
    
    const tasksResult = await query(queryText, params);
    
    return {
      tasks: tasksResult.rows.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        taskType: task.task_type,
        estimatedTime: task.estimated_time,
        resourceUrl: task.resource_url,
        templateName: task.template_name,
        assignedByName: task.assigned_by_name || null,
        dueDate: task.due_date,
        completedDate: task.completed_date,
        assignedDate: task.assigned_date,
        notes: task.notes,
        priority: task.priority || 'medium',
        isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  },
  
  /**
   * Get today's tasks 
   */
  getTodayTasks: async (employee_id) => {
    const result = await query(
      `SELECT et.*, t.title, t.description, t.task_type
      FROM employee_tasks et
      JOIN tasks t ON et.task_id = t.id
      WHERE et.employee_id = $1 
        AND et.status != 'completed'
        AND (
          DATE(et.due_date) = CURRENT_DATE
          OR et.status = 'in_progress'
          OR (DATE(et.assigned_date) = CURRENT_DATE AND et.status = 'pending')
        )
      ORDER BY 
        CASE WHEN et.status = 'in_progress' THEN 1 ELSE 2 END,
        et.due_date ASC`,
      [employee_id]
    );
    
    return result.rows;
  },
  
  /**
   * Bulk update task statuses
   */
  bulkUpdateStatuses: async (employee_id, updates) => {
    const updatedTasks = [];
    
    for (const update of updates) {
      const { taskId, status, notes } = update;
      
      const taskCheck = await query(
        'SELECT id FROM employee_tasks WHERE id = $1 AND employee_id = $2',
        [taskId, employee_id]
      );
      
      if (taskCheck.rows.length === 0) {
        throw new Error(`Task ${taskId} not found or access denied`);
      }
      
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_tasks' AND column_name = 'started_date'
      `);
      
      let queryText;
      if (columnCheck.rows.length > 0) {
        queryText = `
          UPDATE employee_tasks
          SET status = $1, 
              notes = COALESCE($2, notes),
              completed_date = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_date END,
              started_date = CASE WHEN $1 = 'in_progress' AND started_date IS NULL THEN NOW() ELSE started_date END,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `;
      } else {
        queryText = `
          UPDATE employee_tasks
          SET status = $1, 
              notes = COALESCE($2, notes),
              completed_date = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_date END,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `;
      }
      
      const result = await query(queryText, [status, notes, taskId]);
      
      if (result.rows[0]) {
        updatedTasks.push(result.rows[0]);
      }
    }
    
    return updatedTasks;
  }
};

module.exports = EmployeeTask;