const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CAMPAIGN_FILE = path.join(DATA_DIR, 'campaign.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Campaign persistence ──────────────────────────────────────────────────────

function readCampaignFile() {
  ensureDataDir();
  if (!fs.existsSync(CAMPAIGN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CAMPAIGN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeCampaignFile(data) {
  ensureDataDir();
  fs.writeFileSync(CAMPAIGN_FILE, JSON.stringify(data, null, 2));
}

// In-memory ref so active campaign loop can read state
let _activeCampaign = readCampaignFile();

function getActiveCampaign() {
  return _activeCampaign;
}

function createCampaign({ participants, template, mapping }) {
  if (_activeCampaign && _activeCampaign.status === 'running') {
    throw new Error('A campaign is already running. Stop it before starting a new one.');
  }

  const campaign = {
    id: uuidv4(),
    status: 'running',
    createdAt: new Date().toISOString(),
    template: {
      id: template.id,
      name: template.name,
      subject: template.subject,
      bodyHtmlOrText: template.bodyHtmlOrText,
    },
    mapping,
    participants: participants.map(p => ({
      ...p,
      result: p.result || null,
      errorMessage: p.errorMessage || null,
    })),
    summary: buildSummary(participants),
    lastUpdatedAt: new Date().toISOString(),
  };

  _activeCampaign = campaign;
  writeCampaignFile(campaign);
  return campaign;
}

function updateParticipantResult(campaignId, rowId, result, errorMessage) {
  if (!_activeCampaign || _activeCampaign.id !== campaignId) return;
  const p = _activeCampaign.participants.find(p => p.rowId === rowId);
  if (p) {
    p.result = result;
    p.errorMessage = errorMessage || null;
    if (result === 'sent') p.status = 'sent';
    if (result === 'failed') p.status = 'failed';
  }
  _activeCampaign.summary = buildSummary(_activeCampaign.participants);
  _activeCampaign.lastUpdatedAt = new Date().toISOString();
  writeCampaignFile(_activeCampaign);
}

function setCampaignStatus(campaignId, status) {
  if (!_activeCampaign || _activeCampaign.id !== campaignId) return;
  _activeCampaign.status = status;
  _activeCampaign.lastUpdatedAt = new Date().toISOString();
  writeCampaignFile(_activeCampaign);
}

function clearActiveCampaign() {
  _activeCampaign = null;
  if (fs.existsSync(CAMPAIGN_FILE)) fs.unlinkSync(CAMPAIGN_FILE);
}

function buildSummary(participants) {
  const included = participants.filter(p => p.included);
  const sent = participants.filter(p => p.result === 'sent').length;
  const failed = participants.filter(p => p.result === 'failed').length;
  const skipped = participants.filter(p => p.status === 'duplicate_email' || p.status === 'missing_email' || p.status === 'invalid_email').length;
  const total = included.length;
  const remaining = total - sent - failed;

  return { total, sent, failed, skipped, remaining, lastUpdatedAt: new Date().toISOString() };
}

// ── Template persistence ──────────────────────────────────────────────────────

function readTemplates() {
  ensureDataDir();
  if (!fs.existsSync(TEMPLATES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeTemplates(templates) {
  ensureDataDir();
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
}

function listTemplates() {
  return readTemplates();
}

function getTemplate(id) {
  return readTemplates().find(t => t.id === id) || null;
}

function saveTemplate({ id, name, subject, bodyHtmlOrText, bodySource }) {
  const templates = readTemplates();
  const existing = templates.findIndex(t => t.id === id);
  const record = {
    id: id || uuidv4(),
    name: name || 'Untitled',
    subject: subject || '',
    bodyHtmlOrText: bodyHtmlOrText || '',
    bodySource: bodySource || 'app',
    updatedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    templates[existing] = record;
  } else {
    record.id = record.id || uuidv4();
    templates.push(record);
  }
  writeTemplates(templates);
  return record;
}

function deleteTemplate(id) {
  const templates = readTemplates().filter(t => t.id !== id);
  writeTemplates(templates);
}

module.exports = {
  getActiveCampaign,
  createCampaign,
  updateParticipantResult,
  setCampaignStatus,
  clearActiveCampaign,
  listTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
};
