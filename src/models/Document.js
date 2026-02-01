const { query } = require('../config/database');

const Document = {
  /**
   * Create document
   */
  create: async (documentData) => {
    const {
      employee_id,
      task_id,
      filename,
      original_filename,
      file_path,
      file_type,
      file_size,
    } = documentData;
    
    const result = await query(
      `INSERT INTO documents (employee_id, task_id, filename, original_filename, file_path, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employee_id, task_id, filename, original_filename, file_path, file_type, file_size]
    );
    
    return result.rows[0];
  },
  
  /**
   * Create template document
   */
  createTemplateDocument: async (documentData) => {
    const {
      template_id,
      filename,
      file_path,
      file_size,
      file_type,
      uploaded_by,
    } = documentData;
    
    const result = await query(
      `INSERT INTO documents (template_id, filename, file_path, file_size, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [template_id, filename, file_path, file_size, file_type, uploaded_by]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find documents by employee ID
   */
  findByEmployeeId: async (employee_id) => {
    const result = await query(
      `SELECT d.*, t.title as task_title, r.name as reviewed_by_name
       FROM documents d
       LEFT JOIN tasks t ON d.task_id = t.id
       LEFT JOIN users r ON d.reviewed_by = r.id
       WHERE d.employee_id = $1
       ORDER BY d.uploaded_date DESC`,
      [employee_id]
    );
    
    return result.rows;
  },
  
  /**
   * Find documents by template ID
   */
  findByTemplateId: async (template_id) => {
    const result = await query(
      `SELECT d.*, u.name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.template_id = $1 AND d.is_active = true
       ORDER BY d.uploaded_at DESC`,
      [template_id]
    );
    
    return result.rows;
  },
  
  /**
   * Find document by ID
   */
  findById: async (id) => {
    const result = await query(
      `SELECT d.*, u.name as employee_name, u.email as employee_email,
              t.title as task_title, r.name as reviewed_by_name
       FROM documents d
       JOIN users u ON d.employee_id = u.id
       LEFT JOIN tasks t ON d.task_id = t.id
       LEFT JOIN users r ON d.reviewed_by = r.id
       WHERE d.id = $1`,
      [id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Find all documents with filters
   */
  findAll: async (filters = {}) => {
    let queryText = `
      SELECT d.*, u.name as employee_name, u.email as employee_email,
             t.title as task_title, r.name as reviewed_by_name
      FROM documents d
      JOIN users u ON d.employee_id = u.id
      LEFT JOIN tasks t ON d.task_id = t.id
      LEFT JOIN users r ON d.reviewed_by = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.status) {
      queryText += ` AND d.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    if (filters.employee_id) {
      queryText += ` AND d.employee_id = $${paramCount}`;
      params.push(filters.employee_id);
      paramCount++;
    }
    
    queryText += ' ORDER BY d.uploaded_date DESC';
    
    const result = await query(queryText, params);
    return result.rows;
  },
  
  /**
   * Approve document
   */
  approve: async (id, reviewed_by) => {
    const result = await query(
      `UPDATE documents
       SET status = 'approved',
           reviewed_by = $1,
           reviewed_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewed_by, id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Reject document
   */
  reject: async (id, reviewed_by, rejection_reason) => {
    const result = await query(
      `UPDATE documents
       SET status = 'rejected',
           reviewed_by = $1,
           rejection_reason = $2,
           reviewed_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [reviewed_by, rejection_reason, id]
    );
    
    return result.rows[0];
  },
  
  /**
   * Delete document (soft delete for template documents)
   */
  delete: async (id) => {
    // Check if it's a template document
    const doc = await query('SELECT template_id FROM documents WHERE id = $1', [id]);
    
    if (doc.rows[0]?.template_id) {
      // Soft delete for template documents
      const result = await query(
        'UPDATE documents SET is_active = false WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } else {
      // Hard delete for other documents
      // First get document to delete file
      const document = await Document.findById(id);
      
      // Delete from database
      await query('DELETE FROM documents WHERE id = $1', [id]);
      
      return document;
    }
  },
  
  /**
   * Get pending documents
   */
  getPending: async () => {
    const result = await query(
      `SELECT d.*, u.name as employee_name, u.email as employee_email,
              t.title as task_title
       FROM documents d
       JOIN users u ON d.employee_id = u.id
       LEFT JOIN tasks t ON d.task_id = t.id
       WHERE d.status = 'pending'
       ORDER BY d.uploaded_date ASC`
    );
    
    return result.rows;
  },
};

module.exports = Document;