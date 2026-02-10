const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hashPassword');

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
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    profile_picture
  } = userData;
  
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  
  if (existingUser.rows.length > 0) {
    const error = new Error('Email already exists');
    error.status = 400;
    throw error;
  }
  
  if (employee_id) {
    const existingEmployeeId = await query(
      'SELECT id FROM users WHERE employee_id = $1',
      [employee_id]
    );
    
    if (existingEmployeeId.rows.length > 0) {
      const error = new Error('Employee ID already exists');
      error.status = 400;
      throw error;
    }
  }
  
  const hashedPassword = await hashPassword(password);
  
  const result = await query(
    `INSERT INTO users (
      name, email, password, role, employee_id, phone, date_of_birth,
      address, department_id, position, start_date, manager_id,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      profile_picture
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id, name, email, role, employee_id, created_at`,
    [
      name, email, hashedPassword, role, employee_id, phone, date_of_birth,
      address, department_id, position, start_date, manager_id,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      profile_picture
    ]
  );
  
  return result.rows[0];
},
  
  /**
   * Find user by ID
   */
  findById: async (id) => {
    const result = await query(
      `SELECT u.*, d.name as department_name, d.id as department_id,
              m.name as manager_name, m.email as manager_email, m.id as manager_id
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    
    delete user.password;
    delete user.reset_password_token;
    delete user.reset_password_expires;
    delete user.email_verification_token;
    delete user.email_verification_expires;
    
    return user;
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
      WHERE u.is_active = true
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
      queryText += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.employee_id ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }
    
    queryText += ' GROUP BY u.id, d.name ORDER BY u.created_at DESC';
    
    const result = await query(queryText, params);
    return result.rows.map(user => {
      const { password, reset_password_token, reset_password_expires, ...userWithoutSensitive } = user;
      return userWithoutSensitive;
    });
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
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    delete user.password;
    
    return user;
  },
  
  /**
   * Update user profile
   */
  updateProfile: async (id, profileData) => {
    const allowedFields = [
      'name', 'phone', 'date_of_birth', 'address',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      'profile_picture'
    ];
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(profileData).forEach(key => {
      if (allowedFields.includes(key) && profileData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(profileData[key]);
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
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    delete user.password;
    
    return user;
  },
  
  /**
   * Update password
   */
  updatePassword: async (id, newPassword) => {
    const hashedPassword = await hashPassword(newPassword);
    
    const result = await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [hashedPassword, id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Verify password
   */
  verifyPassword: async (id, password) => {
    const result = await query(
      'SELECT password FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return await comparePassword(password, result.rows[0].password);
  },
  
  /**
   * HARD DELETE 
   */
  delete: async (id) => {
    console.log('Starting HARD DELETE for user ID:', id);
    
    try {
      const userCheck = await query(
        'SELECT id, name, email, employee_id FROM users WHERE id = $1',
        [id]
      );
      
      if (userCheck.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const userInfo = userCheck.rows[0];
      console.log(`   Found user: ${userInfo.name} (${userInfo.email})`);
      
      try {
        const docsResult = await query(
          'DELETE FROM documents WHERE employee_id = $1',
          [id]
        );
        console.log(`   Deleted ${docsResult.rowCount} documents`);
      } catch (err) {
        console.log(`   Documents deletion: ${err.message}`);
      }
      
      try {
        const tasksResult = await query(
          'DELETE FROM employee_tasks WHERE employee_id = $1',
          [id]
        );
        console.log(`   Deleted ${tasksResult.rowCount} employee tasks`);
      } catch (err) {
        console.log(`   Employee tasks deletion: ${err.message}`);
      }
      
      try {
        const managedResult = await query(
          'UPDATE users SET manager_id = NULL WHERE manager_id = $1',
          [id]
        );
        console.log(`   Updated ${managedResult.rowCount} managed users`);
      } catch (err) {
        console.log(`   Manager update: ${err.message}`);
      }
      
      try {
        const notifsResult = await query(
          'DELETE FROM notifications WHERE user_id = $1 OR related_user_id = $1',
          [id]
        );
        console.log(`   Deleted ${notifsResult.rowCount} notifications`);
      } catch (err) {
        console.log('   Notifications table not found or error:', err.message);
      }
      
      try {
        const logsResult = await query(
          'DELETE FROM activity_logs WHERE user_id = $1',
          [id]
        );
        console.log(`   Deleted ${logsResult.rowCount} activity logs`);
      } catch (err) {
        console.log('   Activity logs table not found or error:', err.message);
      }
      
      try {
        const resetResult = await query(
          'DELETE FROM password_resets WHERE user_id = $1 OR email = $2',
          [id, userInfo.email]
        );
        if (resetResult.rowCount > 0) {
          console.log(`   ✓ Deleted ${resetResult.rowCount} password reset records`);
        }
      } catch (err) {
      }
      
      const userResult = await query(
        'DELETE FROM users WHERE id = $1 RETURNING id, name, email, employee_id',
        [id]
      );
      
      if (userResult.rowCount === 0) {
        throw new Error('User not found during final deletion');
      }
      
      const deletedUser = userResult.rows[0];
      console.log(`PERMANENTLY DELETED user: ${deletedUser.name} (${deletedUser.email})`);
      
      return deletedUser;
      
    } catch (error) {
      console.error('Hard delete failed:', error.message);
      
      if (error.message.includes('foreign key constraint')) {
        throw new Error('Cannot delete user due to existing references in other tables. Please check database constraints.');
      }
      
      throw error;
    }
  },
  
  /**
   * Soft Delete
   */
  softDelete: async (id) => {
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
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
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 2)
        END as percentage
      FROM employee_tasks
      WHERE employee_id = $1`,
      [id]
    );
    
    return result.rows[0] || {
      total_tasks: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      overdue_tasks: 0,
      percentage: 0
    };
  },
  
  /**
   * Get user dashboard statistics
   */
  getDashboardStats: async (id) => {
    const [tasksResult, documentsResult] = await Promise.all([
      query(
        `SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'overdue') as overdue_tasks
        FROM employee_tasks
        WHERE employee_id = $1`,
        [id]
      ),
      query(
        `SELECT 
          COUNT(*) as total_documents,
          COUNT(*) FILTER (WHERE status = 'verified') as verified_documents
        FROM documents
        WHERE employee_id = $1`,
        [id]
      )
    ]);
    
    const tasks = tasksResult.rows[0] || {
      total_tasks: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      overdue_tasks: 0
    };
    
    const documents = documentsResult.rows[0] || {
      total_documents: 0,
      verified_documents: 0
    };
    
    return {
      tasks,
      documents,
      total_stats: {
        tasks: tasks.total_tasks,
        completed_tasks: tasks.completed_tasks,
        documents: documents.total_documents,
        verified_documents: documents.verified_documents
      }
    };
  },
  
  /**
   * Find users by department
   */
  findByDepartment: async (departmentId, excludeUserId = null) => {
    let queryText = `
      SELECT u.id, u.name, u.email, u.position, u.employee_id, u.profile_picture
      FROM users u
      WHERE u.department_id = $1 AND u.is_active = true AND u.role = 'employee'
    `;
    
    const params = [departmentId];
    let paramCount = 2;
    
    if (excludeUserId) {
      queryText += ` AND u.id != $${paramCount}`;
      params.push(excludeUserId);
      paramCount++;
    }
    
    queryText += ' ORDER BY u.name';
    
    const result = await query(queryText, params);
    return result.rows;
  },
  
  /**
   * Find available employees for template assignment
   */
  findAvailableEmployees: async () => {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id, u.position, 
              u.profile_picture, u.onboarding_status,
              d.name as department_name,
              COUNT(et.id) FILTER (WHERE et.status = 'completed') as completed_tasks,
              COUNT(et.id) as total_tasks,
              CASE 
                WHEN COUNT(et.id) = 0 THEN 0
                ELSE ROUND(COUNT(et.id) FILTER (WHERE et.status = 'completed')::numeric / NULLIF(COUNT(et.id), 0) * 100, 2)
              END as onboarding_progress
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN employee_tasks et ON u.id = et.employee_id
       WHERE u.is_active = true 
         AND u.role NOT IN ('hr', 'admin')
       GROUP BY u.id, d.name
       ORDER BY u.name ASC`
    );
    
    return result.rows.map(user => {
      const { password, reset_password_token, reset_password_expires, ...userWithoutSensitive } = user;
      return userWithoutSensitive;
    });
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
  
  /**
   * Set email verification token
   */
  setEmailVerificationToken: async (email, token, expires) => {
    await query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2
       WHERE email = $3`,
      [token, expires, email]
    );
  },
  
  /**
   * Verify email
   */
  verifyEmail: async (token) => {
    const result = await query(
      `UPDATE users 
       SET email_verified = true, 
           email_verification_token = NULL,
           email_verification_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE email_verification_token = $1 
         AND email_verification_expires > NOW()
       RETURNING id, email, name`,
      [token]
    );
    
    return result.rows[0];
  },
  
  /**
   * Update last login
   */
  updateLastLogin: async (id) => {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  },
  
  /**
   * Reset login attempts
   */
  resetLoginAttempts: async (id) => {
    await query(
      'UPDATE users SET login_attempts = 0, account_locked_until = NULL WHERE id = $1',
      [id]
    );
  },
  
  /**
   * Increment login attempts
   */
  incrementLoginAttempts: async (id) => {
    const result = await query(
      `UPDATE users 
       SET login_attempts = login_attempts + 1,
           account_locked_until = CASE 
             WHEN login_attempts + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
             ELSE NULL 
           END
       WHERE id = $1
       RETURNING login_attempts, account_locked_until`,
      [id]
    );
    
    return result.rows[0];
  }
};

module.exports = User;