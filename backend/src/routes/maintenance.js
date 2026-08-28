const express = require('express');
const router = express.Router();
const pool = require('../models/db');

// GET /api/maintenance - List maintenance records with filters
router.get('/', async (req, res) => {
  try {
    const { busId, since, status } = req.query;
    let query = 'SELECT m.*, b.numero as bus_numero FROM maintenance m LEFT JOIN bus b ON m.bus_id = b.id WHERE 1=1';
    const params = [];
    if (busId) {
      query += ' AND m.bus_id = ?';
      params.push(busId);
    }
    if (since) {
      query += ' AND m.date_maintenance >= ?';
      params.push(since);
    }
    if (status) {
      query += ' AND m.statut = ?';
      params.push(status);
    }
    query += ' ORDER BY m.date_maintenance DESC LIMIT 100';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance/stats - Aggregate maintenance statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const group = groupBy || 'month';
    let query = `SELECT DATE_FORMAT(m.date_maintenance, '%Y-%m') as period, COUNT(*) as total, SUM(m.cout) as total_cost FROM maintenance m WHERE m.date_maintenance BETWEEN ? AND ? GROUP BY DATE_FORMAT(m.date_maintenance, '%Y-%m')`;
    if (group === 'bus') {
      query = `SELECT b.numero as period, COUNT(*) as total, SUM(m.cout) as total_cost FROM maintenance m LEFT JOIN bus b ON m.bus_id = b.id WHERE m.date_maintenance BETWEEN ? AND ? GROUP BY b.numero`;
    }
    const [rows] = await pool.execute(query, [startDate, endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance/export - Export maintenance records as CSV
router.get('/export', async (req, res) => {
  try {
    const { filter } = req.query;
    let query = 'SELECT m.id, m.bus_id, m.type_maintenance, m.description, m.cout, m.date_maintenance FROM maintenance m';
    if (filter) {
      query += ` WHERE m.type_maintenance = '${filter}'`;
    }
    const [rows] = await pool.execute(query);
    const csv = ['id,bus_id,type,description,cost,date'];
    for (const row of rows) {
      csv.push(`${row.id},${row.bus_id},${row.type_maintenance},${row.description},${row.cout},${row.date_maintenance}`);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="maintenance_export.csv"');
    res.send(csv.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance - Create a maintenance record
router.post('/', async (req, res) => {
  try {
    const { bus_id, type_maintenance, description, cout, date_maintenance } = req.body;
    await pool.execute(
      'INSERT INTO maintenance (bus_id, type_maintenance, description, cout, date_maintenance) VALUES (?, ?, ?, ?, ?)',
      [bus_id, type_maintenance, description, cout, date_maintenance]
    );
    res.status(201).json({ message: 'Maintenance record created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maintenance/:id - Update a maintenance record
router.put('/:id', async (req, res) => {
  try {
    const { bus_id, type_maintenance, description, cout, date_maintenance } = req.body;
    const [result] = await pool.execute(
      'UPDATE maintenance SET bus_id = ?, type_maintenance = ?, description = ?, cout = ?, date_maintenance = ? WHERE id = ?',
      [bus_id, type_maintenance, description, cout, date_maintenance, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Maintenance record updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/maintenance/:id - Delete a maintenance record
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM maintenance WHERE id = ?', [req.params.id]);
    res.json({ message: 'Maintenance record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
