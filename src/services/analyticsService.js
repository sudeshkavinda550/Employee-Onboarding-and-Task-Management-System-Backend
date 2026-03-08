const { query } = require('../config/database');
const User = require('../models/User');
const EmployeeTask = require('../models/EmployeeTask');
const Task = require('../models/Task');
const Department = require('../models/Department');
const { Op } = require('sequelize');

const analyticsService = {

  getDashboardStats: async () => {
    try {
      // Pure SQL — User.count/findAll are not functions in this plain-SQL model
      const statsResult = await query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'employee') as total_employees,
          (SELECT COUNT(*) FROM users WHERE role = 'employee' AND onboarding_status = 'in_progress') as onboarding_in_progress,
          (SELECT COUNT(*) FROM users WHERE role = 'employee' AND onboarding_status = 'completed') as onboarding_completed,
          (SELECT COUNT(*) FROM users WHERE role = 'hr') as hr_managers,
          (SELECT COUNT(*) FROM templates) as total_templates,
          (SELECT COUNT(*) FROM employee_tasks
           WHERE status IN ('pending', 'in_progress') AND due_date < NOW()) as overdue_tasks
      `);

      const avgResult = await query(`
        SELECT COALESCE(
          ROUND(
            AVG(
              CEIL(
                EXTRACT(EPOCH FROM (onboarding_completed_date - start_date::timestamp)) / 86400.0
              )
            )::numeric, 1
          ), 0
        ) as avg_days
        FROM users
        WHERE role = 'employee'
          AND onboarding_status = 'completed'
          AND onboarding_completed_date IS NOT NULL
          AND start_date IS NOT NULL
      `);

      const s = statsResult.rows[0];
      const totalEmployees       = parseInt(s.total_employees       || 0);
      const onboardingInProgress = parseInt(s.onboarding_in_progress|| 0);
      const onboardingCompleted  = parseInt(s.onboarding_completed  || 0);
      const hrManagers           = parseInt(s.hr_managers           || 0);
      const totalTemplates       = parseInt(s.total_templates       || 0);
      const overdueTasks         = parseInt(s.overdue_tasks         || 0);
      const averageCompletionDays= parseFloat(avgResult.rows[0].avg_days || 0);
      const completionRate       = totalEmployees > 0
        ? Math.round((onboardingCompleted / totalEmployees) * 100)
        : 0;

      return {
        totalEmployees,
        onboardingInProgress,
        onboardingCompleted,
        overdueTasks,
        averageCompletionDays,
        completionRate,
        hrManagers,
        totalTemplates,
        // aliases for admin dashboard frontend
        totalUsers:           totalEmployees,
        activeEmployees:      totalEmployees,
        completedOnboardings: onboardingCompleted,
        activeOnboardings:    onboardingInProgress,
      };
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      throw error;
    }
  },

  getDepartmentCompletion: async () => {
    try {
      const departments = await Department.findAll();
      const labels = [];
      const data = [];
      
      for (const dept of departments) {
        const totalInDept = await User.count({ 
          role: 'employee',
          department: dept.id 
        });
        
        const completedInDept = await User.count({ 
          role: 'employee',
          department: dept.id,
          onboardingStatus: 'completed' 
        });
        
        labels.push(dept.name);
        data.push(totalInDept > 0 ? Math.round((completedInDept / totalInDept) * 100) : 0);
      }
      
      return { labels, data };
    } catch (error) {
      console.error('Error getting department completion:', error);
      throw error;
    }
  },

  getTaskStatusDistribution: async () => {
    try {
      const now = new Date();
      const completed  = await EmployeeTask.count({ status: 'completed' });
      const inProgress = await EmployeeTask.count({ status: 'in_progress' });
      const pending    = await EmployeeTask.count({ 
        status: 'pending',
        $or: [{ dueDate: { $gte: now } }, { dueDate: null }]
      });
      const overdue = await EmployeeTask.count({
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $lt: now }
      });
      return { completed, inProgress, pending, overdue };
    } catch (error) {
      console.error('Error getting task status distribution:', error);
      throw error;
    }
  },

  getOnboardingTrends: async (period = 'month') => {
    try {
      const now = new Date();
      let startDate;
      switch (period) {
        case 'week':    startDate = new Date(now.setDate(now.getDate() - 7));         break;
        case 'month':   startDate = new Date(now.setMonth(now.getMonth() - 1));       break;
        case 'quarter': startDate = new Date(now.setMonth(now.getMonth() - 3));       break;
        case 'year':    startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
        default:        startDate = new Date(now.setMonth(now.getMonth() - 1));
      }
      const employees = await User.findAll({
        role: 'employee',
        createdAt: { $gte: startDate }
      });
      const trends = {};
      employees.forEach(emp => {
        const date = new Date(emp.createdAt).toLocaleDateString();
        trends[date] = (trends[date] || 0) + 1;
      });
      return { labels: Object.keys(trends), data: Object.values(trends) };
    } catch (error) {
      console.error('Error getting onboarding trends:', error);
      throw error;
    }
  },

  getDepartmentAnalytics: async () => {
    try {
      const departments = await Department.findAll();
      const analytics = [];
      for (const dept of departments) {
        const totalEmployees      = await User.count({ role: 'employee', department: dept.id });
        const activeOnboarding    = await User.count({ role: 'employee', department: dept.id, onboardingStatus: 'in_progress' });
        const completedOnboarding = await User.count({ role: 'employee', department: dept.id, onboardingStatus: 'completed' });
        analytics.push({
          departmentId: dept.id,
          departmentName: dept.name,
          totalEmployees,
          activeOnboarding,
          completedOnboarding,
          completionRate: totalEmployees > 0 ? Math.round((completedOnboarding / totalEmployees) * 100) : 0
        });
      }
      return analytics;
    } catch (error) {
      console.error('Error getting department analytics:', error);
      throw error;
    }
  }
};

module.exports = {
  ...analyticsService,
  getDepartmentCompletion: analyticsService.getDepartmentCompletion,
  getTaskStatusDistribution: analyticsService.getTaskStatusDistribution
};