const Template = require('../models/Template');
const Task = require('../models/Task');
const logger = require('../utils/logger');

const templateService = {
  /**
   * Create template with tasks
   */
  createTemplateWithTasks: async (templateData, tasksData, createdBy) => {
    try {
      // Create template
      const template = await Template.create({
        ...templateData,
        created_by: createdBy,
      });
      
      // Create tasks if provided
      if (tasksData && tasksData.length > 0) {
        const tasksWithTemplateId = tasksData.map(task => ({
          ...task,
          template_id: template.id,
        }));
        
        await Task.bulkCreate(tasksWithTemplateId);
      }
      
      return template;
    } catch (error) {
      logger.error('Create template with tasks error:', error);
      throw error;
    }
  },
  
  /**
   * Get template with all tasks
   */
  getTemplateWithTasks: async (templateId) => {
    try {
      const template = await Template.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      const tasks = await Task.findByTemplateId(templateId);
      
      return {
        ...template,
        tasks,
      };
    } catch (error) {
      logger.error('Get template with tasks error:', error);
      throw error;
    }
  },
};

module.exports = templateService;
