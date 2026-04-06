export const STEPS = [
  { id: 1, label: 'Upload & Map Columns' },
  { id: 2, label: 'Review Participants' },
  { id: 3, label: 'Email Template' },
  { id: 4, label: 'Preview & Test' },
  { id: 5, label: 'Send' },
];

export default function WizardProgress({ currentStep, maxReached, onStepClick, sendingLocked }) {
  return (
    <div style={{
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 900, margin: '0 auto' }}>
        {STEPS.map((step, idx) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          const accessible = step.id <= (maxReached || currentStep) && step.id !== currentStep;
          // Can't navigate back while a send is actively running
          const clickable = accessible && !sendingLocked && onStepClick;

          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
              <div
                onClick={() => clickable && onStepClick(step.id)}
                title={sendingLocked && accessible ? 'Cannot navigate while sending is in progress' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: clickable ? 'pointer' : 'default',
                  padding: '4px 6px',
                  borderRadius: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (clickable) e.currentTarget.style.background = '#f3f4f6'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  background: done ? '#16a34a' : active ? '#2563eb' : '#e5e7eb',
                  color: done || active ? '#fff' : '#9ca3af',
                  flexShrink: 0,
                  boxShadow: clickable ? '0 0 0 0px #2563eb' : undefined,
                  transition: 'box-shadow 0.15s',
                }}>
                  {done ? '✓' : step.id}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#2563eb' : done ? '#16a34a' : '#9ca3af',
                  whiteSpace: 'nowrap',
                  maxWidth: 90,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  textDecoration: clickable ? 'underline' : 'none',
                  textDecorationColor: '#16a34a55',
                }}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 2,
                  background: done ? '#16a34a' : '#e5e7eb',
                  margin: '0 6px',
                  marginBottom: 20,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
