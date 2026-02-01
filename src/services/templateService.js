const Template = require('../models/Template');
const Task = require('../models/Task');
const logger = require('../utils/logger');
const { query } = require('../config/database');

const templateService = {
  /**
   * Create template with tasks (using transaction)
   */
  createTemplateWithTasks: async (templateData, tasksData, createdBy) => {
    // FIX: Use database transaction to ensure atomicity
    try {
      // Start transaction
      await query('BEGIN');
      
      try {
        // Create template
        const template = await Template.create({
          ...templateData,
          created_by: createdBy,
        });
        
        // Create tasks if provided
        if (tasksData && tasksData.length > 0) {
          // FIX: Validate tasks before creation
          const validatedTasks = tasksData.map((task, index) => {
            if (!task.title || !task.task_type) {
              throw new Error(`Task at index ${index} is missing required fields`);
            }
            
            return {
              ...task,
              template_id: template.id,
              order_index: task.order_index || index + 1, // Auto-assign order if not provided
            };
          });
          
          await Task.bulkCreate(validatedTasks);
        }
        
        // Commit transaction
        await query('COMMIT');
        
        // Return template with tasks
        return await templateService.getTemplateWithTasks(template.id);
      } catch (error) {
        // Rollback on error
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Create template with tasks error:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  },
  
  /**
   * Update template with tasks (using transaction)
   */
  updateTemplateWithTasks: async (templateId, templateData, tasksData) => {
    try {
      // Start transaction
      await query('BEGIN');
      
      try {
        // Update template if data provided
        if (templateData && Object.keys(templateData).length > 0) {
          await Template.update(templateId, templateData);
        }
        
        // Update tasks if provided
        if (tasksData && Array.isArray(tasksData)) {
          // Delete existing tasks
          const existingTasks = await Task.findByTemplateId(templateId);
          for (const task of existingTasks) {
            await Task.delete(task.id);
          }
          
          // Create new tasks
          const validatedTasks = tasksData.map((task, index) => {
            if (!task.title || !task.task_type) {
              throw new Error(`Task at index ${index} is missing required fields`);
            }
            
            return {
              ...task,
              template_id: templateId,
              order_index: task.order_index || index + 1,
            };
          });
          
          await Task.bulkCreate(validatedTasks);
        }
        
        // Commit transaction
        await query('COMMIT');
        
        // Return updated template with tasks
        return await templateService.getTemplateWithTasks(templateId);
      } catch (error) {
        // Rollback on error
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Update template with tasks error:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }
  },
  
  /**
   * Get template with all tasks
   */
  getTemplateWithTasks: async (templateId) => {
    try {
      const template = await Template.findById(templateId);
      
      if (!template) {
        return null; // Return null instead of throwing error
      }
      
      const tasks = await Task.findByTemplateId(templateId);
      
      return {
        ...template,
        tasks: tasks || [],
      };
    } catch (error) {
      logger.error('Get template with tasks error:', error);
      throw new Error(`Failed to fetch template: ${error.message}`);
    }
  },
  
  /**
   * Validate template before assignment
   */
  validateTemplateForAssignment: async (templateId) => {
    try {
      const template = await Template.findById(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      const tasks = await Task.findByTemplateId(templateId);
      
      if (!tasks || tasks.length === 0) {
        throw new Error('Template has no tasks');
      }
      
      // FIX: Check if all required fields are present in tasks
      const invalidTasks = tasks.filter(task => !task.title || !task.task_type);
      if (invalidTasks.length > 0) {
        throw new Error('Template has invalid tasks');
      }
      
      return {
        valid: true,
        template,
        tasks,
      };
    } catch (error) {
      logger.error('Validate template error:', error);
      throw error;
    }
  },
  
  /**
   * Get template statistics
   */
  getTemplateStats: async (templateId) => {
    try {
      const template = await Template.findById(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Get task count
      const tasks = await Task.findByTemplateId(templateId);
      
      // Get assignment count
      const assignmentResult = await query(
        `SELECT 
          COUNT(DISTINCT employee_id) as assigned_employees,
          COUNT(*) as total_task_assignments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assignments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_assignments,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_assignments
         FROM employee_tasks
         WHERE template_id = $1`,
        [templateId]
      );
      
      return {
        template_id: templateId,
        template_name: template.name,
        total_tasks: tasks.length,
        assigned_employees: parseInt(assignmentResult.rows[0].assigned_employees) || 0,
        total_task_assignments: parseInt(assignmentResult.rows[0].total_task_assignments) || 0,
        completed_assignments: parseInt(assignmentResult.rows[0].completed_assignments) || 0,
        pending_assignments: parseInt(assignmentResult.rows[0].pending_assignments) || 0,
        in_progress_assignments: parseInt(assignmentResult.rows[0].in_progress_assignments) || 0,
      };
    } catch (error) {
      logger.error('Get template stats error:', error);
      throw new Error(`Failed to fetch template statistics: ${error.message}`);
    }
  },
  
  /**
   * Check if template can be deleted
   */
  canDeleteTemplate: async (templateId) => {
    try {
      const assignmentResult = await query(
        'SELECT COUNT(*) as count FROM employee_tasks WHERE template_id = $1',
        [templateId]
      );
      
      const assignmentCount = parseInt(assignmentResult.rows[0].count);
      
      return {
        canDelete: assignmentCount === 0,
        assignmentCount,
        message: assignmentCount > 0 
          ? `Cannot delete template. It is assigned to ${assignmentCount} task(s).` 
          : 'Template can be deleted',
      };
    } catch (error) {
      logger.error('Check delete permission error:', error);
      throw new Error(`Failed to check delete permission: ${error.message}`);
    }
  },
};

module.exports = templateService;