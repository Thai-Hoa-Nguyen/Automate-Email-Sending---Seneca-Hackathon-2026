import { useEffect, useState } from 'react';
import { Mail, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { api } from '../hooks/useApi.js';

export default function SenderBanner() {
  const [identity, setIdentity] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    api.get('/email/sender').then(setIdentity).catch(() => {});
  }, []);

  async function handleCheck() {
    setChecking(true);
    setCheckResult(null);
    try {
      const r = await api.post('/email/check', {});
      setCheckResult({ ok: r.ok, message: r.ok ? 'Connection is working.' : r.error });
    } catch (e) {
      setCheckResult({ ok: false, message: e.message });
    } finally {
      setChecking(false);
    }
  }

  if (!identity) return null;

  return (
    <div style={{
      background: identity.configured ? '#f0fdf4' : '#fef2f2',
      borderBottom: `1px solid ${identity.configured ? '#86efac' : '#fca5a5'}`,
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13,
      flexWrap: 'wrap',
    }}>
      <Mail size={14} color={identity.configured ? '#16a34a' : '#dc2626'} />
      {identity.configured ? (
        <>
          <span style={{ color: '#15803d' }}>
            Sending as: <strong>{identity.fromFormatted}</strong>
            {identity.domain && (
              <span style={{
                background: '#bbf7d0',
                color: '#166534',
                borderRadius: 4,
                padding: '1px 7px',
                fontSize: 11,
                marginLeft: 6,
                fontWeight: 600,
              }}>
                @{identity.domain}
              </span>
            )}
          </span>
          {identity.replyTo && (
            <span style={{ color: '#6b7280' }}>· Reply-to: {identity.replyTo}</span>
          )}
          <button
            onClick={handleCheck}
            disabled={checking}
            style={{
              marginLeft: 8,
              background: 'transparent',
              border: '1px solid #86efac',
              borderRadius: 5,
              padding: '2px 10px',
              fontSize: 12,
              cursor: checking ? 'wait' : 'pointer',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {checking ? <Loader size={11} /> : null}
            Check connection
          </button>
          {checkResult && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: checkResult.ok ? '#166534' : '#991b1b' }}>
              {checkResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              {checkResult.message}
            </span>
          )}
        </>
      ) : (
        <span style={{ color: '#991b1b' }}>
          <strong>Mail not configured</strong> — add SMTP credentials to the backend .env file before sending.
        </span>
      )}
    </div>
  );
}
