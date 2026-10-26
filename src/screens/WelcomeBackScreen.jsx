import { useState, useEffect, useMemo } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import Button from '../components/Button.jsx';
import { getRecommendedBlock } from '../utils/blockProgress.js';
import { getDueCards } from '../utils/fsrs.js';

// FSRS-gestützte Fälligkeitserkennung: gruppiert fällige Karten nach Block.
// Gibt { blockId: dueCount } zurück, nur für Blöcke mit ≥1 fälliger Karte.
// Evidenz: Cepeda et al. (2006) – optimale Review-Zeitpunkte verbessern
// Retention signifikant gegenüber fixen Intervallen. FSRS berechnet
// individuell angepasste Intervalle pro Karte; dieser Screen macht das
// erstmals sichtbar statt einer groben Confidence-Heuristik.
function getDueCardsByBlock(flashcards) {
  if (!flashcards?.length) return {};
  const due = getDueCards(flashcards);
  const byBlock = {};
  for (const card of due) {
    const bid = card.blockId || card.block_id;
    if (!bid) continue;
    byBlock[bid] = (byBlock[bid] || 0) + 1;
  }
  return byBlock;
}

// Fallback: naive heuristische Fälligkeit (nur verwendet wenn keine FSRS-Daten vorhanden)
function getBlocksDueTodayHeuristic(blocks) {
  const now = new Date();
  return blocks.filter(b => {
    if (b.status !== 'completed') return false;
    if (!b.completedAt) return false;
    const completed = new Date(b.completedAt);
    const diffDays = Math.floor((now - completed) / (1000 * 60 * 60 * 24));
    if (b.confidence === 'sicher') return diffDays >= 7;
    if (b.confidence === 'unsicher') return diffDays >= 1;
    if (b.confidence === 'grosse_luecken') return diffDays >= 0;
    return false;
  });
}

function shouldAskExamResult(blocks, goalType, examResult, examResultAskedAt) {
  if (goalType !== 'exam') return false;
  if (examResult) return false;
  const allDone = blocks.length > 0 && blocks.every(b => b.status === 'completed');
  if (!allDone) return false;
  if (examResultAskedAt) {
    const daysSince = Math.floor((new Date() - new Date(examResultAskedAt)) / (1000 * 60 * 60 * 24));
    if (daysSince < 3) return false;
  }
  return true;
}

function getDaysSinceLastLearning(blocks) {
  const lastCompleted = blocks
    .filter(b => b.completedAt)
    .map(b => new Date(b.completedAt))
    .sort((a, b) => b - a)[0];
  if (!lastCompleted) return null;
  return Math.floor((new Date() - lastCompleted) / (1000 * 60 * 60 * 24));
}

// Abwesenheits-Adaption: Gibt zurück ob und wie lange der Nutzer weg war
function getAbsenceInfo(blocks) {
  const days = getDaysSinceLastLearning(blocks);
  if (!days || days < 2) return null; // unter 2 Tage = normal, keine Adaption nötig
  return {
    days,
    isLong: days >= 7,  // "lange" Abwesenheit = intensivere Nachricht
    message: days === 2
      ? 'Du warst 2 Tage weg.'
      : days < 7
      ? `Du warst ${days} Tage weg.`
      : days < 14
      ? `Du warst ${days} Tage weg.`
      : `Du warst ${days} Tage nicht hier.`,
  };
}

function getLernzeitHinweis() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) {
    return { show: true, text: 'Morgens direkt nach dem Aufwachen ist das Gehirn noch nicht auf Touren. Falls möglich, lern heute Nachmittag.' };
  }
  if (hour >= 14 && hour < 18) {
    return { show: true, text: 'Nachmittags bist du oft am fokussiertesten. Guter Zeitpunkt.' };
  }
  if (hour >= 22 || hour < 6) {
    return { show: true, text: 'Spät abends lernt sich schwerer. Kurz und gezielt – dann schlafen.' };
  }
  return { show: false, text: '' };
}

export default function WelcomeBackScreen({ blocks, flashcards, recommendedOrder, subjectHistory, goalType, goalDate, sprintMode, examResult, examResultAskedAt, onStartBlock, onGoToDashboard, onNewProject, onAskExamResult }) {
  const safeBlocks = (blocks || []).filter(Boolean);
  const total = safeBlocks.length;
  const completed = safeBlocks.filter((b) => b.status === 'completed').length;
  const remaining = total - completed;
  const next = getRecommendedBlock(safeBlocks, recommendedOrder);
  const allDone = total > 0 && completed === total;
  const topSubject = subjectHistory
    ?.slice()
    .sort((a, b) => b.count - a.count)[0]?.subject;

  // Abwesenheits-Adaption
  const absenceInfo = !allDone ? getAbsenceInfo(safeBlocks) : null;

  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lumo_streak');
      const streak = raw ? JSON.parse(raw) : { days: 0, lastDate: null };
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (streak.lastDate === today) {
        // Bereits heute gelernt – Streak unverändert
        setStreakDays(streak.days);
      } else if (streak.lastDate === yesterday) {
        // Gestern gelernt – Streak weiterführen
        const newStreak = { days: streak.days + 1, lastDate: today };
        localStorage.setItem('lumo_streak', JSON.stringify(newStreak));
        setStreakDays(newStreak.days);
      } else {
        // Länger nicht gelernt – Streak bricht ab, neu bei 1 heute
        // (zeige 0 bis der Nutzer heute wirklich lernt – passiert nach dem ersten Block)
        const newStreak = { days: 0, lastDate: null };
        localStorage.setItem('lumo_streak', JSON.stringify(newStreak));
        setStreakDays(0);
      }
    } catch {
      setStreakDays(1);
    }
  }, []);

  function getGreeting() {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    const morningGreetings = [
      'Guten Morgen.',
      'Morgen. Bereit?',
      'Guter Start in den Tag.',
    ];
    const afternoonGreetings = [
      'Willkommen zurück.',
      'Da bist du.',
      'Schön dass du da bist.',
      'Auf geht\'s.',
    ];
    const eveningGreetings = [
      'Guten Abend.',
      'Noch ein Block heute?',
      'Abend. Ich bin dabei.',
    ];

    const pool = hour < 12 ? morningGreetings : hour < 18 ? afternoonGreetings : eveningGreetings;

    // Deterministisch basierend auf Tag damit es nicht bei jedem Reload wechselt
    return pool[day % pool.length];
  }

  // Sprint-Modus: Tage bis zur Prüfung berechnen
  let sprintDaysUntil = null;
  if (sprintMode && goalDate) {
    const now = new Date(); now.setHours(0,0,0,0);
    const exam = new Date(goalDate); exam.setHours(0,0,0,0);
    sprintDaysUntil = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
  }
  const sprintDayWord = sprintDaysUntil === null ? 'bald'
    : sprintDaysUntil <= 0 ? 'heute'
    : sprintDaysUntil === 1 ? 'morgen'
    : `in ${sprintDaysUntil} Tagen`;

  // Due-Pile: FSRS-gestützt (Cepeda 2006), Fallback auf Heuristik wenn keine Karten vorhanden
  // Nur ohne Abwesenheit zeigen – bei Rückkehr nach Pause zählt erstmal Wiedereinstieg
  const dueCardsByBlock = useMemo(
    () => absenceInfo ? {} : getDueCardsByBlock(flashcards),
    [flashcards, absenceInfo]
  );
  const hasFsrsData = flashcards?.some(c => c.stability > 0 || c.difficulty > 0);
  // Blocks mit fälligen FSRS-Karten (primär) oder heuristische Fälligkeit (Fallback)
  const dueBlocks = useMemo(() => {
    if (absenceInfo) return [];
    if (hasFsrsData) {
      // FSRS-Modus: nur Blöcke mit tatsächlich fälligen Karten
      return safeBlocks.filter(b => b.status === 'completed' && dueCardsByBlock[b.id] > 0);
    }
    // Fallback: alte Heuristik für Nutzer ohne FSRS-Daten
    return getBlocksDueTodayHeuristic(safeBlocks);
  }, [safeBlocks, dueCardsByBlock, hasFsrsData, absenceInfo]);
  const lernzeitHinweis = getLernzeitHinweis();

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '480px', paddingTop: '24px' }}>

        {/* ── HERO-ZONE: Lumo + Greeting + primärer CTA ─────────────────── */}
        {/* Kein Entscheidungsbaum. Eine Aktion. Sofort sichtbar. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>

          <LumoMascot
            state={
              allDone
                ? 'complete'
                : absenceInfo?.isLong
                ? 'absence'       // > 7 Tage weg → nachdenklich-freudige Rückkehr
                : streakDays >= 7
                ? 'streak'        // 7-Tage-Streak-Meilenstein → Jubel-Pose
                : dueBlocks.length > 0
                ? 'cheer'         // Fällige Karten → motivierend
                : 'idle'          // Standard
            }
            pulseOnce={streakDays >= 7 || streakDays % 7 === 0 && streakDays > 0}
          />

          {/* Greeting – kurz und direkt */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '28px', marginBottom: '6px', lineHeight: '1.2' }}>
              {allDone ? '🎉 Alles geschafft!' : getGreeting()}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', margin: '0', lineHeight: '1.5' }}>
              {allDone
                ? `Du hast alle ${total} Blöcke gemeistert.`
                : absenceInfo
                ? 'Schön dass du wieder da bist.'
                : completed > 0
                ? `${completed} von ${total} Blöcken geschafft.`
                : null
              }
            </p>
          </div>

          {/* ── PRIMÄRER CTA – sofort sichtbar, ohne scrollen ── */}
          {next && !allDone && (
            <div style={{ width: '100%' }}>
              {/* Block-Preview über dem Button */}
              <div style={{
                width: '100%',
                background: 'var(--bg-card-bright)',
                border: '1px solid rgba(212, 168, 67, 0.35)',
                borderBottom: 'none',
                borderRadius: '16px 16px 0 0',
                padding: '14px 20px 12px',
              }}>
                <p style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  margin: '0 0 4px',
                }}>
                  {absenceInfo ? 'Lumo hat gewählt' : 'Als nächstes'}
                </p>
                <p style={{
                  fontSize: '17px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: '0',
                  lineHeight: '1.3',
                }}>
                  {next.title}
                </p>
                {absenceInfo && (
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    margin: '6px 0 0',
                    lineHeight: '1.4',
                  }}>
                    Das ist heute das Wichtigste.
                  </p>
                )}
              </div>
              {/* CTA-Button direkt drunter – nahtlos verbunden */}
              <button
                onClick={() => onStartBlock(next.id)}
                style={{
                  width: '100%',
                  background: 'var(--gold)',
                  color: '#1a1206',
                  border: 'none',
                  borderRadius: '0 0 16px 16px',
                  padding: '18px 24px',
                  fontSize: '17px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {absenceInfo ? 'Jetzt starten →' : 'Weiter lernen →'}
              </button>
            </div>
          )}

          {/* Alle-Blöcke-Fertig */}
          {allDone && (
            <Button onClick={onNewProject} style={{ width: '100%' }}>
              Neues Thema starten
            </Button>
          )}
        </div>

        {/* ── SEKUNDÄRE INFOS: alles was nicht für den Start nötig ist ── */}

        {/* Gap 2 – "Pause ohne Strafe"
            Konkurrenz-Lücke: Anki bricht Streak ab und zeigt sofort massive Review-Piles.
            Kein Konkurrent kommuniziert explizit, dass Pausen in Ordnung sind.
            ADHS-Evidenz: Shaming/Streak-Verlust triggert Vermeidungsverhalten
            (Barkley 1997: emotionale Dysregulation → Rückzug statt Wiedereinstieg).
            Lösung: Normalisieren statt Beschämen. Kein "du hast X Tage verpasst". */}
        {absenceInfo && (
          <div style={{
            width: '100%',
            background: absenceInfo.isLong ? 'rgba(61, 158, 110, 0.07)' : 'rgba(212, 168, 67, 0.06)',
            border: `1px solid ${absenceInfo.isLong ? 'rgba(61, 158, 110, 0.25)' : 'rgba(212, 168, 67, 0.2)'}`,
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0', lineHeight: '1.4' }}>
              {absenceInfo.isLong
                ? 'Pausen gehören dazu.'
                : 'Du bist zurück. Das zählt.'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.6' }}>
              {absenceInfo.isLong
                ? `${absenceInfo.days} Tage Pause — kein Problem. Ich habe einen sanften Wiedereinstieg vorbereitet. Ein Block reicht heute.`
                : `${absenceInfo.days} Tage weg — ganz normal. Ich zeige dir genau wo es weitergeht.`}
            </p>
            {/* Explizit kein Streak-Druck kommunizieren */}
            <p style={{ fontSize: '12px', color: absenceInfo.isLong ? 'var(--green)' : 'var(--text-secondary)', margin: '0', fontStyle: 'italic', opacity: 0.8 }}>
              {absenceInfo.isLong
                ? '✓ Kein Streak-Verlust zählt hier. Nur das Lernen.'
                : 'Regelmäßigkeit entsteht über Zeit — nicht über perfekte Serien.'}
            </p>
          </div>
        )}

        {/* Sprint-Modus */}
        {sprintMode && (
          <div style={{
            width: '100%',
            background: 'rgba(212, 168, 67, 0.07)',
            border: '1px solid rgba(212, 168, 67, 0.3)',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚡</span>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>
              <span style={{ fontWeight: '700', color: 'var(--gold)' }}>Sprint-Modus</span> – Prüfung {sprintDayWord}.
            </p>
          </div>
        )}

        {/* Prüfungsergebnis abfragen */}
        {shouldAskExamResult(safeBlocks, goalType, examResult, examResultAskedAt) && (
          <button
            onClick={onAskExamResult}
            style={{
              width: '100%',
              background: 'rgba(212, 168, 67, 0.08)',
              border: '1px solid rgba(212, 168, 67, 0.35)',
              borderRadius: '12px',
              padding: '14px 18px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Wie lief die Prüfung?
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0' }}>
              Tippe um es Lumo zu erzählen →
            </p>
          </button>
        )}

        {/* Due-Pile – FSRS-gestützt, nur ohne Abwesenheit, nach dem Haupt-CTA
            Evidenz: Cepeda et al. 2006 – Spacing-Effekt: Karten zum optimalen
            Zeitpunkt zu wiederholen verdoppelt die Retentionsrate gegenüber
            Massed Practice. Die Karten-Anzahl gibt konkretes Gewicht: nicht
            "irgendwas ist fällig", sondern "7 Karten brauchen dich". */}
        {dueBlocks.length > 0 && (
          <div style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                margin: '0',
              }}>
                Auch fällig
              </p>
              {hasFsrsData && (
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0', opacity: 0.6 }}>
                  {Object.values(dueCardsByBlock).reduce((s, n) => s + n, 0)} Karten
                </p>
              )}
            </div>
            {dueBlocks.slice(0, 2).map(b => {
              const cardCount = dueCardsByBlock[b.id];
              return (
                <button
                  key={b.id}
                  onClick={() => onStartBlock(b.id)}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
                    {b.title}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {cardCount > 0 && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--gold)',
                        background: 'rgba(212,168,67,0.12)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                      }}>
                        {cardCount} {cardCount === 1 ? 'Karte' : 'Karten'}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>→</span>
                  </span>
                </button>
              );
            })}
            {dueBlocks.length > 2 && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0', textAlign: 'center' }}>
                + {dueBlocks.length - 2} weitere
              </p>
            )}
          </div>
        )}

        {/* Streak-Meilenstein Banner — erscheint bei 7/14/21/30 Tagen */}
        {streakDays > 0 && streakDays % 7 === 0 && (
          <div style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.05) 100%)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: '14px',
            padding: '14px 18px',
            textAlign: 'center',
            animation: 'fadeIn 0.5s ease',
          }}>
            <p style={{ fontSize: '18px', margin: '0 0 4px' }}>
              {streakDays === 7 ? '🎉' : streakDays === 14 ? '⚡' : streakDays === 21 ? '🌟' : '🏆'}
            </p>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gold)', margin: '0 0 2px' }}>
              {streakDays === 7 && '7 Tage am Stück!'}
              {streakDays === 14 && 'Zwei Wochen durch!'}
              {streakDays === 21 && '21 Tage – Gewohnheit gebildet!'}
              {streakDays >= 30 && `${streakDays} Tage – beeindruckend.`}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
              {streakDays === 7 && 'Eine Woche konsequent gelernt. Weiter so.'}
              {streakDays === 14 && 'Das Gehirn baut gerade echte Strukturen auf.'}
              {streakDays === 21 && 'Nach 21 Tagen ist Lernen zur echten Gewohnheit geworden.'}
              {streakDays >= 30 && 'Langfristiges Lernen ist das Wirksamste was du tun kannst.'}
            </p>
          </div>
        )}

        {/* Streak + Lernzeit-Hinweis – ganz unten, nur Kontext */}
        {(streakDays >= 2 || lernzeitHinweis.show) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
            {streakDays >= 2 && streakDays % 7 !== 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', fontStyle: 'italic' }}>
                {streakDays < 7
                  ? `Ich bin seit ${streakDays} Tagen dabei.`
                  : streakDays < 30
                  ? `Wir lernen seit ${streakDays} Tagen zusammen.`
                  : `${streakDays} Tage. Du machst das wirklich.`
                }
              </p>
            )}
            {lernzeitHinweis.show && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0', fontStyle: 'italic', opacity: '0.75' }}>
                {lernzeitHinweis.text}
              </p>
            )}
          </div>
        )}

        {/* Navigation – dezent, kein visueller Wettbewerb mit dem CTA */}
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
          <button className="text-link" onClick={onGoToDashboard}>
            Alle Blöcke
          </button>
          <button className="text-link" onClick={onNewProject}>
            Neues Fach
          </button>
        </div>

      </div>
    </div>
  );
}
