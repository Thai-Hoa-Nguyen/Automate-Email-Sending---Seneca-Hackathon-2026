import { useState, useEffect } from 'react';
import SenderBanner from './components/SenderBanner.jsx';
import WizardProgress from './components/WizardProgress.jsx';
import Step1Upload from './steps/Step1Upload.jsx';
import Step2Participants from './steps/Step2Participants.jsx';
import Step3Template from './steps/Step3Template.jsx';
import Step4Preview from './steps/Step4Preview.jsx';
import Step5Send from './steps/Step5Send.jsx';
import { api } from './hooks/useApi.js';

export default function App() {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [sendingActive, setSendingActive] = useState(false);

  // Data flowing through the wizard
  const [uploadData, setUploadData] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [template, setTemplate] = useState(null);
  const [senderIdentity, setSenderIdentity] = useState(null);

  useEffect(() => {
    api.get('/email/sender').then(setSenderIdentity).catch(() => {});

    // Restore active campaign on refresh
    api.get('/campaign/active').then(campaign => {
      if (campaign && (campaign.status === 'running' || campaign.status === 'completed' || campaign.status === 'stopped')) {
        if (window.confirm('A previous send campaign is in progress or recently finished. Would you like to view its status?')) {
          setParticipants(campaign.participants);
          setTemplate(campaign.template);
          setStep(5);
          setMaxReached(5);
        }
      }
    }).catch(() => {});
  }, []);

  function goTo(s) {
    setStep(s);
    setMaxReached(r => Math.max(r, s));
  }

  function handleProgressClick(targetStep) {
    if (sendingActive) return;
    // Guard: only navigate to steps we have data for
    if (targetStep >= 2 && !participants) return;
    if (targetStep >= 3 && !uploadData) return;
    if (targetStep >= 4 && !template) return;
    setStep(targetStep);
  }

  function handleUploadComplete(data) {
    setUploadData(data);
    setParticipants(data.participants);
    goTo(2);
  }

  function handleParticipantsComplete(updatedParticipants) {
    setParticipants(updatedParticipants);
    goTo(3);
  }

  function handleTemplateComplete(tmpl) {
    setTemplate(tmpl);
    goTo(4);
  }

  function handlePreviewComplete() {
    goTo(5);
  }

  function handleStartOver() {
    setUploadData(null);
    setParticipants(null);
    setTemplate(null);
    setStep(1);
    setMaxReached(1);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Always-visible sender banner */}
      <SenderBanner />

      {/* App header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 34,
          height: 34,
          background: '#2563eb',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 16,
        }}>S</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Student Success Email Tool</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Guided bulk email for your team</div>
        </div>
      </div>

      {/* Wizard progress bar */}
      <WizardProgress
        currentStep={step}
        maxReached={maxReached}
        onStepClick={handleProgressClick}
        sendingLocked={sendingActive}
      />

      {/* Step content */}
      <div style={{ flex: 1 }}>
        {step === 1 && (
          <Step1Upload onComplete={handleUploadComplete} />
        )}
        {step === 2 && participants && (
          <Step2Participants
            participants={participants}
            summary={uploadData?.summary}
            onBack={() => goTo(1)}
            onComplete={handleParticipantsComplete}
          />
        )}
        {step === 3 && (
          <Step3Template
            columns={uploadData?.columns || []}
            onBack={() => goTo(2)}
            onComplete={handleTemplateComplete}
          />
        )}
        {step === 4 && participants && template && (
          <Step4Preview
            participants={participants}
            template={template}
            senderIdentity={senderIdentity}
            onBack={() => goTo(3)}
            onComplete={handlePreviewComplete}
          />
        )}
        {step === 5 && participants && template && (
          <Step5Send
            participants={participants}
            template={template}
            mapping={uploadData?.mapping || {}}
            uploadId={uploadData?.uploadId}
            onStartOver={handleStartOver}
            onSendingStateChange={setSendingActive}
          />
        )}
      </div>
    </div>
  );
}
