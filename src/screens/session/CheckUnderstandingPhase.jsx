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
          <LumoMascot state="learning" label="Lumo" />
          <p className="feedback-text">{result.summaryText}</p>

          {result.goodPoints.length > 0 && (
            <div className="summary-block summary-good">
              <h3>Das hast du gut erklärt</h3>
              <ul>
                {result.goodPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {result.uncertainPoints.length > 0 && (
            <div className="summary-block summary-uncertain">
              <h3>Das fehlte noch</h3>
              <ul>
                {result.uncertainPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={() => onDone(result)}>Weiter</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" key="check-asking">
      <div className="screen-content">
        <LumoMascot state="learning" label="Lumo hört zu" />
        <h1>Erklär mir in deinen eigenen Worten, was du gerade gelernt hast.</h1>
        {hint && <p className="hint-text">{hint}</p>}
        <textarea
          rows={5}
          style={{ width: '100%' }}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Schreib es in deinen eigenen Worten …"
          autoFocus
        />
        {error && (
          <ErrorBanner message={error} onRetry={handleRetry} onClose={() => setError(null)} onExit={onExit} />
        )}
        <div className="action-stack">
          <Button onClick={handleSubmit} disabled={!answer.trim() || submitting || hintLoading}>
            {submitting ? 'Lumo liest …' : 'Abschicken'}
          </Button>
          <button className="text-link" onClick={handleNoIdea} disabled={submitting || hintLoading}>
            {hintLoading ? 'Lumo überlegt …' : 'Keine Ahnung'}
          </button>
        </div>
      </div>
    </div>
  );
}
