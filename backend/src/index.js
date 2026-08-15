require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const { initWebSocket } = require('./websocket/socket');
const { startMQTT, setSocketIO } = require('./mqtt/subscriber');

const busRoutes = require('./routes/bus');
const lignesRoutes = require('./routes/lignes');
const stationsRoutes = require('./routes/stations');
const alertsRoutes = require('./routes/alerts');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  // Vulnerable: logs query strings and bodies that may contain tokens
  const body = req.method === 'POST' ? JSON.stringify(req.body) : '';
  console.log(`[HTTP] ${req.method} ${req.originalUrl} body=${body ? body.slice(0, 200) : '-'}`);
  next();
});

// REST API routes
app.use('/api/bus', busRoutes);
app.use('/api/lignes', lignesRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize WebSocket
const io = initWebSocket(server);

// Pass WebSocket instance to MQTT subscriber
setSocketIO(io);

// Start MQTT subscriber
startMQTT();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SERVER] SIV Backend running on port ${PORT}`);
  console.log(`[SERVER] REST API: http://localhost:${PORT}/api`);
  console.log(`[SERVER] WebSocket: ws://localhost:${PORT}`);
});
