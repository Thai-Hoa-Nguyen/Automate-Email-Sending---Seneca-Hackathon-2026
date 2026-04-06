import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, ChevronRight, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { api } from '../hooks/useApi.js';

const ROLE_OPTIONS = [
  { value: 'email', label: 'Email address' },
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'fullName', label: 'Full name' },
  { value: 'id', label: 'Student ID' },
  { value: 'passthrough', label: 'Keep as merge field only' },
  { value: 'ignore', label: 'Ignore this column' },
];

const CONFIDENCE_LABEL = { high: '✓ ', likely: '~ ', low: '' };
const CONFIDENCE_COLOR = { high: '#16a34a', likely: '#d97706', low: '#6b7280' };

export default function Step1Upload({ onComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null); // { uploadId, sheetNames, selectedSheet, columns, rowCount }
  const [columns, setColumns] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [mapping, setMapping] = useState({});
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setUploading(true);
    setSession(null);
    setColumns([]);
    try {
      const { uploadId, sheetNames } = await api.uploadFile('/upload', file);
      const sheet = sheetNames[0];
      setSelectedSheet(sheet);
      const result = await api.post(`/upload/${uploadId}/sheet`, { sheetName: sheet });
      setSession({ uploadId, sheetNames, selectedSheet: sheet, rowCount: result.rowCount });
      initColumns(result.columns);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function initColumns(cols) {
    setColumns(cols);
    const m = { extra: [] };
    cols.forEach(c => {
      if (c.role === 'email' && !m.emailSlug) m.emailSlug = c.fieldSlug;
      else if (c.role === 'firstName' && !m.firstNameSlug) m.firstNameSlug = c.fieldSlug;
      else if (c.role === 'lastName' && !m.lastNameSlug) m.lastNameSlug = c.fieldSlug;
      else if (c.role === 'fullName' && !m.fullNameSlug) m.fullNameSlug = c.fieldSlug;
      else if (c.role === 'id' && !m.idSlug) m.idSlug = c.fieldSlug;
    });
    setMapping(m);
  }

  async function handleSheetChange(sheetName) {
    if (!session) return;
    setSelectedSheet(sheetName);
    setError(null);
    try {
      const result = await api.post(`/upload/${session.uploadId}/sheet`, { sheetName });
      setSession(s => ({ ...s, selectedSheet: sheetName, rowCount: result.rowCount }));
      initColumns(result.columns);
    } catch (e) {
      setError(e.message);
    }
  }

  function setColumnRole(fieldSlug, newRole) {
    setMapping(prev => {
      const next = { ...prev };
      // Clear old binding for this slug from built-in roles
      if (next.emailSlug === fieldSlug) delete next.emailSlug;
      if (next.firstNameSlug === fieldSlug) delete next.firstNameSlug;
      if (next.lastNameSlug === fieldSlug) delete next.lastNameSlug;
      if (next.fullNameSlug === fieldSlug) delete next.fullNameSlug;
      if (next.idSlug === fieldSlug) delete next.idSlug;

      if (newRole === 'email') next.emailSlug = fieldSlug;
      else if (newRole === 'firstName') next.firstNameSlug = fieldSlug;
      else if (newRole === 'lastName') next.lastNameSlug = fieldSlug;
      else if (newRole === 'fullName') next.fullNameSlug = fieldSlug;
      else if (newRole === 'id') next.idSlug = fieldSlug;
      // passthrough/ignore: just remove from built-in slots

      return next;
    });
  }

  function getRoleForColumn(fieldSlug) {
    if (mapping.emailSlug === fieldSlug) return 'email';
    if (mapping.firstNameSlug === fieldSlug) return 'firstName';
    if (mapping.lastNameSlug === fieldSlug) return 'lastName';
    if (mapping.fullNameSlug === fieldSlug) return 'fullName';
    if (mapping.idSlug === fieldSlug) return 'id';
    return 'passthrough';
  }

  async function handleConfirm() {
    if (!mapping.emailSlug) {
      setError('Please assign one column as "Email address" before continuing.');
      return;
    }
    setError(null);
    setConfirming(true);
    try {
      const { participants, summary } = await api.post(`/upload/${session.uploadId}/mapping`, { mapping });
      onComplete({ uploadId: session.uploadId, participants, summary, columns, mapping });
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  }

  const emailAssigned = !!mapping.emailSlug;
  const emailCount = columns.filter(c => getRoleForColumn(c.fieldSlug) === 'email').length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      <h2 className="section-title">Step 1: Upload your spreadsheet</h2>
      <p className="section-desc mt-1">
        Upload the Excel or CSV file from IT. The app will read every column automatically — you just confirm which one is the email address.
      </p>

      {!session && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          style={{
            marginTop: 24,
            border: `2px dashed ${dragOver ? '#2563eb' : '#d1d5db'}`,
            borderRadius: 12,
            padding: '48px 32px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? '#eff6ff' : '#fafafa',
            transition: 'all .15s',
          }}
        >
          <FileSpreadsheet size={40} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
          {uploading ? (
            <p style={{ color: '#6b7280' }}>Reading your file…</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, color: '#374151' }}>Drop your file here, or click to choose</p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Supports .xlsx, .xls, .xlsm, .csv, .tsv, and .ods</p>
            </>
          )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,.ods" style={{ display: 'none' }}
              onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}

      {error && (
        <div className="alert alert-red mt-4">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {session && (
        <div className="mt-6">
          {/* Sheet picker */}
          {session.sheetNames.length > 1 && (
            <div className="mb-4">
              <label>Which sheet contains your participants?</label>
              <select value={selectedSheet} onChange={e => handleSheetChange(e.target.value)} style={{ width: 'auto', marginTop: 4 }}>
                {session.sheetNames.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Column mapping */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="section-title" style={{ fontSize: 15 }}>What we found in your file</p>
                  <p className="section-desc">{columns.length} columns · {session.rowCount} rows</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSession(null); setColumns([]); }}>
                  <Upload size={13} /> Use a different file
                </button>
              </div>

              {!emailAssigned && (
                <div className="alert alert-amber mt-3">
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Please assign exactly one column as <strong>Email address</strong> before continuing.</span>
                </div>
              )}
              {emailCount > 1 && (
                <div className="alert alert-red mt-3">
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>More than one column is set as "Email address". Please keep only one.</span>
                </div>
              )}
            </div>

            <div className="table-scroll" style={{ maxHeight: 360 }}>
              <table>
                <thead>
                  <tr>
                    <th>Column name</th>
                    <th>Sample values</th>
                    <th>Role in emails</th>
                    <th>Merge token</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map(col => {
                    const currentRole = getRoleForColumn(col.fieldSlug);
                    return (
                      <tr key={col.fieldSlug}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{col.headerLabel}</div>
                          <div style={{
                            fontSize: 11,
                            color: CONFIDENCE_COLOR[col.confidence],
                            marginTop: 2,
                          }}>
                            {CONFIDENCE_LABEL[col.confidence]}
                            {col.confidence === 'high' ? 'Detected automatically' : col.confidence === 'likely' ? 'Likely match — please confirm' : 'Not recognised'}
                          </div>
                        </td>
                        <td style={{ color: '#6b7280', fontSize: 12 }}>
                          {col.samples.slice(0, 5).join(', ') || '(empty)'}
                        </td>
                        <td>
                          <select
                            value={currentRole}
                            onChange={e => setColumnRole(col.fieldSlug, e.target.value)}
                            style={{ width: 'auto', fontSize: 13 }}
                          >
                            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>
                          {currentRole !== 'ignore' ? `{{${col.fieldSlug}}}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                disabled={!emailAssigned || emailCount > 1 || confirming}
                onClick={handleConfirm}
              >
                {confirming ? 'Checking rows…' : 'Looks good — continue'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
