const { query } = require('../config/database');

const Document = {
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
    
    try {
      const result = await query(
        `INSERT INTO documents (employee_id, task_id, filename, original_filename, file_path, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [employee_id, task_id, filename, original_filename, file_path, file_type, file_size]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in Document.create:', error.message);
      throw error;
    }
  },
  
  findByEmployeeId: async (employee_id) => {
    try {
      const result = await query(
        `SELECT 
          d.id,
          d.employee_id,
          d.task_id,
          d.filename,
          d.original_filename,
          d.file_path,
          d.file_type,
          d.file_size,
          d.status,
          d.uploaded_date,
          d.reviewed_by,
          d.reviewed_date,
          d.rejection_reason,
          t.title as task_title,
          r.name as reviewed_by_name
         FROM documents d
         LEFT JOIN employee_tasks et ON d.task_id = et.id
         LEFT JOIN tasks t ON et.task_id = t.id
         LEFT JOIN users r ON d.reviewed_by = r.id
         WHERE d.employee_id = $1
         ORDER BY d.uploaded_date DESC`,
        [employee_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error in Document.findByEmployeeId:', error.message);
      throw error;
    }
  },
  
  findById: async (id) => {
    try {
      const result = await query(
        `SELECT 
          d.*, 
          u.name as employee_name, 
          u.email as employee_email,
          t.title as task_title,
          r.name as reviewed_by_name
         FROM documents d
         JOIN users u ON d.employee_id = u.id
         LEFT JOIN employee_tasks et ON d.task_id = et.id
         LEFT JOIN tasks t ON et.task_id = t.id
         LEFT JOIN users r ON d.reviewed_by = r.id
         WHERE d.id = $1`,
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in Document.findById:', error.message);
      throw error;
    }
  },
  
  findAll: async (filters = {}) => {
    try {
      let queryText = `
        SELECT 
          d.*, 
          u.name as employee_name, 
          u.email as employee_email,
          t.title as task_title,
          r.name as reviewed_by_name
        FROM documents d
        JOIN users u ON d.employee_id = u.id
        LEFT JOIN employee_tasks et ON d.task_id = et.id
        LEFT JOIN tasks t ON et.task_id = t.id
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
    } catch (error) {
      console.error('Error in Document.findAll:', error.message);
      throw error;
    }
  },
  
 approve: async (id, reviewed_by) => {
  try {
    const result = await query(
      `UPDATE documents
       SET status = 'approved',
           reviewed_by = $1,
           reviewed_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *, task_id`,
      [reviewed_by, id]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error in Document.approve:', error.message);
    throw error;
  }
},
  
  reject: async (id, reviewed_by, rejection_reason) => {
    try {
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
    } catch (error) {
      console.error('Error in Document.reject:', error.message);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      console.log(`[Document.delete] Deleting document: ${id}`);
      
      const result = await query(
        'DELETE FROM documents WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      console.log(`[Document.delete] Document deleted successfully`);
      return result.rows[0];
      
    } catch (error) {
      console.error('[Document.delete] Error:', error.message);
      throw error;
    }
  },
  
  getPending: async () => {
    try {
      const result = await query(
        `SELECT 
          d.*, 
          u.name as employee_name, 
          u.email as employee_email,
          t.title as task_title
         FROM documents d
         JOIN users u ON d.employee_id = u.id
         LEFT JOIN employee_tasks et ON d.task_id = et.id
         LEFT JOIN tasks t ON et.task_id = t.id
         WHERE d.status = 'pending'
         ORDER BY d.uploaded_date ASC`
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error in Document.getPending:', error.message);
      throw error;
    }
  },
};

module.exports = Document;