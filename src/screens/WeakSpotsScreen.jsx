import { useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import { getBlockColor } from '../utils/subjectColors.js';

// uncertainPoints stammt aus der freien Lücken-Einschätzung der KI (Gesamtblock-
// Recall) und cards aus der separaten Konzept-Liste – beide Listen sind nicht
// 1:1 gekoppelt, uncertainPoints kann also länger sein als cards. Ohne Clamp
// würde die Formel unten sichtbar negative Prozentzahlen ausspucken.
function clampPercent(n) {
  return Math.max(0, Math.min(100, n));
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function MasteryRing({ percent, color, size = 60 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (percent / 100);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="4" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {percent}%
      </text>
    </svg>
  );
}

export default function WeakSpotsScreen({ blocks, flashcards, onBack, onStartBlock, onViewFlashcards }) {
  const [activeTab, setActiveTab] = useState('overview');
  const safeBlocks = (blocks || []).filter(Boolean);

  const completedBlocks = safeBlocks.filter(b => b.status === 'completed');
  const weakBlocks = safeBlocks.filter(b =>
    b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
  );
  const strongBlocks = safeBlocks.filter(b => b.status === 'completed' && b.confidence === 'sicher');
  const notStarted = safeBlocks.filter(b => b.status !== 'completed');

  const totalConcepts = safeBlocks.reduce((sum, b) => sum + (b.cards?.length || 0), 0);
  const weakConcepts = safeBlocks.reduce((sum, b) => sum + (b.uncertainPoints?.length || 0), 0);
  const masteryPercent = totalConcepts > 0
    ? clampPercent(Math.round(((totalConcepts - weakConcepts) / totalConcepts) * 100))
    : completedBlocks.length > 0
    ? clampPercent(Math.round((strongBlocks.length / completedBlocks.length) * 100))
    : 0;

  const pendingFlashcards = (flashcards || []).filter(c => c.status !== 'mastered').length;

  const TABS = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'weak', label: `Wiederholen (${weakBlocks.length})` },
    { id: 'strong', label: `Verstanden (${strongBlocks.length})` },
  ];

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '60px' }}>
      <div className="screen-content" style={{ maxWidth: '560px', gap: '20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none',
            color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer',
          }}>
            ← Zurück
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0' }}>Mein Lernstand</h2>
        </div>

        {/* Mastery Overview */}
        <div style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
        }}>
          <MasteryRing
            percent={masteryPercent}
            color={masteryPercent >= 80 ? 'var(--green)' : masteryPercent >= 50 ? 'var(--gold)' : 'var(--red)'}
            size={80}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {masteryPercent >= 80 ? 'Starker Lernstand.' : masteryPercent >= 50 ? 'Auf gutem Weg.' : 'Noch viel zu tun.'}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--green)' }}>
                ✓ {strongBlocks.length} verstanden
              </span>
              <span style={{ fontSize: '13px', color: 'var(--red)' }}>
                ○ {weakBlocks.length} wiederholen
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                — {notStarted.length} offen
              </span>
            </div>
          </div>
        </div>

        {/* Karteikarten-Banner wenn vorhanden */}
        {pendingFlashcards > 0 && (
          <button
            onClick={onViewFlashcards}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.05) 100%)',
              border: '1px solid rgba(212,168,67,0.4)',
              borderRadius: '14px',
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '24px' }}>🃏</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gold)', margin: '0 0 2px' }}>
                {pendingFlashcards} Karteikarten warten
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
                Lumo hat sie aus deinen Lücken erstellt.
              </p>
            </div>
            <span style={{ color: 'var(--gold)', fontSize: '16px' }}>→</span>
          </button>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                background: activeTab === tab.id ? 'var(--gold)' : 'var(--bg-card)',
                color: activeTab === tab.id ? '#1a1206' : 'var(--text-secondary)',
                border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
                borderRadius: '10px',
                padding: '9px 6px',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? '700' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Inhalt */}
        {activeTab === 'overview' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {safeBlocks.map(b => {
              const color = getBlockColor(b);
              const isWeak = b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken');
              const isStrong = b.status === 'completed' && b.confidence === 'sicher';
              const pct = b.cards?.length > 0
                ? clampPercent(Math.round(((b.cards.length - (b.uncertainPoints?.length || 0)) / b.cards.length) * 100))
                : null;

              return (
                <div key={b.id} style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  borderLeft: `4px solid ${isStrong ? 'var(--green)' : isWeak ? 'var(--red)' : color}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 2px' }}>
                      {b.title}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '12px',
                        color: isStrong ? 'var(--green)' : isWeak ? 'var(--red)' : 'var(--text-secondary)',
                        fontWeight: '500',
                      }}>
                        {isStrong ? '✓ Verstanden' : isWeak ? '○ Wiederholen' : b.status === 'completed' ? '✓ Abgeschlossen' : '— Offen'}
                      </span>
                      {b.completedAt && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {formatDate(b.completedAt)}
                        </span>
                      )}
                    </div>
                    {b.uncertainPoints?.length > 0 && (
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        margin: '4px 0 0',
                        lineHeight: '1.4',
                      }}>
                        {b.uncertainPoints.slice(0, 2).join(' · ')}
                        {b.uncertainPoints.length > 2 ? ` +${b.uncertainPoints.length - 2}` : ''}
                      </p>
                    )}
                  </div>
                  {pct !== null && (
                    <MasteryRing percent={pct} color={isStrong ? 'var(--green)' : isWeak ? 'var(--red)' : color} size={48} />
                  )}
                  {isWeak && (
                    <button
                      onClick={() => onStartBlock(b.id)}
                      style={{
                        background: 'var(--red)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Üben →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'weak' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {weakBlocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <LumoMascot state="cheer" />
                <p style={{ color: 'var(--green)', fontWeight: '600', fontSize: '16px', marginTop: '16px' }}>
                  Keine Lücken. Starke Leistung.
                </p>
              </div>
            ) : weakBlocks.map(b => (
              <div key={b.id} style={{
                width: '100%',
                background: 'var(--bg-card)',
                borderRadius: '14px',
                border: '1px solid rgba(224,123,84,0.3)',
                borderLeft: '4px solid var(--red)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      {b.title}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
                      {b.confidence === 'grosse_luecken' ? 'Große Lücken' : 'Noch unsicher'}
                      {b.completedAt ? ` · ${formatDate(b.completedAt)}` : ''}
                    </p>
                  </div>
                </div>
                {b.uncertainPoints?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {b.uncertainPoints.map((point, i) => (
                      <div key={i} style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        paddingLeft: '10px',
                        borderLeft: '2px solid var(--red)',
                        lineHeight: '1.4',
                      }}>
                        {point}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => onStartBlock(b.id)}
                  style={{
                    width: '100%',
                    background: 'var(--red)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Jetzt wiederholen →
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'strong' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {strongBlocks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0' }}>
                Noch keine verstandenen Blöcke.
              </p>
            ) : strongBlocks.map(b => (
              <div key={b.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                borderLeft: '4px solid var(--green)',
              }}>
                <span style={{ fontSize: '16px' }}>✓</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    {b.title}
                  </p>
                  {b.completedAt && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
                      {formatDate(b.completedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
