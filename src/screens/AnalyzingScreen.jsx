import { useEffect, useState } from 'react';
import LumoMascot from '../components/LumoMascot.jsx';

const MESSAGES = [
  'Ich schaue mir dein Material an …',
  'Ich erkenne die Struktur …',
  'Ich teile in Lernblöcke auf …',
  'Ich schätze die Schwierigkeit ein …',
  'Fast fertig …',
];

// Fortschrittsschritte pro Nachricht: simuliert visuellen Fortschritt
// damit ADHS-Nutzer nicht in einem statischen Wartezustand "stecken" bleiben.
// Tatsächliche API-Dauer ist unbekannt – Werte sind bewusst konservativ geschätzt,
// damit der Balken nie bei 100% einfriert bevor die Antwort kommt.
const PROGRESS_STEPS = [0, 18, 36, 58, 78];

/**
 * Gap 1 – "X Blöcke bereit" Kommunikation nach der Analyse.
 *
 * Konkurrenz-Lücke: Kein Wettbewerber kommuniziert explizit wie viel
 * (oder wie wenig!) heute ansteht. Das führt zu Einschätzungsangst:
 * "Wie lange dauert das? Schaffe ich das heute?"
 *
 * Lösung: Sobald die Analyse fertig ist und blockCount übergeben wird,
 * zeigen wir ein klares "X Blöcke bereit" Signal mit psychologischem
 * Framing: Die Menge wird normalisiert – auch 1 Block ist genug.
 *
 * Props:
 *   blockCount?: number  — Anzahl der generierten Blöcke nach Analysis
 */
export default function AnalyzingScreen({ blockCount }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 3000);
    return () => clearInterval(msgInterval);
  }, []);

  // Animierte Punkte als minimaler Aktivitätsindikator
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  // Gap 1: Sobald blockCount vorliegt (Analysis abgeschlossen),
  // kurze Verzögerung dann "X Blöcke bereit" einblenden.
  useEffect(() => {
    if (!blockCount || blockCount < 1) return;
    const t = setTimeout(() => setShowResult(true), 400);
    return () => clearTimeout(t);
  }, [blockCount]);

  const progress = blockCount ? 100 : (PROGRESS_STEPS[msgIndex] ?? 78);

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '24px', maxWidth: '360px' }}>
        <LumoMascot state={showResult ? 'cheer' : 'thinking'} />

        <div style={{ textAlign: 'center' }}>
          {showResult ? (
            /* ── Gap 1: "X Blöcke bereit" ────────────────────────────────────
               Klares Signal wie viel heute ansteht.
               Psychologisches Framing: Menge normalisieren, nicht maximieren.
               Selbst 1 Block = echter Fortschritt. */
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--gold)', margin: '0 0 6px', lineHeight: '1.1' }}>
                {blockCount} {blockCount === 1 ? 'Block' : 'Blöcke'} bereit
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.5' }}>
                {blockCount === 1
                  ? 'Einer reicht. Fang einfach an.'
                  : blockCount <= 3
                  ? 'Das schaffst du heute locker.'
                  : 'Mach so viel du magst — auch einer zählt.'}
              </p>
            </div>
          ) : (
            <h1 style={{ fontSize: '20px', lineHeight: '1.4', minHeight: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {MESSAGES[msgIndex]}
            </h1>
          )}
        </div>

        {/* Fortschrittsbalken – visuelles Feedback dass etwas passiert */}
        <div style={{
          width: '100%',
          height: '4px',
          background: 'var(--bg-elevated)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: showResult ? 'var(--green)' : 'var(--gold)',
            borderRadius: '4px',
            transition: 'width 2.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>

        {!showResult && (
          /* Pulsierende Aktivitätspunkte */
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            letterSpacing: '0.05em',
            margin: '-8px 0 0',
          }}>
            {'·'.repeat(dotCount)}{'  '}Lumo arbeitet
          </p>
        )}
      </div>
    </div>
  );
}
