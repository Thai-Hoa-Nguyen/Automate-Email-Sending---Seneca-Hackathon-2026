import { useState, useEffect, useRef } from 'react';
import { OctagonX, CheckCircle, XCircle, Loader, Download, RefreshCw, RotateCcw } from 'lucide-react';
import { api } from '../hooks/useApi.js';

const STATUS_COLOR = {
  sent: '#16a34a',
  failed: '#dc2626',
  pending: '#6b7280',
};

export default function Step5Send({ participants, template, mapping, uploadId, onStartOver, onSendingStateChange }) {
  const [campaignId, setCampaignId] = useState(null);
  const [campaignStatus, setCampaignStatus] = useState(null); // running|stopped|completed|failed
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [startError, setStartError] = useState(null);
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef(null);
  const hasStarted = useRef(false);

  const checked = participants.filter(p => p.included && p.canSend);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startCampaign();
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function startCampaign() {
    setStartError(null);
    try {
      const result = await api.post('/campaign/start', {
        participants,
        template,
        mapping,
        uploadId,
      });
      setCampaignId(result.campaignId);
      setCampaignStatus('running');
      onSendingStateChange?.(true);
      pollRef.current = setInterval(() => pollStatus(result.campaignId), 1500);
    } catch (e) {
      setStartError(e.message);
    }
  }

  async function pollStatus(id) {
    try {
      const data = await api.get(`/campaign/${id}/status`);
      setRows(data.participants);
      setSummary(data.summary);
      setCampaignStatus(data.status);
      if (data.status === 'completed' || data.status === 'stopped' || data.status === 'failed') {
        clearInterval(pollRef.current);
        onSendingStateChange?.(false);
      }
    } catch {}
  }

  async function emergencyStop() {
    if (!campaignId) return;
    setStopping(true);
    try {
      await api.post(`/campaign/${campaignId}/stop`, {});
      setCampaignStatus('stopped');
      clearInterval(pollRef.current);
      // Final status poll
      await pollStatus(campaignId);
    } catch {}
    setStopping(false);
  }

  async function clearAndStartOver() {
    try { await api.delete('/campaign/clear'); } catch {}
    onStartOver();
  }

  function exportCSV() {
    if (!rows) return;
    const header = ['Name', 'Email', 'Status', 'Error'];
    const lines = rows
      .filter(r => r.included)
      .map(r => [
        `"${r.displayName || r.fullName || ''}"`,
        `"${r.emailRaw || r.email}"`,
        `"${r.result || r.status}"`,
        `"${r.errorMessage || ''}"`,
      ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `send-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const isDone = campaignStatus === 'completed' || campaignStatus === 'stopped';
  const isRunning = campaignStatus === 'running';

  const progressPct = summary
    ? Math.round(((summary.sent + summary.failed) / Math.max(summary.total, 1)) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title">Step 5: Sending</h2>
          <p className="section-desc mt-1">
            {isRunning ? 'Emails are going out — do not close this tab.' : isDone ? 'Send complete.' : 'Starting…'}
          </p>
        </div>
        {isRunning && (
          <button
            className="btn btn-danger btn-lg"
            onClick={emergencyStop}
            disabled={stopping}
            style={{ fontSize: 15, padding: '12px 28px' }}
          >
            <OctagonX size={20} />
            {stopping ? 'Stopping…' : 'Emergency Stop'}
          </button>
        )}
      </div>

      {startError && (
        <div className="alert alert-red mt-4">
          <XCircle size={15} />
          <span>{startError}</span>
        </div>
      )}

      {/* Progress bar */}
      {summary && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#374151' }}>
            <span>
              {isRunning ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending… {summary.sent + summary.failed} of {summary.total}
                </span>
              ) : (
                `Done — ${summary.sent + summary.failed} of ${summary.total} processed`
              )}
            </span>
            <span style={{ fontWeight: 600 }}>{progressPct}%</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: 9999, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: campaignStatus === 'stopped' ? '#d97706' : '#16a34a',
              borderRadius: 9999,
              transition: 'width .4s ease',
            }} />
          </div>

          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Sent', value: summary.sent, color: '#16a34a' },
              { label: 'Failed', value: summary.failed, color: summary.failed > 0 ? '#dc2626' : '#6b7280' },
              { label: 'Remaining', value: summary.remaining, color: '#2563eb' },
              { label: 'Skipped (issues)', value: summary.skipped, color: '#d97706' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '12px 20px', minWidth: 110 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {campaignStatus === 'stopped' && (
            <div className="alert alert-amber mt-4">
              <OctagonX size={14} />
              <span><strong>Send stopped</strong> — {summary.remaining} email{summary.remaining !== 1 ? 's' : ''} were not sent. You can re-upload and send a new campaign for remaining participants.</span>
            </div>
          )}
          {campaignStatus === 'completed' && (
            <div className="alert alert-green mt-4">
              <CheckCircle size={14} />
              <span><strong>All done!</strong> {summary.sent} email{summary.sent !== 1 ? 's' : ''} sent successfully{summary.failed > 0 ? `, ${summary.failed} failed (see table below).` : '.'}</span>
            </div>
          )}
        </div>
      )}

      {/* Per-row table */}
      {rows && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Results per participant</span>
            {isDone && (
              <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
                <Download size={13} /> Export CSV
              </button>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Result</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter(r => r.included || !r.canSend).map(r => (
                  <tr key={r.rowId}>
                    <td style={{ fontWeight: 500 }}>{r.displayName || r.fullName || '—'}</td>
                    <td style={{ fontSize: 13 }}>{r.emailRaw || r.email}</td>
                    <td>
                      {r.result === 'sent' && <span className="badge badge-green"><CheckCircle size={11} /> Sent</span>}
                      {r.result === 'failed' && <span className="badge badge-red"><XCircle size={11} /> Failed</span>}
                      {!r.result && r.included && isRunning && <span className="badge badge-gray"><Loader size={11} /> Pending</span>}
                      {!r.result && r.included && !isRunning && <span className="badge badge-gray">Not sent</span>}
                      {!r.included && <span className="badge badge-gray">Skipped</span>}
                      {r.status === 'duplicate_email' && <span className="badge badge-amber">Duplicate</span>}
                      {(r.status === 'missing_email' || r.status === 'invalid_email') && <span className="badge badge-red">Bad email</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{r.errorMessage || r.errorReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isDone && (
        <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={clearAndStartOver}>
            <RotateCcw size={14} /> Start a new send
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
