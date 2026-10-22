import { useState, useEffect } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { getRecommendedBlock } from '../../utils/blockProgress.js';
import { getBlockColor } from '../../utils/subjectColors.js';
import { getRemainingFreeBlocks, isFreeLimitReached, isApproachingLimit } from '../../utils/planLimits.js';
import { lumoApi } from '../../api/lumo.js';

function getDaysUntilExam(goalDate) {
  if (!goalDate) return null;
  const exam = new Date(goalDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getStreakDays() {
  try {
    const raw = localStorage.getItem('lumo_streak');
    if (!raw) return 0;
    const streak = JSON.parse(raw);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (streak.lastDate === today || streak.lastDate === yesterday) {
      return streak.days || 0;
    }
    return 0;
  } catch { return 0; }
}

function statusLabel(block) {
  if (block.status === 'not-started') return 'Nicht gestartet';
  if (block.status === 'in-progress') return 'In Bearbeitung';
  if (block.confidence === 'sicher') return 'Verstanden';
  if (block.confidence === 'unsicher') return 'Nochmal anschauen';
  return 'Wiederholen';
}

function BlockDot({ block, subjectColor }) {
  const activeColor = subjectColor || 'var(--gold)';
  if (block.status === 'completed' && block.confidence === 'sicher') {
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--green)', flexShrink: 0,
        boxShadow: '0 0 6px var(--green)',
      }} />
    );
  }
  if (block.status === 'completed' && block.confidence === 'unsicher') {
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--yellow)', flexShrink: 0,
      }} />
    );
  }
  if (block.status === 'completed') {
    // grosse_luecken: neutral grau — kein Fehler, nur frühe Phase
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--text-secondary)', flexShrink: 0,
        opacity: 0.5,
      }} />
    );
  }
  if (block.status === 'in-progress') {
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: activeColor, flexShrink: 0,
        boxShadow: `0 0 8px ${activeColor}`,
        animation: 'lumo-pulse 2s ease-in-out infinite',
      }} />
    );
  }
  return (
    <div style={{
      width: '10px', height: '10px', borderRadius: '50%',
      background: 'var(--border)', flexShrink: 0,
      border: '1px solid var(--text-secondary)',
    }} />
  );
}

export default function DashboardScreen({ blocks, recommendedOrder, goalType, goalDate, sprintMode, onStartBlock, onNewProject, onViewWeakSpots, onViewProjects, onSettings, blocksAnalyzedTotal, flashcardsCount, onViewFlashcards }) {
  const safeBlocks = (blocks || []).filter(Boolean);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const next = getRecommendedBlock(safeBlocks, recommendedOrder || []);

  // Lädt die Karten des nächsten Blocks schon im Hintergrund, damit der
  // Request/Cache beim tatsächlichen Klick bereits warm ist.
  useEffect(() => {
    if (!next) return;
    lumoApi.generateCards({
      blockTitle: next.title,
      blockContent: next.content,
      difficulty: next.difficulty,
      goalType,
    }).catch(() => {});
  }, [next?.id]);

  if (safeBlocks.length === 0) {
    return (
      <div className="screen">
        <div className="screen-content">
          <LumoMascot state="idle" />
          <p style={{ color: 'var(--text-secondary)' }}>Kein Projekt aktiv.</p>
          <button onClick={onNewProject} style={{ background: 'var(--gold)', color: '#1a1206', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            Projekt starten
          </button>
        </div>
      </div>
    );
  }

  const total = safeBlocks.length;
  const completed = safeBlocks.filter((b) => b.status === 'completed').length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  const weakCount = safeBlocks.filter(b =>
    b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
  ).length;
  const projectColor = safeBlocks[0]?.subject_color || 'var(--gold)';

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: 'clamp(20px, 8vw, 80px)' }}>
      {onSettings && (
        <button
          onClick={onSettings}
          aria-label="Einstellungen"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}
      <div className="screen-content" style={{ maxWidth: '560px', gap: '20px' }}>

        <LumoMascot state={allDone ? 'complete' : 'idle'} label="Lumo" />

        {(() => {
          const streak = getStreakDays();
          if (streak < 1) return null;
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(212,168,67,0.10)',
              border: '1px solid rgba(212,168,67,0.25)',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '14px',
              color: 'var(--gold)',
              fontWeight: '700',
            }}>
              🔥 {streak} {streak === 1 ? 'Tag' : 'Tage'} am Stück
            </div>
          );
        })()}

        {/* Fortschritt
            ADHS-Design:
            ─────────────────────────────────────────────────────────────────────
            – Balken immer sichtbar (auch bei 0%): leeres Interface = kein Start
            – Milestone-Labels bei 25/50/75/100%: Effort-Praise (Dweck 1998)
            – Segment-Markierungen: visueller Anker für nächsten Schritt
            – Kein "du hast noch X übrig" → "du hast X geschafft" framing
        */}
        <div style={{ width: '100%', textAlign: 'center' }}>
          {/* Prozentanzeige */}
          <div style={{
            fontSize: '48px',
            fontWeight: '800',
            color: percent === 100 ? 'var(--green)' : 'var(--gold)',
            lineHeight: '1',
            marginBottom: '12px',
          }}>
            {percent}%
          </div>

          {/* Progress Bar — immer sichtbar */}
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${completed} von ${total} Blöcken abgeschlossen`}
            style={{
              height: '12px',
              background: 'var(--bg-card)',
              borderRadius: '8px',
              overflow: 'hidden',
              margin: '0 0 6px',
              position: 'relative',
              border: '1px solid var(--border)',
            }}
          >
            {/* Füllbalken */}
            {percent > 0 && (
              <div style={{
                height: '100%',
                width: `${percent}%`,
                background: percent === 100
                  ? 'var(--green)'
                  : `linear-gradient(90deg, ${projectColor}cc, ${projectColor})`,
                borderRadius: '8px',
                boxShadow: percent > 0 ? `0 0 10px ${percent === 100 ? 'var(--green)' : projectColor}66` : 'none',
                transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }} />
            )}
            {/* Milestone-Markierungen bei 25 / 50 / 75% */}
            {[25, 50, 75].map((milestone) => (
              <div
                key={milestone}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '2px',
                  bottom: '2px',
                  left: `${milestone}%`,
                  width: '1px',
                  background: 'var(--bg)',
                  opacity: percent >= milestone ? 0.3 : 0.15,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </div>

          {/* Status-Label — Effort-Praise statt nur Zahlen */}
          <p style={{
            fontSize: '14px',
            color: percent === 100 ? 'var(--green)' : 'var(--text-secondary)',
            margin: '8px 0 0',
            fontWeight: percent >= 50 ? '600' : '400',
          }}>
            {percent === 100
              ? `Alle ${total} Blöcke durchgearbeitet. Stark.`
              : percent >= 75
              ? `${completed} von ${total} – du bist fast durch.`
              : percent >= 50
              ? `${completed} von ${total} – über die Hälfte geschafft.`
              : percent >= 25
              ? `${completed} von ${total} – guter Start.`
              : percent > 0
              ? `${completed} von ${total} Blöcken geschafft.`
              : total > 0
              ? `Bereit – ${total} ${total === 1 ? 'Block' : 'Blöcke'} warten.`
              : 'Bereit loszulegen.'}
          </p>
        </div>

        {(() => {
          const days = getDaysUntilExam(goalDate);
          if (days === null) return null;
          // ADHS-Designprinzip: var(--red) NIEMALS für Normalzustände.
          // Countdown ist Kontext, kein Alarm – intensiveres Gold statt Rot.
          // 3 Tage: sattes Gold + stärker; 7 Tage: normales Gold; danach: dezent.
          const urgentColor = days <= 3 ? '#F5A623' : days <= 7 ? 'var(--gold)' : 'var(--text-secondary)';
          const urgentBg = days <= 3 ? 'rgba(245,166,35,0.15)' : days <= 7 ? 'rgba(212,168,67,0.10)' : 'var(--bg-card)';
          const label = goalType === 'exam' ? 'Prüfung' : goalType === 'homework' ? 'Abgabe' : 'Termin';
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: urgentBg,
              borderRadius: '14px',
              border: `1px solid ${urgentColor}55`,
              width: '100%',
            }}>
              <span style={{ fontSize: '28px', fontWeight: '800', color: urgentColor, lineHeight: '1' }}>
                {days <= 0 ? '🎯' : days}
              </span>
              <span style={{ fontSize: '15px', color: days <= 7 ? urgentColor : 'var(--text-secondary)', fontWeight: days <= 7 ? '600' : '400' }}>
                {days <= 0 ? `${label}stag – du schaffst das` : days === 1 ? `Tag bis zur ${label}` : `Tage bis zur ${label}`}
              </span>
            </div>
          );
        })()}

        {/* Sprint-Modus Banner */}
        {sprintMode && (
          <div style={{
            width: '100%',
            background: 'rgba(212, 168, 67, 0.08)',
            border: '1px solid rgba(212, 168, 67, 0.35)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>⚡</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Sprint-Modus aktiv
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.45' }}>
                Nur das Wichtigste. Jeder Block max. 20 Minuten.
              </p>
            </div>
          </div>
        )}

        {/* Block Liste */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {safeBlocks.map((b) => {
            const isNext = next && b.id === next.id;
            const isDone = b.status === 'completed';
            const isExpanded = expandedBlock === b.id;
            const color = getBlockColor(b);

            return (
              <div key={b.id} style={{ width: '100%' }}>
                <button
                  onClick={() => setExpandedBlock(isExpanded ? null : b.id)}
                  style={{
                    width: '100%',
                    background: isNext ? 'var(--bg-card)' : 'var(--bg-elevated)',
                    border: isNext
                      ? `1px solid ${color}`
                      : isExpanded
                      ? '1px solid var(--border)'
                      : '1px solid var(--border)',
                    borderRadius: isExpanded ? '12px 12px 0 0' : '14px',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    opacity: isDone && b.confidence === 'sicher' ? 0.7 : 1,
                  }}
                >
                  <BlockDot block={b} subjectColor={color} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: isNext ? '600' : '500',
                      color: 'var(--text-primary)',
                      marginBottom: '2px',
                    }}>
                      {b.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {statusLabel(b)}
                      {b.difficulty && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: b.difficulty === 'schwer' ? '#E07B54' : b.difficulty === 'mittel' ? 'var(--gold)' : 'var(--green)',
                          background: b.difficulty === 'schwer' ? 'rgba(224,123,84,0.12)' : b.difficulty === 'mittel' ? 'rgba(212,168,67,0.12)' : 'rgba(61,158,110,0.12)',
                          borderRadius: '999px',
                          padding: '1px 7px',
                          letterSpacing: '0.02em',
                        }}>
                          {b.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  {isNext && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: color,
                      background: `${color}22`,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}>
                      Jetzt
                    </span>
                  )}
                  <span style={{
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}>
                    ▾
                  </span>
                </button>

                {/* Ausgeklappter Inhalt */}
                {isExpanded && (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    {/* Konzepte falls vorhanden */}
                    {b.cards?.length > 0 ? (
                      <div>
                        <p style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: 'var(--text-secondary)',
                          margin: '0 0 8px',
                        }}>
                          Themen in diesem Block
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {b.cards.map((card, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '14px',
                              color: 'var(--text-secondary)',
                            }}>
                              <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: color,
                                flexShrink: 0,
                              }} />
                              {card.concept || card}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        margin: '0',
                        fontStyle: 'italic',
                      }}>
                        Die Themen siehst du während du lernst.
                      </p>
                    )}

                    {/* Unsichere Punkte falls vorhanden */}
                    {b.uncertainPoints?.length > 0 && (
                      <div>
                        <p style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: 'var(--gold)',
                          margin: '0 0 8px',
                        }}>
                          Noch wiederholen
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {b.uncertainPoints.map((point, i) => (
                            <div key={i} style={{
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              paddingLeft: '12px',
                              borderLeft: '2px solid var(--gold)',
                              lineHeight: '1.4',
                            }}>
                              {point}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Start Button */}
                    <button
                      onClick={() => onStartBlock(b.id)}
                      style={{
                        width: '100%',
                        background: isDone && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
                          ? 'var(--gold)'
                          : isNext ? color : 'var(--bg-card-bright)',
                        color: isDone && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
                          ? '#1a1206'
                          : isNext ? '#1a1206' : 'var(--text-primary)',
                        border: isDone && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
                          ? 'none'
                          : isNext ? 'none' : '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      {isDone ? 'Nochmal lernen' : isNext ? 'Jetzt starten →' : 'Block starten'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {next && !allDone && (
          <Button onClick={() => onStartBlock(next.id)} style={{ width: '100%' }}>
            Weiter mit „{next.title}"
          </Button>
        )}

        {allDone && (
          <p style={{
            color: 'var(--green)',
            fontWeight: '600',
            fontSize: '17px',
            textAlign: 'center',
          }}>
            Alle Blöcke geschafft. Starkes Lernen.
          </p>
        )}

        {flashcardsCount > 0 && (
          <button
            onClick={onViewFlashcards}
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: `1px solid ${flashcardsCount > 5 ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: '14px',
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '24px' }}>🃏</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>
                Karteikarten wiederholen
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
                {flashcardsCount} {flashcardsCount === 1 ? 'Karte' : 'Karten'} warten auf dich
              </p>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>→</span>
          </button>
        )}

        {onViewWeakSpots && (
          <button
            onClick={onViewWeakSpots}
            style={{
              width: '100%',
              background: weakCount > 0 ? 'rgba(212,168,67,0.07)' : 'var(--bg-elevated)',
              border: weakCount > 0 ? '1px solid rgba(212,168,67,0.3)' : '1px solid var(--border)',
              borderRadius: '14px',
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '22px', flexShrink: 0 }}>
              {weakCount > 0 ? '○' : '✓'}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: weakCount > 0 ? 'var(--gold)' : 'var(--text-primary)',
                margin: '0 0 2px',
              }}>
                {weakCount > 0 ? `${weakCount} ${weakCount === 1 ? 'Block' : 'Blöcke'} zum Wiederholen` : 'Mein Lernstand'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
                {weakCount > 0 ? 'Lücken jetzt schließen' : 'Alles auf einen Blick'}
              </p>
            </div>
            <span style={{ color: weakCount > 0 ? 'var(--gold)' : 'var(--text-secondary)', fontSize: '16px' }}>→</span>
          </button>
        )}

        {onViewProjects && (
          <button
            onClick={onViewProjects}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '8px',
              textDecoration: 'underline',
            }}
          >
            Andere Fächer
          </button>
        )}

        {onNewProject && (
          <button
            onClick={onNewProject}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '8px',
              marginTop: '8px',
              textDecoration: 'underline',
            }}
          >
            Neues Fach starten
          </button>
        )}

        {/* Free-Tier-Warnung:
            – isApproachingLimit: ≤ 3 Blöcke übrig → Amber-Banner (Frühwarnung)
            – isFreeLimitReached:  0 Blöcke übrig  → Amber-Banner, stärkerer Text
            ADHS-Design:
            – Kein Rot (emotionale Dysregulation vermeiden)
            – Amber = semantische Warnung, nicht Alarm
            – Frühwarnung bei 3 Blöcken, damit User sich vorbereiten kann
            – Klarer CTA ohne Druck */}
        {(isApproachingLimit(blocksAnalyzedTotal) || isFreeLimitReached(blocksAnalyzedTotal)) && (
          <div
            role="status"
            aria-live="polite"
            style={{
              border: '1.5px solid var(--amber)',
              borderRadius: '14px',
              padding: '14px 16px',
              background: 'rgba(196, 122, 43, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              margin: '4px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--amber)',
              }}>
                {isFreeLimitReached(blocksAnalyzedTotal)
                  ? 'Kostenlose Blöcke aufgebraucht'
                  : `Noch ${getRemainingFreeBlocks(blocksAnalyzedTotal)} kostenlose ${getRemainingFreeBlocks(blocksAnalyzedTotal) === 1 ? 'Block' : 'Blöcke'}`}
              </span>
            </div>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '0',
              lineHeight: '1.5',
            }}>
              {isFreeLimitReached(blocksAnalyzedTotal)
                ? 'Du hast alle 20 kostenlosen Blöcke genutzt. Upgrade für unbegrenztes Lernen.'
                : `Du hast ${blocksAnalyzedTotal} von 20 kostenlosen Blöcken genutzt. Danach ist ein Upgrade nötig.`}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
