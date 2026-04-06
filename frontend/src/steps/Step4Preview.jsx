import { useState } from 'react';
import { ChevronRight, ChevronLeft, Send, Eye, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { api } from '../hooks/useApi.js';

function renderMerge(text, participant) {
  if (!participant) return text;
  const data = {
    firstName: participant.firstName || '',
    lastName: participant.lastName || '',
    fullName: participant.fullName || '',
    email: participant.emailRaw || participant.email || '',
    id: participant.id || '',
    displayName: participant.displayName || '',
    greeting: participant.displayName || 'Hello',
    ...participant.allFields,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] !== undefined ? data[k] : `{{${k}}}`);
}

export default function Step4Preview({ participants, template, senderIdentity, onBack, onComplete }) {
  const eligible = participants.filter(p => p.included && p.canSend);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [testTo, setTestTo] = useState('');
  const [testRowIdx, setTestRowIdx] = useState(0);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const previewRow = eligible[previewIdx] || null;

  const renderedSubject = previewRow ? renderMerge(template.subject, previewRow) : template.subject;
  const renderedBody = previewRow ? renderMerge(template.bodyHtmlOrText, previewRow) : template.bodyHtmlOrText;

  async function sendTest() {
    if (!testTo.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const sampleParticipant = eligible[testRowIdx] || null;
      const result = await api.post('/campaign/test-send', {
        to: testTo.trim(),
        subject: template.subject,
        bodyHtmlOrText: template.bodyHtmlOrText,
        sampleParticipant,
      });
      setTestResult({ ok: true, message: result.message });
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px' }}>
      <h2 className="section-title">Step 4: Preview & test</h2>
      <p className="section-desc mt-1">
        See exactly what each participant will receive. Send a test email to yourself before starting the bulk send.
      </p>

      <div style={{ display: 'flex', gap: 24, marginTop: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Preview panel */}
        <div style={{ flex: '1 1 540px' }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} color="#6b7280" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Preview as:</span>
              </div>
              {eligible.length > 1 && (
                <select
                  value={previewIdx}
                  onChange={e => setPreviewIdx(Number(e.target.value))}
                  style={{ width: 'auto', fontSize: 13 }}
                >
                  {eligible.map((p, i) => (
                    <option key={p.rowId} value={i}>
                      {p.displayName || p.fullName || p.emailRaw} ({p.emailRaw})
                    </option>
                  ))}
                </select>
              )}
              {eligible.length === 0 && (
                <span style={{ fontSize: 13, color: '#dc2626' }}>No participants selected.</span>
              )}
            </div>

            {/* Email mockup */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#6b7280', minWidth: 60 }}>From:</span>
                  <span style={{ fontWeight: 500 }}>{senderIdentity?.fromFormatted || 'Not configured'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ color: '#6b7280', minWidth: 60 }}>To:</span>
                  <span>{previewRow?.emailRaw || '—'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ color: '#6b7280', minWidth: 60 }}>Subject:</span>
                  <span style={{ fontWeight: 600 }}>{renderedSubject}</span>
                </div>
              </div>
              <div
                style={{ padding: '20px 24px', fontSize: 14, lineHeight: 1.7, minHeight: 200 }}
                dangerouslySetInnerHTML={{ __html: renderedBody || '<em style="color:#9ca3af">No body yet.</em>' }}
              />
            </div>
          </div>
        </div>

        {/* Test send + confirm panel */}
        <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Test send */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Send size={14} color="#2563eb" /> Send a test email
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              This does not email your list. It sends only to the address you enter below.
            </p>
            {senderIdentity?.configured && (
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                Sending as: <strong>{senderIdentity.fromEmail}</strong>
              </p>
            )}

            <div style={{ marginBottom: 10 }}>
              <label>Deliver test to</label>
              <input
                type="email"
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                placeholder="your@email.edu"
                style={{ marginTop: 4 }}
              />
            </div>

            {eligible.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label>Use merge data from</label>
                <select value={testRowIdx} onChange={e => setTestRowIdx(Number(e.target.value))} style={{ marginTop: 4 }}>
                  {eligible.map((p, i) => (
                    <option key={p.rowId} value={i}>
                      {p.displayName || p.emailRaw}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              className="btn btn-ghost w-full"
              onClick={sendTest}
              disabled={testSending || !testTo.trim()}
              style={{ justifyContent: 'center' }}
            >
              {testSending ? <><Loader size={13} /> Sending…</> : <><Send size={13} /> Send test email</>}
            </button>

            {testResult && (
              <div className={`alert ${testResult.ok ? 'alert-green' : 'alert-red'} mt-3`} style={{ fontSize: 12 }}>
                {testResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {testResult.message}
              </div>
            )}
          </div>

          {/* Bulk send summary */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Ready to send?</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
              <div>Selected participants: <strong>{eligible.length}</strong></div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>30 emails/minute max · Gmail 500/day cap</div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}>
              <div style={{ color: '#374151', marginBottom: 6 }}>Messages will be sent from:</div>
              <div style={{ fontWeight: 600, color: '#1d4ed8' }}>{senderIdentity?.fromFormatted || 'Not configured'}</div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                id="confirm-sender"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <label htmlFor="confirm-sender" style={{ fontSize: 12, cursor: 'pointer', color: '#374151' }}>
                I confirm this is the correct sending account and I'm ready to send to the selected participants.
              </label>
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
          className="btn btn-success btn-lg"
          disabled={!confirmed || eligible.length === 0}
          onClick={onComplete}
        >
          Send to {eligible.length} participant{eligible.length !== 1 ? 's' : ''} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
