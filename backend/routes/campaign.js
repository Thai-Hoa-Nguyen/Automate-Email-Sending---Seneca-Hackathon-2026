const express = require('express');
const router = express.Router();
const {
  getActiveCampaign,
  createCampaign,
  updateParticipantResult,
  setCampaignStatus,
  clearActiveCampaign,
  getTemplate,
} = require('../services/campaignStore');
const {
  getSenderIdentity,
  renderTemplate,
  sendOne,
  throttleIfNeeded,
  recordSend,
  buildFriendlySmtpError,
} = require('../services/emailService');

// GET /api/campaign/active - recover active campaign after refresh
router.get('/active', (req, res) => {
  const campaign = getActiveCampaign();
  res.json(campaign || null);
});

// GET /api/campaign/:id/status
router.get('/:id/status', (req, res) => {
  const campaign = getActiveCampaign();
  if (!campaign || campaign.id !== req.params.id) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }
  res.json(campaign);
});

// POST /api/campaign/start
router.post('/start', async (req, res) => {
  const { participants, template, mapping, uploadId } = req.body;

  if (!participants || !template) {
    return res.status(400).json({ error: 'Participants and template are required.' });
  }

  const checkedParticipants = participants.filter(p => p.included && p.canSend);
  if (checkedParticipants.length === 0) {
    return res.status(400).json({ error: 'No valid participants selected. Check the participants you\'ve verified.' });
  }

  const sender = getSenderIdentity();
  if (!sender.configured) {
    return res.status(400).json({ error: 'Mail is not configured. Please set up SMTP credentials.' });
  }

  let campaign;
  try {
    campaign = createCampaign({ participants, template, mapping });
  } catch (err) {
    return res.status(409).json({ error: err.message });
  }

  res.json({ campaignId: campaign.id, status: 'running', total: checkedParticipants.length });

  // Run campaign in background
  runCampaign(campaign.id, checkedParticipants, template, sender);
});

async function runCampaign(campaignId, participants, template, sender) {
  for (const participant of participants) {
    const campaign = getActiveCampaign();
    if (!campaign || campaign.id !== campaignId || campaign.status !== 'running') {
      break;
    }

    try {
      await throttleIfNeeded();

      const { renderedSubject, renderedBody } = renderTemplate(
        template.subject,
        template.bodyHtmlOrText,
        participant
      );

      await sendOne({
        to: participant.emailRaw || participant.email,
        subject: renderedSubject,
        htmlBody: renderedBody,
        fromFormatted: sender.fromFormatted,
        replyTo: sender.replyTo,
      });

      recordSend();
      updateParticipantResult(campaignId, participant.rowId, 'sent', null);
    } catch (err) {
      const friendly = buildFriendlySmtpError(err);
      updateParticipantResult(campaignId, participant.rowId, 'failed', friendly);
    }
  }

  const finalCampaign = getActiveCampaign();
  if (finalCampaign && finalCampaign.id === campaignId && finalCampaign.status === 'running') {
    setCampaignStatus(campaignId, 'completed');
  }
}

// POST /api/campaign/:id/stop - Emergency Stop
router.post('/:id/stop', (req, res) => {
  const campaign = getActiveCampaign();
  if (!campaign || campaign.id !== req.params.id) {
    return res.status(404).json({ error: 'Campaign not found.' });
  }
  setCampaignStatus(req.params.id, 'stopped');
  res.json({ ok: true, status: 'stopped' });
});

// DELETE /api/campaign/clear - clear finished campaign so a new one can start
router.delete('/clear', (req, res) => {
  clearActiveCampaign();
  res.json({ ok: true });
});

// POST /api/send/test - send a single test email; no campaign effects
router.post('/test-send', async (req, res) => {
  const { to, subject, bodyHtmlOrText, sampleParticipant } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'A "Deliver to" address and subject line are required.' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.trim())) {
    return res.status(400).json({ error: `"${to}" doesn't look like a valid email address.` });
  }

  const sender = getSenderIdentity();
  if (!sender.configured) {
    return res.status(400).json({ error: 'Mail is not configured. Please set up SMTP credentials.' });
  }

  try {
    const participant = sampleParticipant || {
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      displayName: 'Test',
      email: to.trim(),
      emailRaw: to.trim(),
      id: '12345',
      allFields: {},
    };

    const { renderedSubject, renderedBody } = renderTemplate(subject, bodyHtmlOrText, participant);

    await sendOne({
      to: to.trim(),
      subject: renderedSubject,
      htmlBody: renderedBody,
      fromFormatted: sender.fromFormatted,
      replyTo: sender.replyTo,
    });

    res.json({ ok: true, message: 'Test email sent — check your inbox.' });
  } catch (err) {
    res.status(500).json({ error: buildFriendlySmtpError(err) });
  }
});

module.exports = router;
