import { useCallback, useEffect, useRef, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import NotesPanel from '../../components/NotesPanel.jsx';
import HighlightedText from '../../components/HighlightedText.jsx';
import { useSpeechInput } from '../../hooks/useSpeechInput.js';
import { lumoApi } from '../../api/lumo.js';

const READ_DELAY_MS = 20000;
const TRANSITION_MS = 1500;
// Barkley 2011: ADHS-Nutzer brauchen explizite Closure-Signale.
// Nach 3 User-Nachrichten: Lumo schlägt sanft vor, zum Verständnis-Check zu wechseln.
const CLOSURE_SUGGESTION_AFTER = 3;

export default function ExplainChatPhase({ block, depth, onDone, onExit }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  // Closure-Banner: nach N User-Messages wird der Vorschlag angezeigt
  const [closureDismissed, setClosureDismissed] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    setMessages([]);

    lumoApi.explainChat({
      blockTitle: block.title,
      blockContent: block.content,
      difficulty: block.difficulty,
      depth,
      history: [],
    }).then((data) => {
      if (!cancelled) {
        setMessages([{ role: 'assistant', text: data.reply }]);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [block.id, depth, attempt]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, sending]);

  useEffect(() => {
    if (loading) return undefined;
    setTimeUp(false);
    const timer = setTimeout(() => setTimeUp(true), READ_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!transitioning) return undefined;
    const timer = setTimeout(onDone, TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [transitioning, onDone]);

  const hasAskedQuestion = messages.some((m) => m.role === 'user');
  const canFinish = timeUp || hasAskedQuestion;
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  // Closure-Banner: nach N Austauschen anzeigen, wenn User es nicht dismissed hat
  const showClosureBanner = !closureDismissed && userMessageCount >= CLOSURE_SUGGESTION_AFTER && !sending && !loading;

  // Voice-Input: transkribierten Text an bestehendes Feld anhängen
  const handleVoiceResult = useCallback((transcript) => {
    setQuestion((prev) => prev ? `${prev} ${transcript}` : transcript);
  }, []);
  const { isListening, isSupported: voiceSupported, startListening, stopListening } = useSpeechInput({ onResult: handleVoiceResult });

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
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="learning" pulseOnce />
          <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Gut. Jetzt du.
          </p>
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="learning" />
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
    <div style={{
      height: 'var(--dvh, 100dvh)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        <LumoMascot state={loading ? 'thinking' : sending ? 'thinking' : 'learning'} label="" size="small" />
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '2px',
          }}>
            {loading ? 'Lumo bereitet vor …' : sending ? 'Lumo denkt nach …' : 'Lumo erklärt'}
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text-primary)',
          }}>
            {block.title}
          </div>
        </div>
        <button
          onClick={onExit}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          Pause
        </button>
      </div>

      {/* Chat Log */}
      <div
        ref={logRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '680px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* P2-UX-03/05: Leerer Chat-Log während Initial-Load wirkt wie ein Fehler.
            Placeholder zeigt, dass Lumo bereits aktiv ist – kein leeres UI. */}
        {loading && messages.length === 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            animation: 'fadeIn 0.5s ease 0.2s both',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: '4px 18px 18px 18px',
              background: 'var(--bg-card)',
              fontSize: '15px',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              opacity: 0.6,
            }}>
              Lumo liest deinen Block …
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'assistant' ? 'flex-start' : 'flex-end',
            }}
          >
            <div style={{
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: m.role === 'assistant' ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
              background: m.role === 'assistant' ? 'var(--bg-card)' : 'var(--gold)',
              color: m.role === 'assistant' ? 'var(--text-primary)' : '#1a1206',
              fontSize: '16px',
              lineHeight: '1.6',
              fontWeight: m.role === 'user' ? '500' : '400',
            }}>
              {m.role === 'assistant'
                ? <HighlightedText text={m.text} color="var(--gold)" />
                : m.text}
            </div>
          </div>
        ))}

        {(loading || sending) && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '4px 18px 18px 18px',
              background: 'var(--bg-card)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  animation: `lumo-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {error && messages.length > 0 && (
          <ErrorBanner message={error} onClose={() => setError(null)} onExit={onExit} />
        )}

        {/* ── Closure Banner (Barkley 2011) ────────────────────────────────
            Nach 3 User-Nachrichten: sanfter Vorschlag zum Verständnis-Check.
            Nicht erzwungen — User kann weiterfragen oder direkt abschließen. */}
        {showClosureBanner && (
          <div style={{
            margin: '8px 0',
            padding: '16px 18px',
            borderRadius: '18px 18px 18px 4px',
            background: 'linear-gradient(135deg, rgba(212,168,67,0.12) 0%, rgba(212,168,67,0.06) 100%)',
            border: '1px solid rgba(212,168,67,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>💡</span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: 'var(--gold)' }}>
                  Ich glaube, du hast das.
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Soll ich kurz prüfen, ob es wirklich sitzt?
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setTransitioning(true)}
                style={{
                  flex: 1,
                  background: 'var(--gold)',
                  color: '#1a1206',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '11px 16px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                Ja, zum Check →
              </button>
              <button
                onClick={() => setClosureDismissed(true)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '11px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Ich frag noch was
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        padding: '16px 24px',
        flexShrink: 0,
        maxWidth: '680px',
        width: '100%',
        margin: '0 auto',
        alignSelf: 'stretch',
      }}>
        {depth === 'simple' && (
          <button
            className="text-link"
            disabled={sending || loading}
            onClick={() => sendMessage('Kannst du das genauer und mit mehr Tiefe erklären?')}
            style={{ marginBottom: '10px', display: 'block' }}
          >
            Genauer erklären
          </button>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isListening ? 'Ich höre zu …' : 'Frag Lumo etwas …'}
            disabled={loading}
            style={{
              flex: 1,
              resize: 'none',
              fontSize: '16px',
              borderRadius: '12px',
              minHeight: '52px',
              borderColor: isListening ? 'var(--gold)' : undefined,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(question);
              }
            }}
          />

          {/* Mikrofon-Button — nur wenn Browser unterstützt */}
          {voiceSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={loading}
              title={isListening ? 'Aufnahme stoppen' : 'Antwort einsprechen'}
              style={{
                background: isListening ? 'var(--gold)' : 'var(--bg-card)',
                color: isListening ? '#1a1206' : 'var(--text-secondary)',
                border: isListening ? 'none' : '1px solid var(--border)',
                borderRadius: '12px',
                width: '48px',
                height: '52px',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: isListening ? 'lumo-pulse 1.2s ease-in-out infinite' : 'none',
              }}
            >
              🎤
            </button>
          )}

          <button
            onClick={() => sendMessage(question)}
            disabled={!question.trim() || sending || loading}
            style={{
              background: question.trim() ? 'var(--gold)' : 'var(--bg-card)',
              color: question.trim() ? '#1a1206' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '12px',
              width: '48px',
              height: '52px',
              fontSize: '20px',
              cursor: question.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            →
          </button>
        </div>

        <button
          className={canFinish ? 'lumo-btn lumo-btn--primary lumo-btn--ready' : 'lumo-btn lumo-btn--waiting'}
          onClick={() => canFinish && setTransitioning(true)}
          disabled={!canFinish || loading || sending}
          style={{ width: '100%', marginTop: '12px' }}
        >
          {canFinish ? "Ich hab's verstanden" : 'Lies erstmal in Ruhe …'}
        </button>
        {/* P3-UX-03: Hinweis wie der Button entsperrt wird — ohne ihn wissen
            Nutzer nicht, ob sie warten sollen oder eine Frage stellen müssen.
            canFinish = timeUp (20s) || hasAskedQuestion. */}
        {!canFinish && !loading && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            margin: '6px 0 0',
            opacity: 0.65,
          }}>
            Stell eine Frage — oder warte kurz, dann entsperrt es sich.
          </p>
        )}
      </div>

      <NotesPanel blockId={block.id} />

      <style>{`
        @keyframes lumo-dot-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes lumo-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
