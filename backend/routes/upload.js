const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { parseSheetFile, extractSheetData, buildParticipantRows } = require('../services/sheetParser');

const ACCEPTED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel',           // xls
  'application/vnd.ms-excel.sheet.macroEnabled.12', // xlsm
  'text/csv',
  'text/plain',
  'text/tab-separated-values',
  'application/csv',
  'application/octet-stream', // fallback for some OS
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    const allowed = ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv', 'tsv', 'ods'];
    if (allowed.includes(ext) || ACCEPTED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`"${ext}" files are not supported. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`));
    }
  },
});

// In-memory session store for parsed upload data (keyed by uploadId)
const uploadSessions = {};

// POST /api/upload - parse an Excel/CSV file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const { workbook, sheetNames } = parseSheetFile(req.file.buffer, req.file.originalname);
    const uploadId = uuidv4();
    uploadSessions[uploadId] = { workbook, sheetNames, filename: req.file.originalname };
    res.json({ uploadId, sheetNames });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not read this file. Make sure it is a valid Excel (.xlsx) or CSV file.' });
  }
});

// POST /api/upload/:uploadId/sheet - select a sheet and get columns + rows
router.post('/:uploadId/sheet', (req, res) => {
  const session = uploadSessions[req.params.uploadId];
  if (!session) return res.status(404).json({ error: 'Upload session expired. Please re-upload the file.' });

  const sheetName = req.body.sheetName || session.sheetNames[0];
  try {
    const { columns, rows, headerRowIdx } = extractSheetData(session.workbook, sheetName);
    session.columns = columns;
    session.rows = rows;
    session.selectedSheet = sheetName;
    res.json({ columns, rowCount: rows.length, headerRowIdx, sheetName });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/upload/:uploadId/mapping - apply column mapping, returns validated participants
router.post('/:uploadId/mapping', (req, res) => {
  const session = uploadSessions[req.params.uploadId];
  if (!session || !session.rows) {
    return res.status(404).json({ error: 'Upload session expired. Please re-upload the file.' });
  }

  const { mapping } = req.body;
  if (!mapping || !mapping.emailSlug) {
    return res.status(400).json({ error: 'You must assign one column as "Email" before continuing.' });
  }

  try {
    const participants = buildParticipantRows(session.rows, session.columns, mapping);
    session.participants = participants;
    session.mapping = mapping;

    const summary = {
      total: participants.length,
      eligible: participants.filter(p => p.canSend).length,
      missingEmail: participants.filter(p => p.status === 'missing_email').length,
      invalidEmail: participants.filter(p => p.status === 'invalid_email').length,
      duplicateEmail: participants.filter(p => p.status === 'duplicate_email').length,
    };

    res.json({ participants, summary });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Expose sessions so campaign route can access participants
function getUploadSession(uploadId) {
  return uploadSessions[uploadId] || null;
}

module.exports = { router, getUploadSession };
