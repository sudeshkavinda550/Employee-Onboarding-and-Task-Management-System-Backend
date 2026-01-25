const { query } = require('../config/database');

const EmployeeTask = {
  /**
   * Assign tasks to employee from template
   */
  assignFromTemplate: async (employee_id, template_id) => {
    // Get template tasks
    const tasksResult = await query(
      'SELECT * FROM tasks WHERE template_id = $1 ORDER BY order_index',
      [template_id]
    );
    
    // Get template estimated days
    const templateResult = await query(
      'SELECT estimated_completion_days FROM templates WHERE id = $1',
      [template_id]
    );
    
    const estimatedDays = templateResult.rows[0]?.estimated_completion_days || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + estimatedDays);
    
    // Assign each task to employee
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
    const result = await query(
      `SELECT et.*, t.title, t.description, t.task_type, t.is_required
       FROM employee_tasks et
       JOIN tasks t ON et.task_id = t.id
       WHERE et.id = $1`,
      [id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Update task status
   */
  updateStatus: async (id, status, notes = null) => {
    const completedDate = status === 'completed' ? new Date() : null;
    
    const result = await query(
      `UPDATE employee_tasks
       SET status = $1, 
           completed_date = $2,
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, completedDate, notes, id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Mark task as read
   */
  markAsRead: async (id) => {
    const result = await query(
      `UPDATE employee_tasks
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    return result.rows[0];
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
};

module.exports = EmployeeTask;