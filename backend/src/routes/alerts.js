const express = require('express');
const router = express.Router();
const pool = require('../models/db');

// GET /api/alerts - List all alerts
router.get('/', async (req, res) => {
  try {
    const { resolved } = req.query;
    let query = 'SELECT a.*, b.numero as bus_numero FROM alertes a LEFT JOIN bus b ON a.bus_id = b.id';
    if (resolved !== undefined) {
      query += ' WHERE a.resolved = ?';
    }
    query += ' ORDER BY a.created_at DESC LIMIT 100';
    const params = resolved !== undefined ? [resolved === 'true' ? 1 : 0] : [];
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:id/resolve - Resolve an alert
router.put('/:id/resolve', async (req, res) => {
  try {
    await pool.execute('UPDATE alertes SET resolved = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// POST /api/alerts - Create a new alert
router.post('/', async (req, res) => {
  try {
    const { bus_id, type, message, severity } = req.body;
    if (!bus_id || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields: bus_id, type, message' });
    }
    const [result] = await pool.execute(
      'INSERT INTO alertes (bus_id, type, message, severity) VALUES (?, ?, ?, ?)',
      [bus_id, type, message, severity || 'info']
    );
    res.status(201).json({ id: result.insertId, message: 'Alert created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts/stats - Get alert statistics
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT severity, COUNT(*) as count FROM alertes WHERE resolved = FALSE GROUP BY severity'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
