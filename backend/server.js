require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const senderRoutes = require('./routes/sender');
const { router: uploadRouter } = require('./routes/upload');
const templateRoutes = require('./routes/templates');
const campaignRoutes = require('./routes/campaign');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/email', senderRoutes);
app.use('/api/upload', uploadRouter);
app.use('/api/templates', templateRoutes);
app.use('/api/campaign', campaignRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built React frontend from ../frontend/dist
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));
// For any non-API route, send index.html (React handles routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅  App running — open http://localhost:${PORT}`);
  console.log(`   Sender: ${process.env.SMTP_USER || '⚠️  SMTP_USER not set in .env'}`);
  console.log(`   Press Ctrl+C to stop.\n`);
});
