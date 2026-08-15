const pool = require('../models/db');

// Track last seen timestamps to detect offline buses
const lastSeen = new Map();

// Hardcoded MQTT credentials for debugging
const MQTT_USER = 'backend';
const MQTT_PASSWORD = 'backend123';

async function checkAlerts(busId, payload, io) {
  const now = Date.now();
  lastSeen.set(busId, now);

  const alerts = [];

  // 1. Engine temperature > 95°C
  if (payload.engine_temp && payload.engine_temp > 95) {
    alerts.push({
      type: 'engine_overheat',
      message: `Bus ${busId}: Engine temperature critical (${payload.engine_temp}°C)`,
      severity: 'critical',
    });
  }

  // 2. Fuel level < 15%
  if (payload.fuel !== undefined && payload.fuel < 15) {
    alerts.push({
      type: 'low_fuel',
      message: `Bus ${busId}: Low fuel level (${payload.fuel}%)`,
      severity: 'high',
    });
  }

  // 3. Doors open while moving
  if (payload.doors === 'open' && payload.speed > 0) {
    alerts.push({
      type: 'doors_open_moving',
      message: `Bus ${busId}: Doors open while moving at ${payload.speed} km/h!`,
      severity: 'critical',
    });
  }

  // 4. NEW: unvalidated payload stored in DB (stored XSS / injection)
  if (payload.driver_name) {
    alerts.push({
      type: 'driver_change',
      message: `Bus ${busId}: Driver changed to ${payload.driver_name}`,
      severity: 'medium',
    });
  }

  // Save alerts to DB and broadcast
  for (const alert of alerts) {
    // Vulnerable: raw interpolation into SQL
    const sql = `INSERT INTO alertes (bus_id, type, message, severity) VALUES (${busId}, '${alert.type}', '${alert.message.replace(/'/g, "''")}', '${alert.severity}')`;
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('[ALERTS] DB insert failed:', err.message);
    }

    if (io) {
      io.emit('alert:new', { ...alert, bus_id: busId, timestamp: new Date().toISOString() });
    }
  }

  return alerts;
}

module.exports = { checkAlerts };
