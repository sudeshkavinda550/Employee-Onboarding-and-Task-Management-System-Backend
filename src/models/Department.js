const { query } = require('../config/database');

const Department = {
  /**
   * Create department
   */
  create: async (departmentData) => {
    const { name, description, manager_id } = departmentData;
    
    const result = await query(
      `INSERT INTO departments (name, description, manager_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, manager_id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find all departments
   */
  findAll: async () => {
    const result = await query(
      `SELECT d.*, u.name as manager_name, u.email as manager_email,
              COUNT(DISTINCT e.id) as employee_count
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       LEFT JOIN users e ON d.id = e.department_id
       GROUP BY d.id, u.name, u.email
       ORDER BY d.name`
    );
    
    return result.rows;
  },
  
  /**
   * Find department by ID
   */
  findById: async (id) => {
    const result = await query(
      `SELECT d.*, u.name as manager_name, u.email as manager_email
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       WHERE d.id = $1`,
      [id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Update department
   */
  update: async (id, departmentData) => {
    const { name, description, manager_id } = departmentData;
    
    const result = await query(
      `UPDATE departments
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           manager_id = COALESCE($3, manager_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, manager_id, id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Delete department
   */
  delete: async (id) => {
    await query('DELETE FROM departments WHERE id = $1', [id]);
  },
  
  /**
   * Get department statistics
   */
  getStats: async (id) => {
    const result = await query(
      `SELECT 
        COUNT(DISTINCT u.id) as total_employees,
        COUNT(DISTINCT u.id) FILTER (WHERE u.onboarding_status = 'completed') as onboarded_employees,
        COUNT(DISTINCT t.id) as total_templates,
        ROUND(AVG(et.completion_percentage), 2) as avg_completion_rate
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      LEFT JOIN templates t ON d.id = t.department_id
      LEFT JOIN (
        SELECT employee_id,
               COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100 as completion_percentage
        FROM employee_tasks
        GROUP BY employee_id
      ) et ON u.id = et.employee_id
      WHERE d.id = $1
      GROUP BY d.id`,
      [id]
    );
    
    return result.rows[0];
  },
};

module.exports = Department;