const { query } = require('../config/database');
const { hashPassword } = require('../utils/hashPassword');

const User = {
  /**
   * Create a new user
   */
  create: async (userData) => {
    const {
      name,
      email,
      password,
      role = 'employee',
      employee_id,
      phone,
      date_of_birth,
      address,
      department_id,
      position,
      start_date,
      manager_id,
    } = userData;
    
    const hashedPassword = await hashPassword(password);
    
    const result = await query(
      `INSERT INTO users (
        name, email, password, role, employee_id, phone, date_of_birth,
        address, department_id, position, start_date, manager_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, email, role, employee_id, created_at`,
      [name, email, hashedPassword, role, employee_id, phone, date_of_birth,
       address, department_id, position, start_date, manager_id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find user by email
   */
  findByEmail: async (email) => {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },
  
  /**
   * Find user by ID
   */
  findById: async (id) => {
    const result = await query(
      `SELECT u.*, d.name as department_name, 
              m.name as manager_name, m.email as manager_email
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0];
  },
  
  /**
   * Find all users with filters
   */
  findAll: async (filters = {}) => {
    let queryText = `
      SELECT u.*, d.name as department_name,
             COUNT(et.id) FILTER (WHERE et.status = 'completed') as completed_tasks,
             COUNT(et.id) as total_tasks
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN employee_tasks et ON u.id = et.employee_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.role) {
      queryText += ` AND u.role = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }
    
    if (filters.department_id) {
      queryText += ` AND u.department_id = $${paramCount}`;
      params.push(filters.department_id);
      paramCount++;
    }
    
    if (filters.onboarding_status) {
      queryText += ` AND u.onboarding_status = $${paramCount}`;
      params.push(filters.onboarding_status);
      paramCount++;
    }
    
    if (filters.search) {
      queryText += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }
    
    queryText += ' GROUP BY u.id, d.name ORDER BY u.created_at DESC';
    
    const result = await query(queryText, params);
    return result.rows;
  },
  
  /**
   * Update user
   */
  update: async (id, userData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(userData).forEach(key => {
      if (userData[key] !== undefined && key !== 'id' && key !== 'password') {
        fields.push(`${key} = $${paramCount}`);
        values.push(userData[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const result = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, name, email, role, employee_id, updated_at`,
      values
    );
    
    return result.rows[0];
  },
  
  /**
   * Update password
   */
  updatePassword: async (id, newPassword) => {
    const hashedPassword = await hashPassword(newPassword);
    
    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );
  },
  
  /**
   * Delete user
   */
  delete: async (id) => {
    await query('DELETE FROM users WHERE id = $1', [id]);
  },
  
  /**
   * Update onboarding status
   */
  updateOnboardingStatus: async (id, status) => {
    const result = await query(
      `UPDATE users SET onboarding_status = $1, 
       onboarding_completed_date = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, onboarding_status, onboarding_completed_date`,
      [status, id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Get user progress
   */
  getProgress: async (id) => {
    const result = await query(
      `SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_tasks,
        ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as percentage
      FROM employee_tasks
      WHERE employee_id = $1`,
      [id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Set reset password token
   */
  setResetToken: async (email, token, expires) => {
    await query(
      `UPDATE users SET reset_password_token = $1, reset_password_expires = $2
       WHERE email = $3`,
      [token, expires, email]
    );
  },
  
  /**
   * Find by reset token
   */
  findByResetToken: async (token) => {
    const result = await query(
      `SELECT * FROM users 
       WHERE reset_password_token = $1 AND reset_password_expires > NOW()`,
      [token]
    );
    return result.rows[0];
  },
  
  /**
   * Clear reset token
   */
  clearResetToken: async (id) => {
    await query(
      `UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL
       WHERE id = $1`,
      [id]
    );
  },
};

module.exports = User;