const { query } = require('../config/database');
const logger = require('../utils/logger');

const analyticsService = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    try {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_employees,
          COUNT(DISTINCT u.id) FILTER (WHERE u.onboarding_status = 'in_progress') as onboarding_in_progress,
          COUNT(DISTINCT u.id) FILTER (WHERE u.onboarding_status = 'completed') as onboarding_completed,
          COUNT(DISTINCT et.id) FILTER (WHERE et.status = 'overdue') as overdue_tasks,
          ROUND(AVG(EXTRACT(DAY FROM (u.onboarding_completed_date - u.start_date))), 0) as average_completion_days,
          ROUND(AVG(completion_percentage.percentage), 2) as completion_rate
        FROM users u
        LEFT JOIN employee_tasks et ON u.id = et.employee_id
        LEFT JOIN (
          SELECT employee_id,
                 COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100 as percentage
          FROM employee_tasks
          GROUP BY employee_id
        ) completion_percentage ON u.id = completion_percentage.employee_id
        WHERE u.role = 'employee'
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      throw error;
    }
  },
  
  /**
   * Get completion rates by period
   */
  getCompletionRates: async (period = 'month') => {
    try {
      let dateInterval;
      switch (period) {
        case 'week':
          dateInterval = '7 days';
          break;
        case 'month':
          dateInterval = '30 days';
          break;
        case 'quarter':
          dateInterval = '90 days';
          break;
        case 'year':
          dateInterval = '365 days';
          break;
        default:
          dateInterval = '30 days';
      }
      
      const result = await query(`
        SELECT 
          DATE_TRUNC('day', completed_date) as date,
          COUNT(*) as completed_count
        FROM employee_tasks
        WHERE status = 'completed' 
          AND completed_date >= NOW() - INTERVAL '${dateInterval}'
        GROUP BY DATE_TRUNC('day', completed_date)
        ORDER BY date
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Get completion rates error:', error);
      throw error;
    }
  },
  
  /**
   * Get department analytics
   */
  getDepartmentAnalytics: async () => {
    try {
      const result = await query(`
        SELECT 
          d.name as department,
          COUNT(DISTINCT u.id) as total_employees,
          COUNT(DISTINCT u.id) FILTER (WHERE u.onboarding_status = 'completed') as completed_onboarding,
          ROUND(AVG(EXTRACT(DAY FROM (u.onboarding_completed_date - u.start_date))), 0) as average_completion_days,
          ROUND(
            COUNT(DISTINCT u.id) FILTER (WHERE u.onboarding_status = 'completed')::numeric / 
            NULLIF(COUNT(DISTINCT u.id), 0) * 100, 
            2
          ) as completion_rate
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id
        WHERE u.role = 'employee'
        GROUP BY d.id, d.name
        ORDER BY d.name
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Get department analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get time to completion metrics
   */
  getTimeToCompletion: async () => {
    try {
      const result = await query(`
        SELECT 
          AVG(EXTRACT(DAY FROM (onboarding_completed_date - start_date))) as average_days,
          MIN(EXTRACT(DAY FROM (onboarding_completed_date - start_date))) as min_days,
          MAX(EXTRACT(DAY FROM (onboarding_completed_date - start_date))) as max_days
        FROM users
        WHERE onboarding_status = 'completed' AND role = 'employee'
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Get time to completion error:', error);
      throw error;
    }
  },
};

module.exports = analyticsService;