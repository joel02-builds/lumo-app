import { useEffect, useRef, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import NotesPanel from '../../components/NotesPanel.jsx';
import { lumoApi } from '../../api/lumo.js';

const READ_DELAY_MS = 20000;
const TRANSITION_MS = 1500;

// Phase 1 – Chat: Lumo erklärt kurz, der Nutzer darf beliebig oft nachfragen.
// Erst "Ich hab's verstanden" beendet die Phase; der komplette Verlauf verschwindet danach.
export default function ExplainChatPhase({ block, depth, onDone, onExit }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    setMessages([]);

    lumoApi
      .explainChat({
        blockTitle: block.title,
        blockContent: block.content,
        difficulty: block.difficulty,
        depth,
        history: [],
      })
      .then((data) => {
        if (!cancelled) {
          setMessages([{ role: 'assistant', text: data.reply }]);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [block.id, depth, attempt]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Lesezeit-Sperre für FIX 3: startet erst, sobald die Eröffnungserklärung da ist.
  useEffect(() => {
    if (loading) return undefined;
    setTimeUp(false);
    const timer = setTimeout(() => setTimeUp(true), READ_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // Übergangs-Timer für FIX 4: nach dem kurzen "Gut. Jetzt du." automatisch weiter.
  useEffect(() => {
    if (!transitioning) return undefined;
    const timer = setTimeout(onDone, TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [transitioning, onDone]);

  const hasAskedQuestion = messages.some((m) => m.role === 'user');
  const canFinish = timeUp || hasAskedQuestion;

  async function sendMessage(rawText) {
    const text = rawText.trim();
    if (!text || sending || loading) return;
    const history = [...messages, { role: 'user', text }];
    setMessages(history);
    setQuestion('');
    setSending(true);
    setError(null);
    try {
      const data = await lumoApi.explainChat({
        blockTitle: block.title,
        blockContent: block.content,
        difficulty: block.difficulty,
        depth,
        history,
      });
      setMessages((cur) => [...cur, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (transitioning) {
    return (
      <div className="screen" key="explain-transitioning">
        <div className="screen-content">
          <LumoMascot state="learning" label="Lumo" pulseOnce />
          <p className="transition-text">Gut. Jetzt du.</p>
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="screen" key="explain-error">
        <div className="screen-content">
          <LumoMascot state="learning" label="Lumo" />
          <ErrorBanner
            message={error}
            onRetry={() => setAttempt((a) => a + 1)}
            onClose={() => setAttempt((a) => a + 1)}
            onExit={onExit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen" key="explain-chat">
      <div className="screen-content chat-content">
        <LumoMascot state="learning" label="Lumo erklärt" />
        <span className="block-eyebrow">{block.title}</span>

        <div className="chat-log" ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
              {m.text}
            </div>
          ))}
        </div>
        {(loading || sending) && <p className="hint-text">Lumo denkt nach …</p>}

        {error && messages.length > 0 && (
          <ErrorBanner message={error} onClose={() => setError(null)} onExit={onExit} />
        )}

        <div className="chat-input-row">
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Frag Lumo, wenn dir etwas unklar ist …"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(question);
              }
            }}
          />
          <button
            type="button"
            className="chat-send-btn"
            onClick={() => sendMessage(question)}
            disabled={!question.trim() || sending || loading}
            aria-label="Frage senden"
          >
            →
          </button>
        </div>

        {depth === 'simple' && (
          <button
            type="button"
            className="text-link"
            disabled={sending || loading}
            onClick={() => sendMessage('Kannst du das genauer und mit mehr Tiefe erklären?')}
          >
            Genauer erklären
          </button>
        )}

        <button
          type="button"
          className={canFinish ? 'lumo-btn lumo-btn--primary lumo-btn--ready' : 'lumo-btn lumo-btn--waiting'}
          onClick={() => canFinish && setTransitioning(true)}
          disabled={!canFinish || loading || sending}
        >
          {canFinish ? "Ich hab's verstanden" : 'Lies erstmal in Ruhe …'}
        </button>
      </div>

      <NotesPanel blockId={block.id} />
    </div>
  );
}
