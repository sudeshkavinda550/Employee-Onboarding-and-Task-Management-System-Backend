const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isHROrAdmin } = require('../middleware/roleCheck');
const Task = require('../models/Task');
const User = require('../models/User');
const { Op } = require('sequelize');
const { pool } = require('../config/database');

console.log('Analytics routes file loaded');

router.use(authenticate);
router.use(isHROrAdmin);

router.get('/dashboard/stats', async (req, res) => {
  console.log('Dashboard stats endpoint hit!');
  try {
    console.log('Using PostgreSQL pool for queries');
    
    const { rows: [{ count: totalEmployees }] } = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'employee'`
    );
    
    const { rows: [{ count: onboardingCompleted }] } = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'employee' AND onboarding_status = 'completed'`
    );
    
    const { rows: [{ count: onboardingInProgress }] } = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'employee' AND onboarding_status = 'in_progress'`
    );
    
    const { rows: [{ count: overdueTasks }] } = await pool.query(
      `SELECT COUNT(*) as count FROM employee_tasks WHERE status != 'completed' AND due_date < NOW()`
    );
    
    const completionRate = totalEmployees > 0 
      ? (onboardingCompleted / totalEmployees) * 100 
      : 0;
    
    const { rows: completedEmployees } = await pool.query(
      `SELECT created_at, onboarding_completed_date 
       FROM users 
       WHERE role = 'employee' 
       AND onboarding_status = 'completed' 
       AND onboarding_completed_date IS NOT NULL 
       AND created_at IS NOT NULL`
    );
    
    let averageCompletionDays = 0;
    if (completedEmployees.length > 0) {
      const totalDays = completedEmployees.reduce((sum, emp) => {
        const days = Math.floor(
          (new Date(emp.onboarding_completed_date) - new Date(emp.created_at)) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      averageCompletionDays = Math.round(totalDays / completedEmployees.length);
    }
    
    const stats = {
      totalEmployees: parseInt(totalEmployees),
      onboardingInProgress: parseInt(onboardingInProgress),
      onboardingCompleted: parseInt(onboardingCompleted),
      overdueTasks: parseInt(overdueTasks),
      averageCompletionDays,
      completionRate: Math.round(completionRate * 100) / 100
    };
    
    console.log('Sending stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics', error: error.message });
  }
});

router.get('/department/completion', async (req, res) => {
  console.log('Department completion endpoint hit!');
  try {
    const { rows: results } = await pool.query(`
      SELECT 
        d.name as department,
        COUNT(u.id) as total,
        SUM(CASE WHEN u.onboarding_status = 'completed' THEN 1 ELSE 0 END) as completed,
        ROUND(
          (SUM(CASE WHEN u.onboarding_status = 'completed' THEN 1 ELSE 0 END)::numeric / COUNT(u.id)::numeric) * 100,
          2
        ) as "completionRate"
      FROM users u
      JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'employee' AND u.department_id IS NOT NULL
      GROUP BY d.name
      ORDER BY "completionRate" DESC
    `);
    
    const departmentData = {
      labels: results.map(r => r.department),
      data: results.map(r => parseFloat(r.completionRate) || 0)
    };
    
    console.log('Sending department data:', departmentData);
    res.json(departmentData);
  } catch (error) {
    console.error('Error fetching department completion:', error);
    res.status(500).json({ message: 'Failed to fetch department completion data', error: error.message });
  }
});

router.get('/tasks/status-distribution', async (req, res) => {
  console.log('Task status distribution endpoint hit!');
  try {
    const { rows: [statusCounts] } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress') as "inProgress",
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) as overdue
      FROM employee_tasks
    `);
    
    const statusData = {
      completed: parseInt(statusCounts.completed) || 0,
      inProgress: parseInt(statusCounts.inProgress) || 0,
      pending: parseInt(statusCounts.pending) || 0,
      overdue: parseInt(statusCounts.overdue) || 0
    };
    
    console.log('Sending task status:', statusData);
    res.json(statusData);
  } catch (error) {
    console.error('Error fetching task status distribution:', error);
    res.status(500).json({ message: 'Failed to fetch task status distribution', error: error.message });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const overview = {
      message: 'Analytics overview endpoint'
    };
    res.json(overview);
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ message: 'Failed to fetch overview', error: error.message });
  }
});

router.get('/employees', async (req, res) => {
  try {
    const employeeAnalytics = {
      message: 'Employee analytics endpoint'
    };
    res.json(employeeAnalytics);
  } catch (error) {
    console.error('Error fetching employee analytics:', error);
    res.status(500).json({ message: 'Failed to fetch employee analytics', error: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const taskAnalytics = {
      message: 'Task analytics endpoint'
    };
    res.json(taskAnalytics);
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({ message: 'Failed to fetch task analytics', error: error.message });
  }
});

module.exports = router;