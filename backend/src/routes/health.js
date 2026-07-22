const express = require('express');
const router = express.Router();
const pool = require('../models/db');

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

module.exports = router;
