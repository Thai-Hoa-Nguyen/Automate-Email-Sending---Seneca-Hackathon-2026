const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { listTemplates, getTemplate, saveTemplate, deleteTemplate } = require('../services/campaignStore');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/templates - list all saved templates
router.get('/', (req, res) => {
  res.json(listTemplates());
});

// GET /api/templates/:id
router.get('/:id', (req, res) => {
  const t = getTemplate(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found.' });
  res.json(t);
});

// POST /api/templates - create or update
router.post('/', (req, res) => {
  const { id, name, subject, bodyHtmlOrText, bodySource } = req.body;
  if (!name) return res.status(400).json({ error: 'Template name is required.' });
  const saved = saveTemplate({ id, name, subject, bodyHtmlOrText, bodySource: bodySource || 'app' });
  res.json(saved);
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  deleteTemplate(req.params.id);
  res.json({ ok: true });
});

// POST /api/templates/import/docx - convert .docx → HTML
router.post('/import/docx', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
    const html = result.value;
    const warnings = result.messages.map(m => m.message);
    res.json({ html, warnings });
  } catch (err) {
    res.status(400).json({ error: 'Could not read this Word file. Make sure it is a valid .docx file.' });
  }
});

// POST /api/templates/import/txt - read plain text → wrap as basic HTML
router.post('/import/txt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const text = req.file.buffer.toString('utf8');
    // Convert line breaks to <br> and wrap paragraphs
    const html = text
      .split(/\n\n+/)
      .map(para => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
      .join('\n');
    res.json({ html });
  } catch (err) {
    res.status(400).json({ error: 'Could not read this text file.' });
  }
});

module.exports = router;
