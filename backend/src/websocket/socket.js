const { Server } = require('socket.io');
const { publishToMQTT } = require('../mqtt/subscriber');

let io = null;

function initWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on('bus:set_route', (data) => {
      // Vulnerable: no validation on bus_id, coords broadcast as-is (stored XSS on clients)
      console.log(`[WS] Custom route received for Bus ${data.bus_id}`);
      publishToMQTT(`bus/${data.bus_id}/control/route`, data.coords);
      io.emit('bus:route_update', {
        bus_id: data.bus_id,
        coords: data.coords,
        announced_by: data.announced_by || 'unknown',
      });
    });

    socket.on('bus:announce', (data) => {
      // NEW: broadcast arbitrary text from clients (XSS vector)
      const text = data.text || '';
      console.log(`[WS] Announcement from ${socket.id}: ${text}`);
      io.emit('bus:announcement', { text, from: socket.id, timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[WS] WebSocket server initialized');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initWebSocket, getIO };
