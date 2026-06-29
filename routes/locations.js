const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/', (req, res) => {
  const { latitude, longitude, accuracy, address } = req.body;
  const userId = req.user.id;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO locations (id, user_id, latitude, longitude, accuracy, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, latitude, longitude, accuracy || null, address || null);

  res.status(201).json({
    message: 'Location shared successfully',
    location: {
      id,
      latitude,
      longitude,
      accuracy,
      address,
      recordedAt: new Date().toISOString()
    }
  });
});

router.get('/mine', (req, res) => {
  const locations = db.prepare(`
    SELECT latitude, longitude, accuracy, address, recorded_at
    FROM locations WHERE user_id = ?
    ORDER BY recorded_at DESC LIMIT 20
  `).all(req.user.id);

  res.json({ locations });
});

router.get('/connected', (req, res) => {
  const userId = req.user.id;

  const locations = db.prepare(`
    SELECT u.id AS userId, u.username,
           l.latitude, l.longitude, l.accuracy, l.address, l.recorded_at
    FROM connections c
    JOIN users u ON u.id = c.connected_user_id
    LEFT JOIN locations l ON l.id = (
      SELECT id FROM locations WHERE user_id = u.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE c.user_id = ?
  `).all(userId);

  res.json({ locations });
});

module.exports = router;
