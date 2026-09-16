import { useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { getRecommendedBlock } from '../../utils/blockProgress.js';
import { getBlockColor } from '../../utils/subjectColors.js';
import { getRemainingFreeBlocks } from '../../utils/planLimits.js';

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
    return (
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--red)', flexShrink: 0,
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

export default function DashboardScreen({ blocks, recommendedOrder, goalType, goalDate, onStartBlock, onNewProject, onViewWeakSpots, onViewProjects, onSettings, blocksAnalyzedTotal }) {
  const safeBlocks = (blocks || []).filter(Boolean);
  const [expandedBlock, setExpandedBlock] = useState(null);

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
  const next = getRecommendedBlock(safeBlocks, recommendedOrder);
  const weakCount = safeBlocks.filter(b =>
    b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
  ).length;
  const projectColor = safeBlocks[0]?.subject_color || 'var(--gold)';

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: 'clamp(20px, 8vw, 80px)' }}>
      {onSettings && (
        <button
          onClick={onSettings}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          ⚙
        </button>
      )}
      <div className="screen-content" style={{ maxWidth: '560px', gap: '20px' }}>

        <LumoMascot state={allDone ? 'complete' : 'idle'} label="Lumo" />

        {(() => {
          const streak = getStreakDays();
          if (streak < 2) return null;
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--gold)',
              fontWeight: '600',
            }}>
              🔥 {streak} Tage am Stück
            </div>
          );
        })()}

        {/* Fortschritt */}
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '800',
            color: percent === 100 ? 'var(--green)' : 'var(--gold)',
            lineHeight: '1',
            marginBottom: '8px',
          }}>
            {percent}%
          </div>
          {percent > 0 && (
            <div style={{
              height: '10px',
              background: 'var(--bg-card)',
              borderRadius: '6px',
              overflow: 'hidden',
              margin: '0 0 8px',
            }}>
              <div style={{
                height: '100%',
                width: `${percent}%`,
                background: percent === 100 ? 'var(--green)' : projectColor,
                borderRadius: '6px',
                boxShadow: `0 0 8px ${percent === 100 ? 'var(--green)' : projectColor}`,
                transition: 'width 0.6s ease',
              }} />
            </div>
          )}
          {percent === 0 && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
              Bereit loszulegen.
            </p>
          )}
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {completed} von {total} Blöcken geschafft
          </p>
        </div>

        {goalType === 'exam' && (() => {
          const days = getDaysUntilExam(goalDate);
          if (days === null) return null;
          const urgentColor = days <= 3 ? 'var(--red)' : days <= 7 ? 'var(--gold)' : 'var(--text-secondary)';
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'var(--bg-card)',
              borderRadius: '10px',
              border: `1px solid ${urgentColor}44`,
            }}>
              <span style={{ fontSize: '20px', fontWeight: '800', color: urgentColor }}>
                {days <= 0 ? '🎯' : days}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {days <= 0 ? 'Prüfungstag' : days === 1 ? 'Tag bis zur Prüfung' : `Tage bis zur Prüfung`}
              </span>
            </div>
          );
        })()}

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
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {statusLabel(b)} · {b.estimatedMinutes || '?'} Min.
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
                          color: 'var(--red)',
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
                              borderLeft: '2px solid var(--red)',
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
                          ? 'var(--red)'
                          : isNext ? color : 'var(--bg-card-bright)',
                        color: isDone && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
                          ? 'white'
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

        {onViewWeakSpots && (
          <button
            onClick={onViewWeakSpots}
            style={{
              background: 'none',
              border: 'none',
              color: weakCount > 0 ? 'var(--red)' : 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '8px',
              textDecoration: 'underline',
            }}
          >
            {weakCount > 0 ? `${weakCount} zum Wiederholen` : 'Mein Lernstand'}
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

        {blocksAnalyzedTotal > 15 && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            margin: '4px 0',
          }}>
            {getRemainingFreeBlocks(blocksAnalyzedTotal) > 0
              ? `Noch ${getRemainingFreeBlocks(blocksAnalyzedTotal)} kostenlose Blöcke verfügbar.`
              : 'Du hast alle kostenlosen Blöcke genutzt.'}
          </p>
        )}

      </div>
    </div>
  );
}
