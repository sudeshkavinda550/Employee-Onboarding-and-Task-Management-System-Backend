const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Department = require('../models/Department');

router.get('/', authenticate, async (req, res) => {
  try {
    const departments = await Department.findAll();

    res.json({
      status: 'success',
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found'
      });
    }

    res.json({
      status: 'success',
      data: department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch department',
      error: error.message
    });
  }
});

router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const stats = await Department.getStats(req.params.id);
    
    if (!stats) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found'
      });
    }

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch department statistics',
      error: error.message
    });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Department name is required'
      });
    }

    const department = await Department.create({
      name,
      description,
      manager_id
    });

    res.status(201).json({
      status: 'success',
      data: department
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create department',
      error: error.message
    });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;
    
    const department = await Department.update(req.params.id, {
      name,
      description,
      manager_id
    });
    
    if (!department) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found'
      });
    }

    res.json({
      status: 'success',
      data: department
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update department',
      error: error.message
    });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Department.delete(req.params.id);

    res.json({
      status: 'success',
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete department',
      error: error.message
    });
  }
});

module.exports = router;