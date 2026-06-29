const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const userId = req.user.id;

  const connections = db.prepare(`
    SELECT u.id, u.username, u.share_code,
           l.latitude, l.longitude, l.accuracy, l.address, l.recorded_at
    FROM connections c
    JOIN users u ON u.id = c.connected_user_id
    LEFT JOIN locations l ON l.id = (
      SELECT id FROM locations WHERE user_id = u.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE c.user_id = ?
    ORDER BY u.username
  `).all(userId);

  res.json({ connections });
});

router.post('/connect', (req, res) => {
  const { shareCode } = req.body;
  const userId = req.user.id;

  if (!shareCode || !shareCode.trim()) {
    return res.status(400).json({ error: 'Share code is required' });
  }

  const target = db.prepare('SELECT id, username, share_code FROM users WHERE share_code = ?')
    .get(shareCode.trim().toUpperCase());

  if (!target) {
    return res.status(404).json({ error: 'No user found with that share code' });
  }
  if (target.id === userId) {
    return res.status(400).json({ error: 'You cannot connect with yourself' });
  }

  const existing = db.prepare(
    'SELECT id FROM connections WHERE user_id = ? AND connected_user_id = ?'
  ).get(userId, target.id);

  if (existing) {
    return res.status(409).json({ error: 'Already connected with this person' });
  }

  const connId1 = uuidv4();
  const connId2 = uuidv4();

  const insert = db.prepare(
    'INSERT INTO connections (id, user_id, connected_user_id) VALUES (?, ?, ?)'
  );
  insert.run(connId1, userId, target.id);
  insert.run(connId2, target.id, userId);

  res.status(201).json({
    message: `Connected with ${target.username}`,
    connection: { id: target.id, username: target.username, shareCode: target.share_code }
  });
});

router.delete('/:connectedUserId', (req, res) => {
  const userId = req.user.id;
  const { connectedUserId } = req.params;

  db.prepare(
    'DELETE FROM connections WHERE user_id = ? AND connected_user_id = ?'
  ).run(userId, connectedUserId);

  db.prepare(
    'DELETE FROM connections WHERE user_id = ? AND connected_user_id = ?'
  ).run(connectedUserId, userId);

  res.json({ message: 'Connection removed' });
});

router.get('/me', (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, share_code FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      shareCode: user.share_code
    }
  });
});

module.exports = router;
