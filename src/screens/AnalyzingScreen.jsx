import { useEffect, useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';
import { SkeletonBlockList } from '../components/SkeletonLoader.jsx';

// Die Analyse dauert normal etwa 20 s (die Antwort wird in einem Stück erzeugt, es gibt keinen
// Zwischenstand). Nach 15 s sagen wir ehrlich, dass Lumo noch arbeitet – dasselbe Muster wie
// beim Karten-Skeleton (F026), damit niemand aus Ungeduld neu lädt.
const SLOW_HINT_AFTER_MS = 15000;

const MESSAGES = [
  'Ich schaue mir dein Material an …',
  'Ich erkenne die Struktur …',
  'Ich teile in Lernblöcke auf …',
  'Ich schätze die Schwierigkeit ein …',
  'Fast fertig …',
];

/**
 * AnalyzingScreen — Skeleton-Version
 *
 * Skeleton Screens statt Progress Bar:
 * – Content-shaped Platzhalter zeigen was kommt (Luke Wroblewski 2013)
 * – Wahrgenommene Ladezeit sinkt — ADHS-Nutzer bleiben orientiert
 * – Kein "weißer Bildschirm" — strukturiertes Feedback ab Sekunde 0
 *
 * Gap 1 – "X Blöcke bereit":
 * – Klares Signal wie viel heute ansteht
 * – Psychologisches Framing: Menge normalisieren ("auch 1 Block reicht")
 */
export default function AnalyzingScreen({ blockCount }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 3000);
    return () => clearInterval(msgInterval);
  }, []);

  // Gap 1: Sobald blockCount vorliegt, kurze Verzögerung dann Ergebnis einblenden
  useEffect(() => {
    if (!blockCount || blockCount < 1) return;
    const t = setTimeout(() => setShowResult(true), 400);
    return () => clearTimeout(t);
  }, [blockCount]);

  // Simulierte Block-Anzahl für Skeleton während der Analyse
  // Zeigt 3–4 Platzhalter, unabhängig vom echten Ergebnis
  const skeletonCount = 3;

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '28px', maxWidth: '400px' }}>

        <LumoMascot state={showResult ? 'cheer' : 'thinking'} />

        {/* Status-Text */}
        <div style={{ textAlign: 'center' }}>
          {showResult ? (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: 'var(--gold)',
                margin: '0 0 6px',
                lineHeight: '1.1',
              }}>
                {blockCount} {blockCount === 1 ? 'Block' : 'Blöcke'} bereit
              </h1>
              <p style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                margin: '0',
                lineHeight: '1.5',
              }}>
                {blockCount === 1
                  ? 'Einer reicht. Fang einfach an.'
                  : blockCount <= 3
                  ? 'Das schaffst du heute locker.'
                  : 'Mach so viel du magst — auch einer zählt.'}
              </p>
            </div>
          ) : (
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              margin: '0',
              lineHeight: '1.4',
              minHeight: '24px',
            }}>
              {MESSAGES[msgIndex]}
            </p>
          )}
          {/* Platz ist von Anfang an reserviert (minHeight) → der Hinweis lässt nichts springen. */}
          {!showResult && (
            <p
              role="status"
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                margin: '8px 0 0',
                lineHeight: '1.5',
                minHeight: '20px',
              }}
            >
              {slow && (
                <span style={{ animation: 'fadeIn 0.4s ease' }}>
                  Lumo arbeitet noch, das dauert manchmal 20–30 Sekunden.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Skeleton-Block-Liste — zeigt Content-Struktur während des Ladens */}
        {!showResult && (
          <SkeletonBlockList count={skeletonCount} />
        )}

        {/* Nach Fertigstellung: echte Block-Vorschau würde hier erscheinen */}
        {showResult && (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.5s ease',
          }}>
            {Array.from({ length: blockCount }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(212,168,67,0.06)',
                  border: '1px solid rgba(212,168,67,0.18)',
                  borderRadius: '10px',
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                }}>
                  Block {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
