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
    
    try {
      const result = await query(
        `INSERT INTO templates (name, description, department_id, estimated_completion_days, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, description, department_id, estimated_completion_days, created_by]
      );
      
      return result.rows[0];
    } catch (error) {
      // FIX: Handle unique constraint violations
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new Error('A template with this name already exists');
      }
      if (error.code === '23503') { // PostgreSQL foreign key violation
        throw new Error('Invalid department_id or created_by user');
      }
      throw error;
    }
  },
  
  /**
   * Find all templates
   */
  findAll: async (filters = {}) => {
    try {
      let queryText = `
        SELECT 
          t.*, 
          d.name as department_name, 
          u.name as created_by_name,
          COUNT(DISTINCT ta.id) as tasks_count
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
    } catch (error) {
      throw new Error(`Error fetching templates: ${error.message}`);
    }
  },
  
  /**
   * Find template by ID
   */
  findById: async (id) => {
    try {
      const result = await query(
        `SELECT 
          t.*, 
          d.name as department_name, 
          u.name as created_by_name
         FROM templates t
         LEFT JOIN departments d ON t.department_id = d.id
         LEFT JOIN users u ON t.created_by = u.id
         WHERE t.id = $1 AND t.is_active = true`,
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching template: ${error.message}`);
    }
  },
  
  /**
   * Update template
   */
  update: async (id, templateData) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    // FIX: Whitelist allowed fields to prevent updating restricted fields
    const allowedFields = [
      'name',
      'description',
      'department_id',
      'estimated_completion_days',
      'is_active'
    ];
    
    Object.keys(templateData).forEach(key => {
      if (templateData[key] !== undefined && allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(templateData[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    try {
      const result = await query(
        `UPDATE templates 
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount} AND is_active = true
         RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        throw new Error('Template not found or already deleted');
      }
      
      return result.rows[0];
    } catch (error) {
      // Handle constraint violations
      if (error.code === '23505') {
        throw new Error('A template with this name already exists');
      }
      if (error.code === '23503') {
        throw new Error('Invalid department_id');
      }
      throw error;
    }
  },
  
  /**
   * Delete template (soft delete)
   */
  delete: async (id) => {
    try {
      const result = await query(
        'UPDATE templates SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = true RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Template not found or already deleted');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error deleting template: ${error.message}`);
    }
  },
  
  /**
   * Hard delete template (permanent deletion - use with caution)
   */
  hardDelete: async (id) => {
    try {
      const result = await query(
        'DELETE FROM templates WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      // FIX: Handle foreign key constraints
      if (error.code === '23503') {
        throw new Error('Cannot delete template with existing tasks or assignments');
      }
      throw new Error(`Error permanently deleting template: ${error.message}`);
    }
  },
  
  /**
   * Duplicate template
   */
  duplicate: async (id, created_by) => {
    try {
      const original = await Template.findById(id);
      
      if (!original) {
        throw new Error('Original template not found');
      }

      // FIX: Use transaction to ensure both template and tasks are created or neither
      const { query: dbQuery } = require('../config/database');
      
      // Start transaction
      await dbQuery('BEGIN');
      
      try {
        // Create new template
        const newTemplate = await dbQuery(
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

        // Copy tasks
        await dbQuery(
          `INSERT INTO tasks (template_id, title, description, task_type, is_required, estimated_time, order_index, resource_url)
           SELECT $1, title, description, task_type, is_required, estimated_time, order_index, resource_url
           FROM tasks
           WHERE template_id = $2`,
          [newTemplate.rows[0].id, id]
        );
        
        // Commit transaction
        await dbQuery('COMMIT');
        
        return newTemplate.rows[0];
      } catch (error) {
        // Rollback on error
        await dbQuery('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw new Error(`Error duplicating template: ${error.message}`);
    }
  },
  
  /**
   * Check if template exists
   */
  exists: async (id) => {
    try {
      const result = await query(
        'SELECT EXISTS(SELECT 1 FROM templates WHERE id = $1 AND is_active = true) as exists',
        [id]
      );
      return result.rows[0].exists;
    } catch (error) {
      throw new Error(`Error checking template existence: ${error.message}`);
    }
  },
  
  /**
   * Count templates by department
   */
  countByDepartment: async (departmentId) => {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM templates WHERE department_id = $1 AND is_active = true',
        [departmentId]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting templates: ${error.message}`);
    }
  },
};

module.exports = Template;