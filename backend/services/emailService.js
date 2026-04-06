const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getTransporter() {
  if (!transporter) transporter = createTransporter();
  return transporter;
}

function getSenderIdentity() {
  const user = process.env.SMTP_USER || '';
  const name = process.env.SMTP_FROM_NAME || '';
  const replyTo = process.env.SMTP_REPLY_TO || '';
  const domain = user.includes('@') ? user.split('@')[1] : null;

  if (!user) return { configured: false, error: 'Mail not configured — contact admin.' };

  return {
    configured: true,
    fromEmail: user,
    fromName: name || null,
    domain,
    replyTo: replyTo || null,
    fromFormatted: name ? `${name} <${user}>` : user,
  };
}

async function checkConnection() {
  try {
    const t = getTransporter();
    await t.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: buildFriendlySmtpError(err),
    };
  }
}

function buildFriendlySmtpError(err) {
  const msg = err.message || '';
  if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
    return 'Cannot reach Gmail. Check your internet connection.';
  }
  if (msg.includes('535') || msg.includes('Username and Password') || msg.includes('Invalid credentials')) {
    return 'Wrong email or password. Make sure you\'re using a Gmail App Password, not your regular password.';
  }
  if (msg.includes('534') || msg.includes('less secure')) {
    return 'Gmail is blocking the connection. Enable 2-Step Verification and use an App Password.';
  }
  if (msg.includes('ETIMEDOUT')) {
    return 'Connection timed out. Gmail may be temporarily unreachable.';
  }
  return `Could not connect to Gmail: ${msg}`;
}

/** Render a template body+subject with merge fields from a participant row */
function renderTemplate(subject, body, participant) {
  const mergeData = {
    firstName: participant.firstName || '',
    lastName: participant.lastName || '',
    fullName: participant.fullName || '',
    email: participant.emailRaw || participant.email || '',
    id: participant.id || '',
    displayName: participant.displayName || '',
    ...participant.allFields,
  };

  // Greeting fallback
  const greeting = participant.displayName || 'Hello';
  mergeData.greeting = greeting;

  function replacer(text) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return mergeData[key] !== undefined ? mergeData[key] : `{{${key}}}`;
    });
  }

  return {
    renderedSubject: replacer(subject),
    renderedBody: replacer(body),
  };
}

/** Send a single email (used by test send and campaign loop) */
async function sendOne({ to, subject, htmlBody, fromFormatted, replyTo }) {
  const t = getTransporter();
  const mailOptions = {
    from: fromFormatted,
    to,
    subject,
    html: htmlBody,
    text: htmlBody.replace(/<[^>]*>/g, ''),
  };
  if (replyTo) mailOptions.replyTo = replyTo;
  await t.sendMail(mailOptions);
}

// Rate limiting: max 30 per minute = 2000ms minimum gap per batch of 10
// We implement a simple token bucket: track send times in a ring buffer
const SEND_HISTORY = [];
const MAX_PER_MINUTE = 30;

function recordSend() {
  SEND_HISTORY.push(Date.now());
  if (SEND_HISTORY.length > MAX_PER_MINUTE * 2) SEND_HISTORY.shift();
}

async function throttleIfNeeded() {
  const now = Date.now();
  const windowStart = now - 60000;
  const recentSends = SEND_HISTORY.filter(t => t > windowStart);
  if (recentSends.length >= MAX_PER_MINUTE) {
    const oldest = recentSends[0];
    const waitMs = oldest + 60000 - now + 100;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  getSenderIdentity,
  checkConnection,
  renderTemplate,
  sendOne,
  throttleIfNeeded,
  recordSend,
  buildFriendlySmtpError,
};
