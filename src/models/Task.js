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
};

module.exports = Task;