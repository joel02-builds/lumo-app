import { useEffect, useRef, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import ErrorBanner from '../../components/ErrorBanner.jsx';
import NotesPanel from '../../components/NotesPanel.jsx';
import { lumoApi } from '../../api/lumo.js';

const READ_DELAY_MS = 20000;
const TRANSITION_MS = 1500;

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
          <LumoMascot state="learning" label="Lumo" pulseOnce />
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
    <div style={{
      height: '100vh',
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
              {m.text}
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Frag Lumo etwas …"
            disabled={loading}
            style={{
              flex: 1,
              resize: 'none',
              fontSize: '16px',
              borderRadius: '12px',
              minHeight: '52px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(question);
              }
            }}
          />
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
      `}</style>
    </div>
  );
}
