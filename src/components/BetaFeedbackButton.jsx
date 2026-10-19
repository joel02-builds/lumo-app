import { useState } from 'react';

/**
 * BetaFeedbackButton — floating Button für Beta-Tester
 *
 * Erscheint als kleiner runder Button unten rechts, immer sichtbar.
 * Öffnet ein einfaches Feedback-Sheet mit vordefinierten Kategorien
 * und optionalem Freitext.
 *
 * ADHS-Design-Prinzip: Extrem niedrige Friction — 2 Taps für ein komplettes
 * Feedback. Vorauswahl reduziert kognitive Last. Kein Sign-in erforderlich.
 */
export default function BetaFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const CATEGORIES = [
    { id: 'bug', label: '🐛 Etwas funktioniert nicht', color: '#E07B54' },
    { id: 'confusing', label: '😕 Das war verwirrend', color: '#D4A843' },
    { id: 'love', label: '❤️ Das finde ich super', color: '#3D9E6E' },
    { id: 'missing', label: '💡 Das würde ich mir wünschen', color: '#8A9BAE' },
  ];

  function handleSend() {
    if (!selected) return;
    const category = CATEGORIES.find(c => c.id === selected);
    const subject = `Lumo Beta: ${category.label}`;
    const body = text ? encodeURIComponent(text) : encodeURIComponent('(kein weiterer Text)');
    window.open(`mailto:feedback@lumo-app.de?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank');
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setSelected(null);
      setText('');
    }, 2000);
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Feedback geben"
        style={{
          position: 'fixed',
          bottom: '84px',
          right: '20px',
          zIndex: 900,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)';
          e.currentTarget.style.color = 'var(--gold)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        💬
      </button>

      {/* Feedback Sheet */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '24px',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              margin: '0 auto',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'lumo-screen-fade-in 200ms ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            {sent ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '32px', margin: '0 0 8px' }}>🙌</p>
                <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--gold)', margin: '0' }}>
                  Danke für dein Feedback!
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0' }}>
                    Beta Feedback
                  </h2>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--text-secondary)', fontSize: '20px',
                      cursor: 'pointer', padding: '4px',
                    }}
                  >
                    ×
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
                  Was möchtest du uns sagen?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelected(cat.id)}
                      style={{
                        width: '100%',
                        background: selected === cat.id ? `${cat.color}22` : 'var(--bg-elevated)',
                        border: `1px solid ${selected === cat.id ? cat.color : 'var(--border)'}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: selected === cat.id ? '600' : '400',
                        color: selected === cat.id ? cat.color : 'var(--text-primary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {selected && (
                  <textarea
                    rows={3}
                    placeholder="Optional: Beschreib es kurz …"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '14px',
                      resize: 'none',
                    }}
                  />
                )}

                <button
                  onClick={handleSend}
                  disabled={!selected}
                  style={{
                    width: '100%',
                    background: selected ? 'var(--gold)' : 'var(--bg-card-bright)',
                    color: selected ? '#1a1206' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: selected ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Absenden →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
