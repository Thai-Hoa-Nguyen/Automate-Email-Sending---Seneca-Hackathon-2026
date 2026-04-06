import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Upload, FileText, Save, Trash2, Plus, AlertCircle } from 'lucide-react';
import { api } from '../hooks/useApi.js';

const MERGE_TOKENS = [
  { token: '{{firstName}}', label: 'First name' },
  { token: '{{lastName}}', label: 'Last name' },
  { token: '{{fullName}}', label: 'Full name' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{id}}', label: 'Student ID' },
  { token: '{{greeting}}', label: 'Smart greeting (Hi FirstName)' },
];

export default function Step3Template({ columns, onBack, onComplete }) {
  const [templates, setTemplates] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const extraTokens = (columns || [])
    .filter(c => c.role === 'passthrough')
    .map(c => ({ token: `{{${c.fieldSlug}}}`, label: c.headerLabel }));
  const allTokens = [...MERGE_TOKENS, ...extraTokens];

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    try {
      const list = await api.get('/templates');
      setTemplates(list);
    } catch {}
  }

  function loadTemplate(t) {
    setActiveId(t.id);
    setName(t.name);
    setSubject(t.subject || '');
    setBody(t.bodyHtmlOrText || '');
    setDirty(false);
    setSaveMsg(null);
  }

  function newTemplate() {
    setActiveId(null);
    setName('');
    setSubject('');
    setBody('');
    setDirty(false);
    setSaveMsg(null);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const saved = await api.post('/templates', {
        id: activeId,
        name: name.trim(),
        subject,
        bodyHtmlOrText: body,
        bodySource: 'app',
      });
      setActiveId(saved.id);
      setDirty(false);
      setSaveMsg({ ok: true, text: 'Template saved.' });
      await loadTemplates();
    } catch (e) {
      setSaveMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id) {
    if (!window.confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`);
    if (activeId === id) newTemplate();
    await loadTemplates();
  }

  async function importFile(file) {
    if (!file) return;
    setImportError(null);
    setImporting(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let html;
      if (ext === 'docx') {
        const r = await api.uploadFile('/templates/import/docx', file);
        html = r.html;
      } else if (ext === 'txt') {
        const r = await api.uploadFile('/templates/import/txt', file);
        html = r.html;
      } else {
        setImportError('Only .docx and .txt files are supported.');
        return;
      }
      setBody(html);
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ''));
      setDirty(true);
    } catch (e) {
      setImportError(e.message);
    } finally {
      setImporting(false);
    }
  }

  function insertToken(token) {
    const textarea = document.getElementById('template-body');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.slice(0, start) + token + body.slice(end);
      setBody(newBody);
      setDirty(true);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else {
      setBody(prev => prev + token);
      setDirty(true);
    }
  }

  function formatBold() {
    const textarea = document.getElementById('template-body');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);
    const replacement = selected ? `<strong>${selected}</strong>` : '<strong></strong>';
    setBody(body.slice(0, start) + replacement + body.slice(end));
    setDirty(true);
  }

  const canContinue = body.trim() && subject.trim();

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px' }}>
      <h2 className="section-title">Step 3: Email template</h2>
      <p className="section-desc mt-1">
        Upload a Word or text file, or type your email here. Use merge tokens like <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>{'{{firstName}}'}</code> to personalise each message.
      </p>

      <div style={{ display: 'flex', gap: 20, marginTop: 24, alignItems: 'flex-start' }}>
        {/* Saved templates sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 8 }}>Saved templates</div>
          <button className="btn btn-ghost btn-sm w-full mb-4" onClick={newTemplate} style={{ justifyContent: 'center' }}>
            <Plus size={13} /> New template
          </button>
          {templates.length === 0 && (
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No saved templates yet.</p>
          )}
          {templates.map(t => (
            <div
              key={t.id}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                background: activeId === t.id ? '#eff6ff' : '#fff',
                border: `1px solid ${activeId === t.id ? '#93c5fd' : '#e5e7eb'}`,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => loadTemplate(t)}
            >
              <FileText size={13} color="#6b7280" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(t.updatedAt).toLocaleDateString()}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteTemplate(t.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2 }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div style={{ flex: 1 }}>
          {/* Import */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 7,
                cursor: importing ? 'wait' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
                background: '#fff',
              }}
            >
              <Upload size={13} /> {importing ? 'Importing…' : 'Import from file (.docx or .txt)'}
              <input type="file" accept=".docx,.txt" style={{ display: 'none' }} onChange={e => importFile(e.target.files[0])} />
            </label>
            {importError && (
              <span style={{ fontSize: 12, color: '#dc2626', display: 'flex', gap: 4, alignItems: 'center' }}>
                <AlertCircle size={12} /> {importError}
              </span>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            {/* Name */}
            <div className="mb-4">
              <label>Template name</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); setDirty(true); }} placeholder="e.g. Welcome email" style={{ marginTop: 4 }} />
            </div>

            {/* Subject */}
            <div className="mb-4">
              <label>Subject line</label>
              <input type="text" value={subject} onChange={e => { setSubject(e.target.value); setDirty(true); }} placeholder="e.g. Welcome to the program, {{firstName}}!" style={{ marginTop: 4 }} />
            </div>

            {/* Token picker */}
            <div style={{ marginBottom: 8 }}>
              <label>Insert merge fields</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12 }}
                  onClick={formatBold}
                  title="Wrap selected text in bold"
                >
                  <strong>B</strong> Bold
                </button>
                {allTokens.map(t => (
                  <button
                    key={t.token}
                    className="btn btn-ghost btn-sm"
                    onClick={() => insertToken(t.token)}
                    style={{ fontSize: 12, fontFamily: 'monospace' }}
                    title={`Insert ${t.token}`}
                  >
                    {t.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Body editor */}
            <div>
              <label>Email body (HTML or plain text)</label>
              <textarea
                id="template-body"
                value={body}
                onChange={e => { setBody(e.target.value); setDirty(true); }}
                rows={14}
                placeholder={"<p>Hi {{firstName}},</p>\n\n<p>We're excited to welcome you…</p>"}
                style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                You can use HTML tags like &lt;p&gt;, &lt;strong&gt;, &lt;br&gt;. Plain text also works — line breaks become new paragraphs.
              </p>
            </div>

            {/* Save row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={save} disabled={saving || !name.trim()}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save template'}
              </button>
              {saveMsg && (
                <span style={{ fontSize: 13, color: saveMsg.ok ? '#16a34a' : '#dc2626' }}>
                  {saveMsg.text}
                </span>
              )}
              {dirty && !saveMsg && (
                <span style={{ fontSize: 12, color: '#d97706' }}>Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <button
          className="btn btn-primary"
          disabled={!canContinue}
          onClick={() => onComplete({ name, subject, bodyHtmlOrText: body, bodySource: 'app', id: activeId })}
        >
          Continue to preview <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
