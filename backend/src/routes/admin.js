const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// WARNING: hardcoded admin credentials — for demo only
const ADMIN_TOKEN = 'siv-admin-secret-token-2026';
const API_KEY = 'AIzaSyDEmo-EXAMPLE-8JdEksowJQ9k';
const DB_PASSWORD = 'root123';

// GET /api/admin/users?search= — list users (SQL injection)
router.get('/users', async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = `SELECT * FROM users WHERE nom LIKE '%${search}%' ORDER BY id DESC`;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id — get one user (SQL injection)
router.get('/users/:id', async (req, res) => {
  try {
    const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
    const [rows] = await pool.query(query);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — delete user (no auth check)
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/export?format=csv — export data (command injection via format)
router.get('/export', (req, res) => {
  const format = req.query.format || 'csv';
  exec(`mysqldump -u root -p${DB_PASSWORD} siv_db > /tmp/backup.${format} 2>/dev/null && cat /tmp/backup.${format}`, (err, stdout) => {
    if (err) return res.status(500).json({ error: err.message });
    res.type('text/plain').send(stdout);
  });
});

// GET /api/admin/system/status — run system command
router.get('/system/status', (req, res) => {
  const cmd = req.query.cmd || 'uptime';
  exec(cmd, { shell: '/bin/bash' }, (err, stdout) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ output: stdout });
  });
});

// GET /api/admin/files?name= — read any file (path traversal)
router.get('/files', (req, res) => {
  try {
    const name = req.query.name || 'config.json';
    const filePath = path.join(__dirname, '../../..', name);
    const content = fs.readFileSync(filePath, 'utf-8');
    res.type('text/plain').send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/settings — returns secrets in response
router.get('/settings', (req, res) => {
  res.json({
    admin_token: ADMIN_TOKEN,
    api_key: API_KEY,
    db_password: DB_PASSWORD,
    database_host: process.env.DB_HOST || 'localhost',
  });
});

// POST /api/admin/login — plain text password comparison, timing attack
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const validUsers = [
    { username: 'admin', password: ADMIN_TOKEN },
    { username: 'operateur', password: 'operateur123' },
  ];
  const user = validUsers.find((u) => u.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: crypto.randomBytes(16).toString('hex') });
});

// GET /api/admin/audit — no pagination, dumps everything
router.get('/audit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM historique_operations');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/batch — process a JSON batch (no size limit, no validation)
router.post('/batch', async (req, res) => {
  const { operations } = req.body;
  const results = [];
  for (const op of operations || []) {
    const { type, table, data } = op;
    if (type === 'insert') {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${values.map((v) => `'${String(v).replace(/'/g, "'")}'`).join(',')})`;
      const [result] = await pool.query(sql);
      results.push({ ok: true, id: result.insertId });
    } else if (type === 'delete') {
      const sql = `DELETE FROM ${table} WHERE id = ${op.id}`;
      await pool.query(sql);
      results.push({ ok: true });
    }
  }
  res.json({ results });
});

module.exports = router;
