import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import { lumoApi } from '../../api/lumo.js';

// Phase 2 + 3 – Aktiver Abruf & direktes Feedback: erzwungene Selbsterklärung
// (mit optionalem Hinweis bei "Keine Ahnung"), danach sofortige Bewertung statt
// eines separaten Quiz. Kein Zurückscrollen zur Erklärung möglich.
export default function CheckUnderstandingPhase({ block, onDone, onExit }) {
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [failedAction, setFailedAction] = useState(null); // 'submit' | 'hint'

  async function handleSubmit() {
    if (!answer.trim() || submitting || hintLoading) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await lumoApi.evaluateUnderstanding({
        blockTitle: block.title,
        blockContent: block.content,
        userExplanation: answer.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setFailedAction('submit');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNoIdea() {
    if (hintLoading || submitting) return;
    setHintLoading(true);
    setError(null);
    try {
      const data = await lumoApi.getUnderstandingHint({
        blockTitle: block.title,
        blockContent: block.content,
      });
      setHint(data.hint);
    } catch (err) {
      setError(err.message);
      setFailedAction('hint');
    } finally {
      setHintLoading(false);
    }
  }

  function handleRetry() {
    if (failedAction === 'hint') {
      handleNoIdea();
    } else {
      handleSubmit();
    }
  }

  if (result) {
    return (
      <div className="screen" key="check-result">
        <div className="screen-content">
          <LumoMascot state={result.status === 'sicher' ? 'cheer' : 'learning'} />
          <p className="feedback-text">{result.summaryText}</p>

          {result.goodPoints.length > 0 && (
            <div style={{
              width: '100%',
              background: 'var(--green-soft)',
              border: '1px solid var(--green)',
              borderRadius: '12px',
              padding: '14px 18px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--green)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Das hast du gut erklärt
              </p>
              {result.goodPoints.map((p, i) => (
                <p key={i} style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: '1.4' }}>
                  • {p}
                </p>
              ))}
            </div>
          )}
          {result.uncertainPoints.length > 0 && (
            <div style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--gold)',
              borderRadius: '12px',
              padding: '14px 18px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Das fehlte noch
              </p>
              {result.uncertainPoints.map((p, i) => (
                <p key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: '1.4' }}>
                  • {p}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={() => onDone(result)}
            style={{
              width: '100%',
              background: 'var(--gold)',
              color: '#1a1206',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            {result.status === 'sicher' ? 'Weiter →' : 'Verstanden, weiter'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" key="check-asking">
      <div className="screen-content">
        <LumoMascot state="learning" />
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
          Lumo hört zu. Kein Zurückschauen.
        </p>
        <h1 style={{ fontSize: '22px', lineHeight: '1.3' }}>
          Stell dir vor du erklärst es deinem besten Freund.<br />Was würdest du sagen?
        </h1>
        {hint && <p className="hint-text">{hint}</p>}
        <textarea
          rows={5}
          style={{ width: '100%' }}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Fang einfach an – auch ein Satz reicht …"
          autoFocus
        />
        {error && (
          <ErrorBanner message={error} onRetry={handleRetry} onClose={() => setError(null)} onExit={onExit} />
        )}
        <div className="action-stack">
          <Button onClick={handleSubmit} disabled={!answer.trim() || submitting || hintLoading}>
            {submitting ? 'Lumo liest …' : 'Abschicken'}
          </Button>
          {!hint && (
            <button className="text-link" onClick={handleNoIdea} disabled={submitting || hintLoading}>
              {hintLoading ? 'Ich denke …' : 'Zeig mir einen Einstieg'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
