const User = require('../models/User');
const EmployeeTask = require('../models/EmployeeTask');
const Task = require('../models/Task');
const Department = require('../models/Department');
const { Op } = require('sequelize');

const analyticsService = {
  /**
   * Get overall dashboard statistics
   */
  getDashboardStats: async () => {
    try {
      const totalEmployees = await User.count({ role: 'employee' });
      
      const onboardingInProgress = await User.count({ 
        role: 'employee',
        onboardingStatus: 'in_progress' 
      });
      
      const onboardingCompleted = await User.count({ 
        role: 'employee',
        onboardingStatus: 'completed' 
      });
      
      const now = new Date();
      const overdueTasks = await EmployeeTask.count({
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $lt: now }
      });
      
      const completedEmployees = await User.findAll({ 
        role: 'employee',
        onboardingStatus: 'completed',
        completedAt: { $ne: null }
      });
      
      let totalDays = 0;
      completedEmployees.forEach(emp => {
        if (emp.startDate && emp.completedAt) {
          const days = Math.ceil(
            (new Date(emp.completedAt) - new Date(emp.startDate)) / (1000 * 60 * 60 * 24)
          );
          totalDays += days;
        }
      });
      
      const averageCompletionDays = completedEmployees.length > 0 
        ? Math.round((totalDays / completedEmployees.length) * 10) / 10 
        : 0;
      
      const completionRate = totalEmployees > 0 
        ? Math.round((onboardingCompleted / totalEmployees) * 100 * 100) / 100
        : 0;
      
      return {
        totalEmployees,
        onboardingInProgress,
        onboardingCompleted,
        overdueTasks,
        averageCompletionDays,
        completionRate
      };
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      throw error;
    }
  },

/**
 * Get completion rates by department
 */
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
        
        const completionPercentage = totalInDept > 0 
          ? Math.round((completedInDept / totalInDept) * 100) 
          : 0;
        
        labels.push(dept.name);
        data.push(completionPercentage);
      }
      
      return {
        labels,
        data
      };
    } catch (error) {
      console.error('Error getting department completion:', error);
      throw error;
    }
  },

  /**
   * Get task status distribution
   */
  getTaskStatusDistribution: async () => {
    try {
      const now = new Date();
      
      const completed = await EmployeeTask.count({ status: 'completed' });
      
      const inProgress = await EmployeeTask.count({ status: 'in_progress' });
      
      const pending = await EmployeeTask.count({ 
        status: 'pending',
        $or: [
          { dueDate: { $gte: now } },
          { dueDate: null }
        ]
      });
      
      const overdue = await EmployeeTask.count({
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $lt: now }
      });
      
      return {
        completed,
        inProgress,
        pending,
        overdue
      };
    } catch (error) {
      console.error('Error getting task status distribution:', error);
      throw error;
    }
  },

  /**
   * Get onboarding trends over time
   */
  getOnboardingTrends: async (period = 'month') => {
    try {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
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
      
      return {
        labels: Object.keys(trends),
        data: Object.values(trends)
      };
    } catch (error) {
      console.error('Error getting onboarding trends:', error);
      throw error;
    }
  },

  /**
   * Get department analytics for admin dashboard
   */
  getDepartmentAnalytics: async () => {
    try {
      const departments = await Department.findAll();
      const analytics = [];
      
      for (const dept of departments) {
        const totalEmployees = await User.count({ 
          role: 'employee',
          department: dept.id 
        });
        
        const activeOnboarding = await User.count({ 
          role: 'employee',
          department: dept.id,
          onboardingStatus: 'in_progress' 
        });
        
        const completedOnboarding = await User.count({ 
          role: 'employee',
          department: dept.id,
          onboardingStatus: 'completed' 
        });
        
        analytics.push({
          departmentId: dept.id,
          departmentName: dept.name,
          totalEmployees,
          activeOnboarding,
          completedOnboarding,
          completionRate: totalEmployees > 0 
            ? Math.round((completedOnboarding / totalEmployees) * 100) 
            : 0
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