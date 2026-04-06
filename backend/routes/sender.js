const express = require('express');
const router = express.Router();
const { getSenderIdentity, checkConnection } = require('../services/emailService');

// GET /api/email/sender - read-only sender info (no secrets)
router.get('/sender', (req, res) => {
  res.json(getSenderIdentity());
});

// POST /api/email/check - verify SMTP connection
router.post('/check', async (req, res) => {
  const result = await checkConnection();
  res.json(result);
});

module.exports = router;
