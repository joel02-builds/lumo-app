import { useRef, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { getRecommendedBlock } from '../../utils/blockProgress.js';
import { getBlockColor } from '../../utils/subjectColors.js';
import { exportProject, importProject } from '../../utils/projectExport.js';
import { getRemainingFreeBlocks } from '../../utils/planLimits.js';

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

export default function DashboardScreen({ blocks, recommendedOrder, onStartBlock, onNewProject, onViewWeakSpots, onViewProjects, blocksAnalyzedTotal }) {
  const [expandedBlock, setExpandedBlock] = useState(null);
  const importRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError('');
    try {
      await importProject(file);
      window.location.reload();
    } catch (err) {
      setImportError(err.message);
      setImporting(false);
    }
  }

  const total = blocks.length;
  const completed = blocks.filter((b) => b.status === 'completed').length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;
  const next = getRecommendedBlock(blocks, recommendedOrder);
  const weakCount = blocks.filter(b =>
    b.status === 'completed' && (b.confidence === 'unsicher' || b.confidence === 'grosse_luecken')
  ).length;
  const projectColor = blocks[0]?.subject_color || 'var(--gold)';

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: 'clamp(20px, 8vw, 80px)' }}>
      <div className="screen-content" style={{ maxWidth: '560px', gap: '20px' }}>

        <LumoMascot state={allDone ? 'complete' : 'idle'} label="Lumo" />

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

        {/* Block Liste */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {blocks.map((b) => {
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
            Alle Projekte
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
            Neues Projekt starten
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

        <div style={{
          width: '100%',
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          marginTop: '8px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
        }}>
          <button
            onClick={exportProject}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ↓ Backup exportieren
          </button>
          <span style={{ color: 'var(--border)', fontSize: '12px' }}>·</span>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: importing ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
            }}
          >
            {importing ? 'Importiere …' : '↑ Backup importieren'}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
        {importError && (
          <p style={{ color: 'var(--red)', fontSize: '12px', textAlign: 'center', margin: '-4px 0 0' }}>
            {importError}
          </p>
        )}
      </div>
    </div>
  );
}
