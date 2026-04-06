import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Users, AlertCircle, CheckCircle, XCircle, Filter } from 'lucide-react';

const STATUS_CONFIG = {
  ready: { label: 'Ready to review', badge: 'badge-gray', icon: null, canCheck: true },
  missing_email: { label: 'Missing email', badge: 'badge-red', icon: 'x', canCheck: false },
  invalid_email: { label: 'Invalid email', badge: 'badge-red', icon: 'x', canCheck: false },
  duplicate_email: { label: 'Duplicate email', badge: 'badge-amber', icon: 'warn', canCheck: false },
  sent: { label: 'Sent', badge: 'badge-green', icon: 'check', canCheck: false },
  failed: { label: 'Failed', badge: 'badge-red', icon: 'x', canCheck: false },
  skipped: { label: 'Skipped', badge: 'badge-gray', icon: null, canCheck: false },
};

export default function Step2Participants({ participants: initialParticipants, summary: initialSummary, onBack, onComplete }) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  function toggleRow(rowId) {
    setParticipants(prev => prev.map(p =>
      p.rowId === rowId && p.canSend ? { ...p, included: !p.included } : p
    ));
  }

  function selectAllEligible() {
    setParticipants(prev => prev.map(p => p.canSend ? { ...p, included: true } : p));
  }

  function deselectAll() {
    setParticipants(prev => prev.map(p => ({ ...p, included: false })));
  }

  const stats = useMemo(() => {
    const eligible = participants.filter(p => p.canSend);
    const checked = participants.filter(p => p.included);
    const issues = participants.filter(p => !p.canSend);
    const emailSet = new Set(checked.map(p => p.email));
    return {
      total: participants.length,
      eligible: eligible.length,
      checked: checked.length,
      unique: emailSet.size,
      issues: issues.length,
    };
  }, [participants]);

  const filtered = useMemo(() => {
    let list = participants;
    if (filter === 'eligible') list = list.filter(p => p.canSend);
    if (filter === 'selected') list = list.filter(p => p.included);
    if (filter === 'issues') list = list.filter(p => !p.canSend);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.emailRaw || '').toLowerCase().includes(q) ||
        (p.firstName || '').toLowerCase().includes(q) ||
        (p.lastName || '').toLowerCase().includes(q) ||
        (p.fullName || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [participants, filter, search]);

  function handleContinue() {
    if (stats.checked === 0) return;
    onComplete(participants);
  }

  const FILTERS = [
    { id: 'all', label: `All (${stats.total})` },
    { id: 'eligible', label: `Can send (${stats.eligible})` },
    { id: 'selected', label: `Selected (${stats.checked})` },
    { id: 'issues', label: `Needs fix (${stats.issues})` },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <h2 className="section-title">Step 2: Review participants</h2>
      <p className="section-desc mt-1">
        Check each person's details, then tick the checkbox to include them. Only ticked rows will receive an email.
      </p>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total rows', value: stats.total, color: '#6b7280' },
          { label: 'Can receive email', value: stats.eligible, color: '#2563eb' },
          { label: 'Selected', value: stats.checked, color: '#16a34a', bold: true },
          { label: 'Unique addresses', value: stats.unique, color: '#16a34a' },
          { label: 'Need fixing', value: stats.issues, color: stats.issues > 0 ? '#dc2626' : '#6b7280' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 18px', minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {stats.checked === 0 && (
        <div className="alert alert-amber mt-4">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>No participants selected. Check the individuals you've verified before continuing.</span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: `1px solid ${filter === f.id ? '#2563eb' : '#d1d5db'}`,
                background: filter === f.id ? '#eff6ff' : '#fff',
                color: filter === f.id ? '#1d4ed8' : '#374151',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: filter === f.id ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={selectAllEligible}>
            Select all eligible
          </button>
          <button className="btn btn-ghost btn-sm" onClick={deselectAll}>
            Clear all
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll mt-3">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>Include</th>
              <th>Name</th>
              <th>Email</th>
              <th>Student ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No matching rows.</td></tr>
            )}
            {filtered.map(p => {
              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.ready;
              return (
                <tr key={p.rowId} style={{ opacity: p.canSend ? 1 : 0.7 }}>
                  <td style={{ textAlign: 'center' }}>
                    {p.canSend ? (
                      <input
                        type="checkbox"
                        checked={p.included}
                        onChange={() => toggleRow(p.rowId)}
                        title="Include this person"
                      />
                    ) : (
                      <span title={p.errorReason} style={{ cursor: 'help' }}>
                        <XCircle size={14} color="#fca5a5" />
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.displayName || p.fullName || <span style={{ color: '#9ca3af' }}>No name</span>}</div>
                    {p.firstName && p.lastName && p.firstName !== p.fullName && (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.firstName} {p.lastName}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{p.emailRaw || <span style={{ color: '#dc2626' }}>—</span>}</td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{p.id || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className={`badge ${cfg.badge}`}>{p.included ? '✓ Selected' : cfg.label}</span>
                      {p.errorReason && (
                        <span style={{ fontSize: 11, color: '#dc2626' }}>{p.errorReason}</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {stats.checked > 0 && (
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              <strong>{stats.checked}</strong> selected → <strong>{stats.unique}</strong> unique addresses
            </span>
          )}
          <button
            className="btn btn-primary"
            disabled={stats.checked === 0}
            onClick={handleContinue}
          >
            Continue to template <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
