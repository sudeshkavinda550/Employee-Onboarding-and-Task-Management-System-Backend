const { query } = require('../config/database');

const Template = {
  /**
   * Create template
   */
  create: async (templateData) => {
    const {
      name,
      description,
      department_id,
      estimated_completion_days,
      created_by,
    } = templateData;
    
    const result = await query(
      `INSERT INTO templates (name, description, department_id, estimated_completion_days, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, department_id, estimated_completion_days, created_by]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find all templates
   */
  findAll: async (filters = {}) => {
    let queryText = `
      SELECT t.*, d.name as department_name, u.name as created_by_name,
             COUNT(ta.id) as tasks_count
      FROM templates t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN tasks ta ON t.id = ta.template_id
      WHERE t.is_active = true
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.department_id) {
      queryText += ` AND t.department_id = $${paramCount}`;
      params.push(filters.department_id);
      paramCount++;
    }
    
    if (filters.search) {
      queryText += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }
    
    queryText += ' GROUP BY t.id, d.name, u.name ORDER BY t.created_at DESC';
    
    const result = await query(queryText, params);
    return result.rows;
  },
  
  /**
   * Find template by ID
   */
  findById: async (id) => {
    const result = await query(
      `SELECT t.*, d.name as department_name, u.name as created_by_name
       FROM templates t
       LEFT JOIN departments d ON t.department_id = d.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Update template
   */
  update: async (id, templateData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(templateData).forEach(key => {
      if (templateData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(templateData[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const result = await query(
      `UPDATE templates SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  },
  
  /**
   * Delete template 
   */
  delete: async (id) => {
    await query(
      'UPDATE templates SET is_active = false WHERE id = $1',
      [id]
    );
  },
  
  /**
   * Duplicate template
   */
  duplicate: async (id, created_by) => {
    const original = await Template.findById(id);

    const newTemplate = await query(
      `INSERT INTO templates (name, description, department_id, estimated_completion_days, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        `${original.name} (Copy)`,
        original.description,
        original.department_id,
        original.estimated_completion_days,
        created_by,
      ]
    );

    await query(
      `INSERT INTO tasks (template_id, title, description, task_type, is_required, estimated_time, order_index, resource_url)
       SELECT $1, title, description, task_type, is_required, estimated_time, order_index, resource_url
       FROM tasks
       WHERE template_id = $2`,
      [newTemplate.rows[0].id, id]
    );
    
    return newTemplate.rows[0];
  },
};

module.exports = Template;