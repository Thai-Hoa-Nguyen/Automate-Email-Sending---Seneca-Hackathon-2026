const XLSX = require('xlsx');

// Synonyms for heuristic role detection
const EMAIL_SYNONYMS = [
  'email', 'e-mail', 'email address', 'student email', 'emailaddress', 'mail', 'e mail',
  'gmail', 'g-mail', 'google mail', 'email id', 'email_address', 'emailid',
  'contact email', 'school email', 'work email', 'personal email',
];
const FIRST_NAME_SYNONYMS = ['first name', 'firstname', 'first', 'given name', 'givenname', 'preferred name', 'preferredname', 'forename'];
const LAST_NAME_SYNONYMS = ['last name', 'lastname', 'last', 'surname', 'family name', 'familyname'];
const FULL_NAME_SYNONYMS = ['full name', 'fullname', 'name', 'student name', 'studentname'];
const ID_SYNONYMS = ['id', 'student id', 'studentid', 'emplid', 'netid', 'net id', 'student number', 'student_id', 'sid'];

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'column';
}

function normalizeHeader(header) {
  return String(header || '').trim().toLowerCase();
}

function detectRole(header, samples) {
  const h = normalizeHeader(header);
  if (EMAIL_SYNONYMS.includes(h)) return { role: 'email', confidence: 'high' };
  if (FIRST_NAME_SYNONYMS.includes(h)) return { role: 'firstName', confidence: 'high' };
  if (LAST_NAME_SYNONYMS.includes(h)) return { role: 'lastName', confidence: 'high' };
  if (FULL_NAME_SYNONYMS.includes(h)) return { role: 'fullName', confidence: 'high' };
  if (ID_SYNONYMS.includes(h)) return { role: 'id', confidence: 'high' };

  // Partial match
  if (h.includes('email') || h.includes('e-mail') || h.includes('gmail') || h.includes('mail')) return { role: 'email', confidence: 'likely' };
  if (h.includes('first')) return { role: 'firstName', confidence: 'likely' };
  if (h.includes('last') || h.includes('surname')) return { role: 'lastName', confidence: 'likely' };
  if (h.includes('name')) return { role: 'fullName', confidence: 'likely' };
  if (h.includes(' id') || h.endsWith('id') || h.includes('number')) return { role: 'id', confidence: 'likely' };

  // Sample value heuristic for email
  const emailSamples = (samples || []).filter(s => s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s).trim()));
  if (emailSamples.length > 0 && emailSamples.length >= Math.ceil((samples || []).length * 0.5)) {
    return { role: 'email', confidence: 'likely' };
  }

  return { role: 'passthrough', confidence: 'low' };
}

const SUPPORTED_EXTENSIONS = ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv', 'tsv', 'ods'];

function parseSheetFile(buffer, filename) {
  const ext = filename.toLowerCase().split('.').pop();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `"${ext}" files are not supported. Please upload an Excel spreadsheet (.xlsx, .xls) or a CSV file (.csv).`
    );
  }

  // SheetJS handles all formats uniformly
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    // For CSV: use raw string parsing so we get text, not type-coerced values
    raw: false,
  });

  const sheetNames = workbook.SheetNames;

  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('This file appears to be empty. Please check the file and try again.');
  }

  return { workbook, sheetNames };
}

function extractSheetData(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found.`);

  // Convert to array of arrays (AOA) — raw strings
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,       // all values as formatted strings
    defval: '',       // empty cells become ''
    blankrows: false, // skip fully blank rows
  });

  const allRows = aoa.map(row =>
    row.map(v => (v === null || v === undefined ? '' : String(v).trim()))
  );

  if (allRows.length < 2) {
    throw new Error('This sheet appears to be empty or has only one row. Please check the file.');
  }

  // Detect header row (first row with multiple non-empty cells)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, allRows.length); i++) {
    const nonEmpty = allRows[i].filter(v => v !== '').length;
    if (nonEmpty >= 2) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = allRows[headerRowIdx];
  const dataRows = allRows.slice(headerRowIdx + 1);

  // Build column inventory
  const seenSlugs = {};
  const columns = headers.map((label, idx) => {
    let baseSlug = slugify(label || `column_${idx + 1}`);
    let slug = baseSlug;
    let counter = 2;
    while (seenSlugs[slug]) {
      slug = `${baseSlug}_${counter++}`;
    }
    seenSlugs[slug] = true;

    const samples = dataRows.slice(0, 5).map(r => r[idx] || '').filter(v => v !== '');
    const { role, confidence } = detectRole(label, samples);

    return {
      index: idx,
      headerLabel: label || `(empty column ${idx + 1})`,
      fieldSlug: slug,
      role,
      confidence,
      samples,
    };
  });

  // Build structured rows
  const rows = dataRows.map((raw, rowIdx) => {
    const fields = {};
    columns.forEach((col) => {
      fields[col.fieldSlug] = raw[col.index] || '';
    });
    return { rowIdx, fields };
  });

  return { columns, rows, headerRowIdx };
}

function buildParticipantRows(rows, columns, mapping) {
  // mapping: { emailSlug, firstNameSlug?, lastNameSlug?, fullNameSlug?, idSlug?, extra: [] }
  const normalizeEmail = (e) => String(e || '').trim().toLowerCase();
  const seenEmails = new Set();

  return rows.map((row, idx) => {
    const emailRaw = row.fields[mapping.emailSlug] || '';
    const emailNorm = normalizeEmail(emailRaw);
    const firstName = mapping.firstNameSlug ? (row.fields[mapping.firstNameSlug] || '') : '';
    const lastName = mapping.lastNameSlug ? (row.fields[mapping.lastNameSlug] || '') : '';
    const fullName = mapping.fullNameSlug ? (row.fields[mapping.fullNameSlug] || '') : (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
    const id = mapping.idSlug ? (row.fields[mapping.idSlug] || '') : '';

    let status, canSend, errorReason;

    if (!emailRaw) {
      status = 'missing_email';
      canSend = false;
      errorReason = 'No email address in this row. Fix the spreadsheet and re-upload.';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailNorm)) {
      status = 'invalid_email';
      canSend = false;
      errorReason = `"${emailRaw}" doesn't look like a valid email address.`;
    } else if (seenEmails.has(emailNorm)) {
      status = 'duplicate_email';
      canSend = false;
      errorReason = `This email (${emailRaw}) already appears earlier in the list. Only the first row will be sent.`;
    } else {
      seenEmails.add(emailNorm);
      status = 'ready';
      canSend = true;
      errorReason = null;
    }

    // Build greeting name
    let displayName;
    if (firstName) displayName = firstName;
    else if (fullName) displayName = fullName;
    else if (lastName) displayName = lastName;
    else displayName = null;

    return {
      rowId: `row_${idx}`,
      rowIdx: idx,
      email: emailNorm,
      emailRaw,
      firstName,
      lastName,
      fullName,
      displayName,
      id,
      allFields: row.fields,
      status,
      canSend,
      errorReason,
      included: false,
      result: null,
      errorMessage: null,
      duplicateOfRowId: null,
    };
  });
}

module.exports = { parseSheetFile, extractSheetData, buildParticipantRows, slugify };
