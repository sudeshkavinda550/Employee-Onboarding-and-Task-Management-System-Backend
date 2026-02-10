const { query } = require('../config/database');

const Task = {
  /**
   * Create task
   */
  create: async (taskData) => {
    const {
      template_id,
      title,
      description,
      task_type,
      is_required,
      estimated_time,
      order_index,
      resource_url,
    } = taskData;
    
    const result = await query(
      `INSERT INTO tasks (template_id, title, description, task_type, is_required, estimated_time, order_index, resource_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [template_id, title, description, task_type, is_required, estimated_time, order_index, resource_url]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find tasks by template ID
   */
  findByTemplateId: async (template_id) => {
    const result = await query(
      'SELECT * FROM tasks WHERE template_id = $1 ORDER BY order_index ASC',
      [template_id]
    );
    
    return result.rows;
  },
  
  /**
   * Find task by ID
   */
  findById: async (id) => {
    const result = await query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Update task
   */
  update: async (id, taskData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(taskData).forEach(key => {
      if (taskData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(taskData[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const result = await query(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  },
  
  /**
   * Delete task
   */
  delete: async (id) => {
    await query('DELETE FROM tasks WHERE id = $1', [id]);
  },
  
  /**
   * Bulk create tasks
   */
  bulkCreate: async (tasksArray) => {
    const promises = tasksArray.map(task => Task.create(task));
    return await Promise.all(promises);
  },
  
  /**
   * Get all tasks with filters
   */
  getAllWithFilters: async (filters = {}) => {
    const {
      template_id,
      task_type,
      is_required,
      search,
      page = 1,
      limit = 20
    } = filters;
    
    let queryText = `
      SELECT t.*, tm.name as template_name,
      COUNT(*) OVER() as total_count
      FROM tasks t
      LEFT JOIN templates tm ON t.template_id = tm.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (template_id) {
      queryText += ` AND t.template_id = $${paramCount}`;
      params.push(template_id);
      paramCount++;
    }
    
    if (task_type) {
      queryText += ` AND t.task_type = $${paramCount}`;
      params.push(task_type);
      paramCount++;
    }
    
    if (is_required !== undefined) {
      queryText += ` AND t.is_required = $${paramCount}`;
      params.push(is_required);
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
    
    const offset = (page - 1) * limit;
    queryText += `
      ORDER BY t.order_index ASC, t.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    
    return {
      tasks: result.rows.map(row => {
        const { total_count, ...task } = row;
        return task;
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }
};

module.exports = Task;