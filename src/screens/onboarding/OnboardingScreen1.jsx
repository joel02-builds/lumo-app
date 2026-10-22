/**
 * OnboardingScreen1 — Lumo-Intro + Material-Upload
 *
 * Design-Entscheidungen:
 *
 * 1. VALUE BEFORE ASK
 *    Studenten laden nichts hoch wenn sie nicht wissen was sie dafür bekommen.
 *    Deshalb: 3 konkrete Versprechen BEVOR das Formular erscheint.
 *    (Evidence: Nielsen "show value first", Duolingo's "make first step feel obvious")
 *
 * 2. DEMO-FIRST ONBOARDING (Audit #3)
 *    "Erst mal ausprobieren" → zeigt den kompletten Lumo-Loop (~60s) bevor das
 *    Formular erscheint. User sieht: Analyse → Blöcke → Chat → Check → Abschluss.
 *    Gescriptet, kein echter API-Call. Endet mit CTA zum eigenen Material.
 *
 * 3. DIREKTER ÜBERGANG ZUM NUTZEN
 *    Sobald der User "Los" klickt, erscheint das Formular — kein separater Screen.
 *    Reduziert Dropout zwischen Versprechen und Aktion.
 *
 * 4. DEMO-MATERIAL bleibt (Zeigt sofort was Lumo tut, ohne eigenes Material)
 *
 * ADHS-Design:
 * – Keine roten Fehlertexte
 * – Keine Überwältigung durch zu viele Felder auf einmal
 * – Klarer Fokus: immer nur eine Sache pro Moment
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { readFileAsBase64, readFileAsText } from '../../utils/fileReader.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MIN_WORDS = 100;
const MAX_CHARS = 50000;

const DEMO_MATERIAL = {
  topic: 'Neurobiologie – Synaptische Übertragung',
  text: `Die synaptische Übertragung ist der Grundmechanismus der neuronalen Kommunikation im Nervensystem.

An einer chemischen Synapse löst ein Aktionspotential, das im präsynaptischen Neuron ankommt, die Ausschüttung von Neurotransmittern aus. Diese werden in synaptischen Vesikeln gespeichert, die sich an der präsynaptischen Membran befinden. Bei Depolarisation öffnen sich spannungsabhängige Calciumkanäle (Ca²⁺), Calcium strömt ein, und die Vesikel fusionieren mit der Membran (Exozytose).

Die ausgeschütteten Neurotransmitter (z.B. Glutamat, GABA, Dopamin, Serotonin) diffundieren über den synaptischen Spalt und binden an spezifische Rezeptoren der postsynaptischen Membran. Dies führt zur Öffnung von Ionenkanälen (ionotrope Rezeptoren) oder zur Aktivierung intrazellulärer Signalkaskaden (metabotrope Rezeptoren).

Exzitatorische Neurotransmitter wie Glutamat erhöhen die Wahrscheinlichkeit eines Aktionspotentials im postsynaptischen Neuron (EPSP – exzitatorisches postsynaptisches Potential). Inhibitorische Neurotransmitter wie GABA verringern diese Wahrscheinlichkeit (IPSP – inhibitorisches postsynaptisches Potential).

Wichtige Eigenschaften der Synapse:
- Zeitliche Summation: mehrere EPSP kurz nacheinander summieren sich
- Räumliche Summation: EPSP von verschiedenen Synapsen addieren sich
- Langzeitpotenzierung (LTP): Wiederholte Aktivierung stärkt synaptische Verbindungen — Grundlage des Lernens
- Synaptische Plastizität: Synapsen können sich in Stärke und Struktur anpassen

Neurotransmitter-Abbau: Nach der Wirkung werden Transmitter durch Enzyme abgebaut (z.B. Acetylcholinesterase bei Acetylcholin) oder durch Wiederaufnahmepumpen in die präsynaptische Zelle zurückgeholt (z.B. Serotonin-Reuptake-Transporter — Angriffspunkt von Antidepressiva wie SSRIs).

ADHS und Dopamin: Bei ADHS ist das dopaminerge System verändert. Dopamin-Reuptake-Transporter (DAT) ist überaktiv, sodass Dopamin zu schnell wieder aufgenommen wird. Methylphenidat (Ritalin) blockiert DAT und verlängert damit die Wirkung von Dopamin im synaptischen Spalt.`,
};

function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

// ── Demo-Steps für den interaktiven Onboarding-Walkthrough ─────────────────
// Jeder Schritt simuliert eine Phase des echten Lumo-Loops.
// Auto-advance nach DEMO_STEP_MS — User kann auch selbst weiterklicken.
const DEMO_STEP_MS = 3000;

const DEMO_STEPS = [
  {
    id: 'analyze',
    icon: '⚙️',
    label: 'Lumo analysiert dein Material',
    mascot: 'thinking',
    content: (
      <div style={{ width: '100%' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
          Dein Skript wird gelesen …
        </p>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {['Neurobiologie – Synaptische Übertragung', '8 Seiten · ~2.400 Wörter', 'Schwierigkeitsgrad: Mittel'].map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)', animation: `lumo-demo-pulse 1.2s ease-in-out ${i * 0.25}s infinite` }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{line}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'blocks',
    icon: '📦',
    label: 'Lumo zerlegt es in lernbare Blöcke',
    mascot: 'learning',
    content: (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { title: 'Was ist eine Synapse?', diff: 'leicht' },
          { title: 'Neurotransmitter & Rezeptoren', diff: 'mittel' },
          { title: 'Langzeitpotenzierung (LTP)', diff: 'schwer' },
        ].map((b, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 14px',
            animation: `fadeIn 0.35s ease ${i * 0.15}s both`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>📦</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{b.title}</span>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: b.diff === 'schwer' ? 'var(--amber)' : b.diff === 'mittel' ? 'var(--gold)' : 'var(--green)',
              background: b.diff === 'schwer' ? 'var(--amber-soft)' : b.diff === 'mittel' ? 'rgba(212,168,67,0.12)' : 'rgba(61,158,110,0.12)',
              borderRadius: '999px',
              padding: '3px 9px',
            }}>
              {b.diff}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'chat',
    icon: '💬',
    label: 'Lumo erklärt — du fragst',
    mascot: 'learning',
    content: (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          alignSelf: 'flex-start',
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: '4px 16px 16px 16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--text-primary)',
          animation: 'fadeIn 0.3s ease',
        }}>
          Ein Neurotransmitter ist ein chemischer Botenstoff, der Signale zwischen Nervenzellen überträgt. Stell dir vor, zwei Neurone reden miteinander — der Transmitter ist die Nachricht.
        </div>
        <div style={{
          alignSelf: 'flex-end',
          maxWidth: '80%',
          padding: '12px 16px',
          borderRadius: '16px 4px 16px 16px',
          background: 'var(--gold)',
          color: '#1a1206',
          fontSize: '14px',
          fontWeight: '500',
          animation: 'fadeIn 0.3s ease 0.4s both',
        }}>
          Und wie kommt die Nachricht rüber?
        </div>
        <div style={{
          alignSelf: 'flex-start',
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: '4px 16px 16px 16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--text-primary)',
          animation: 'fadeIn 0.3s ease 0.9s both',
        }}>
          Per Exozytose — Bläschen (Vesikel) mit Transmittern verschmelzen mit der Membran und schütten den Inhalt in den synaptischen Spalt. 🧪
        </div>
      </div>
    ),
  },
  {
    id: 'check',
    icon: '🧠',
    label: 'Lumo prüft: Hast du es wirklich?',
    mascot: 'learning',
    content: (
      <div style={{ width: '100%' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(212,168,67,0.3)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, lineHeight: '1.4' }}>
            Erkläre kurz: Was passiert bei der synaptischen Übertragung?
          </p>
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            fontStyle: 'italic',
          }}>
            „Ein Signal kommt an, Calcium öffnet sich, Vesikel fusionieren, Transmitter werden ausgeschüttet, und das Nachbarneuron empfängt das Signal über Rezeptoren …"
          </div>
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(61,158,110,0.08)',
            border: '1px solid rgba(61,158,110,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--green)' }}>Sehr gut — der Mechanismus sitzt.</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'done',
    icon: '🎉',
    label: 'Das war Lumo.',
    mascot: 'cheer',
    content: null, // Handled separately
  },
];

// Was Lumo konkret tut — gezeigt als kurze visuelle Karten vor dem Formular
const VALUE_PROPS = [
  {
    icon: '📦',
    headline: 'Dein Material. Aufgeteilt.',
    body: 'Lumo zerlegt alles in kleine lernbare Blöcke. Kein endloses Durchlesen mehr.',
  },
  {
    icon: '💬',
    headline: 'Fragen. Sofort beantwortet.',
    body: 'Nicht verstanden? Frag einfach. Lumo erklärt solange, bis es sitzt.',
  },
  {
    icon: '🧠',
    headline: 'Erklär es selbst. Dann weißt du es.',
    body: 'Lumo testet dich mit der Feynman-Technik — dem wirksamsten Lernprinzip.',
  },
];

export default function OnboardingScreen1({ onNext, onShowLegal }) {
  // 'hook'      → Identifikationsmoment: benennt den Lernschmerz (1.8s auto-weiter)
  // 'intro'     → Lumo-Einführungsmoment (1.8s auto-weiter)
  // 'value'     → 3 Value Props werden gezeigt
  // 'demo'      → Interaktiver Walkthrough des Lumo-Loops (~60s) — Demo-First Onboarding
  // 'form'      → Formular erscheint
  const [phase, setPhase] = useState('hook');

  // Demo-Phase State: Schritt-Index + Auto-Advance
  const [demoStep, setDemoStep] = useState(0);
  const demoTimerRef = useRef(null);

  const [topic, setTopic] = useState('');
  const [fileName, setFileName] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileMediaType, setFileMediaType] = useState('');
  const [fileError, setFileError] = useState('');
  const [truncationNotice, setTruncationNotice] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const inputRef = useRef(null);

  // Hook-Moment: nach 2.2s automatisch zu Intro
  useEffect(() => {
    if (phase !== 'hook') return;
    const t = setTimeout(() => setPhase('intro'), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // Intro-Moment: nach 1.8s automatisch zu Value-Phase
  useEffect(() => {
    if (phase !== 'intro') return;
    const t = setTimeout(() => setPhase('value'), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  // Demo-Phase: Auto-Advance je Schritt
  // Letzter Schritt (done) hat kein Auto-Advance — User muss aktiv wählen
  const advanceDemoStep = useCallback(() => {
    setDemoStep((s) => {
      const next = s + 1;
      return next < DEMO_STEPS.length ? next : s;
    });
  }, []);

  useEffect(() => {
    if (phase !== 'demo') return;
    const isLastStep = demoStep === DEMO_STEPS.length - 1;
    if (isLastStep) return; // Kein Auto-Advance auf dem letzten Schritt
    demoTimerRef.current = setTimeout(advanceDemoStep, DEMO_STEP_MS);
    return () => clearTimeout(demoTimerRef.current);
  }, [phase, demoStep, advanceDemoStep]);

  function startDemo() {
    setDemoStep(0);
    setPhase('demo');
  }

  function applyMaterialText(rawText) {
    if (rawText.length > MAX_CHARS) {
      setMaterialText(rawText.slice(0, MAX_CHARS));
      setTruncationNotice(true);
    } else {
      setMaterialText(rawText);
      setTruncationNotice(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    setUsingDemo(false);

    const isPdf = file.type === 'application/pdf';
    const isText = file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name);

    if (!isPdf && !isText) {
      setFileError('Bitte lade eine PDF- oder Textdatei hoch.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Die Datei ist zu groß (max. 25 MB).');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    try {
      if (isPdf) {
        const base64 = await readFileAsBase64(file);
        setFileBase64(base64);
        setFileMediaType('application/pdf');
        setMaterialText('');
        setTruncationNotice(false);
      } else {
        const text = await readFileAsText(file);
        applyMaterialText(text);
        setFileBase64('');
        setFileMediaType('');
      }
      setFileName(file.name);
    } catch {
      setFileError('Die Datei konnte nicht gelesen werden. Versuch es nochmal.');
    }
  }

  function removeFile() {
    setFileName('');
    setMaterialText('');
    setFileBase64('');
    setFileMediaType('');
    setFileError('');
    setTruncationNotice(false);
    setUsingDemo(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function useDemo() {
    setTopic(DEMO_MATERIAL.topic);
    setMaterialText(DEMO_MATERIAL.text);
    setFileName('');
    setFileBase64('');
    setFileMediaType('');
    setFileError('');
    setUsingDemo(true);
  }

  const hasPdf = Boolean(fileBase64 && fileMediaType === 'application/pdf');
  const wordCount = countWords(materialText);
  const hasAnyMaterial = hasPdf || materialText.trim().length > 0;

  let materialError = null;
  if (!hasAnyMaterial) {
    materialError = 'Bitte gib dein Lernmaterial ein.';
  } else if (!hasPdf && wordCount < MIN_WORDS) {
    materialError = 'Das ist etwas wenig für Lumo. Füge mehr Material hinzu.';
  }

  function handleNext() {
    if (!topic.trim() || materialError) {
      setAttemptedSubmit(true);
      return;
    }
    onNext({ topic: topic.trim(), materialText, fileName, fileBase64, fileMediaType });
  }

  // ── Phase: HOOK ──
  // Benennt den Schmerz bevor Lumo sich vorstellt.
  // Ziel: Wiedererkennung in 2 Sekunden — "Das bin ich."
  if (phase === 'hook') {
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '0', justifyContent: 'center', padding: '0 28px' }}>
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s ease' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: '24px',
              opacity: 0.75,
            }}>
              Kennst du das?
            </p>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '800',
              lineHeight: '1.4',
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Du hast alles.<br />
              <span style={{
                color: 'var(--text-secondary)',
                fontWeight: '400',
                fontSize: '20px',
                letterSpacing: '-0.015em',
              }}>
                Skript, Folien, Mitschriften&nbsp;…
              </span><br />
              <span style={{
                color: 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '24px',
              }}>
                Aber wo fängst du an?
              </span>
            </h1>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: INTRO ──
  if (phase === 'intro') {
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '20px' }}>
          <LumoMascot state="cheer" size="large" label="Lumo" glowPulse />
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
            <h1 style={{ fontSize: '30px', fontWeight: '800', lineHeight: '1.2', marginBottom: '10px', letterSpacing: '-0.03em' }}>
              Hallo. Ich bin Lumo.
            </h1>
            <p style={{
              color: 'var(--gold)',
              fontWeight: '600',
              fontSize: '18px',
              margin: 0,
              opacity: 0.9,
            }}>
              Dein KI-Lernbegleiter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: VALUE ──
  if (phase === 'value') {
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '22px', maxWidth: '460px', animation: 'fadeIn 0.4s ease' }}>
          <LumoMascot state="idle" size="medium" label="Lumo" />

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', lineHeight: '1.3', fontWeight: '800', letterSpacing: '-0.025em' }}>
              Lad dein Skript hoch.<br />
              <span style={{ color: 'var(--gold)' }}>Lumo macht den Rest.</span>
            </h1>
          </div>

          {/* Value Props — mit visuellem Gewicht und Differenzierung */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {VALUE_PROPS.map((v, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  background: i === 0 ? 'rgba(212, 168, 67, 0.06)' : 'var(--bg-card)',
                  border: i === 0 ? '1px solid rgba(212, 168, 67, 0.25)' : '1px solid var(--border)',
                  borderLeft: i === 0 ? '3px solid var(--gold)' : '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  animation: `fadeIn 0.45s ease ${i * 0.12}s both`,
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--bg-card-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}>
                  {v.icon}
                </div>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '3px',
                    lineHeight: '1.3',
                  }}>
                    {v.headline}
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5',
                    margin: 0,
                  }}>
                    {v.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setPhase('form')}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #e0b34a 0%, var(--gold) 60%, #c8952e 100%)',
                color: '#1a1206',
                border: 'none',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '17px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(212, 168, 67, 0.35)',
                letterSpacing: '-0.01em',
                transition: 'filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
            >
              Material hochladen →
            </button>
            <button
              onClick={startDemo}
              style={{
                width: '100%',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px dashed rgba(212,168,67,0.35)',
                borderRadius: '14px',
                padding: '11px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,67,0.7)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,168,67,0.35)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Erst mal ausprobieren ✦
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: DEMO ──
  // Interaktiver Walkthrough des Lumo-Loops.
  // Kein echter API-Call — vollständig gescriptet. ~60s.
  // Ziel: User versteht intuitiv was Lumo tut, bevor er eigenes Material hochlädt.
  if (phase === 'demo') {
    const step = DEMO_STEPS[demoStep];
    const isLastStep = demoStep === DEMO_STEPS.length - 1;
    // Progress: erster Schritt = 20%, letzter = 100%
    const progress = ((demoStep + 1) / DEMO_STEPS.length) * 100;

    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '20px', maxWidth: '440px', animation: 'fadeIn 0.3s ease' }}>

          {/* Progress Bar */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8 }}>
                So funktioniert Lumo
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {demoStep + 1} / {DEMO_STEPS.length}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--bg-card)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #c97f12, var(--gold))',
                borderRadius: '999px',
                transition: 'width 0.5s ease',
                boxShadow: '0 0 8px rgba(212, 168, 67, 0.5)',
              }} />
            </div>
          </div>

          {/* Mascot + Step Label */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <LumoMascot state={step.mascot} size={isLastStep ? 'large' : 'small'} label={isLastStep ? 'Lumo' : ''} />
            {isLastStep ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px' }}>Das war Lumo.</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                  In 60 Sekunden hast du gesehen, wie Lumo aus deinem Skript<br />
                  eine komplette Lernsession macht — mit Erklärung, Chat und Check.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '20px' }}>{step.icon}</span>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '6px 0 0' }}>
                  {step.label}
                </p>
              </div>
            )}
          </div>

          {/* Step Content */}
          {!isLastStep && step.content}

          {/* Navigation */}
          {isLastStep ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => setPhase('form')}
                style={{
                  width: '100%',
                  background: 'var(--gold)',
                  color: '#1a1206',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '15px',
                  fontSize: '17px',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                Eigenes Material hochladen →
              </button>
              <button
                onClick={() => { useDemo(); setPhase('form'); }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '11px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Mit Beispiel-Material starten
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPhase('value')}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '11px 16px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ← Zurück
              </button>
              <button
                onClick={() => {
                  clearTimeout(demoTimerRef.current);
                  advanceDemoStep();
                }}
                style={{
                  flex: 1,
                  background: 'var(--gold)',
                  color: '#1a1206',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '11px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Weiter →
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes lumo-demo-pulse {
            0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1.15); }
          }
        `}</style>
      </div>
    );
  }

  // ── Phase: FORM ──
  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '16px', maxWidth: '460px', animation: 'fadeIn 0.35s ease' }}>

        <div style={{ textAlign: 'center' }}>
          <LumoMascot state="idle" size="medium" label="Lumo" />
          <h1 style={{ fontSize: '22px', fontWeight: '800', marginTop: '14px', marginBottom: '6px', lineHeight: '1.25', letterSpacing: '-0.025em' }}>
            Was lernst du gerade?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
            Thema eingeben, Material einfügen — Lumo übernimmt den Rest.
          </p>
        </div>

        {/* Thema-Eingabe */}
        <input
          type="text"
          id="topic-input"
          aria-label="Lernthema eingeben"
          placeholder="Thema, z. B. Biologie – Zellbiologie"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ width: '100%' }}
          autoFocus
        />

        {/* Material-Eingabe */}
        {!hasPdf && !usingDemo && (
          <textarea
            id="material-input"
            aria-label="Lernmaterial einfügen"
            rows={5}
            style={{ width: '100%' }}
            value={materialText}
            onChange={(e) => {
              applyMaterialText(e.target.value);
              if (usingDemo) setUsingDemo(false);
            }}
            placeholder="Füge hier dein Lernmaterial ein …"
          />
        )}

        {/* Demo-Material aktiv */}
        {usingDemo && (
          <div style={{
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--gold)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>📄</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold)', margin: '0 0 2px' }}>
                Beispiel-Material geladen
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                {DEMO_MATERIAL.topic}
              </p>
            </div>
            <button
              onClick={removeFile}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', padding: 0, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {truncationNotice && (
          <p className="field-notice">
            Dein Material ist sehr umfangreich – Lumo nimmt die ersten 50.000 Zeichen.
          </p>
        )}

        {/* Upload-Zeile */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            id="file-upload"
            type="file"
            accept=".pdf,.txt,.md,text/plain,application/pdf"
            onChange={handleFile}
            className="visually-hidden"
          />
          {!fileName && !usingDemo ? (
            <label htmlFor="file-upload" className="upload-label" style={{ flex: 1 }}>
              📎 PDF oder Textdatei hochladen
            </label>
          ) : fileName ? (
            <div className="upload-chip" style={{ flex: 1 }}>
              <span>{fileName}</span>
              <button type="button" onClick={removeFile} aria-label="Datei entfernen">×</button>
            </div>
          ) : null}

          {!fileName && !usingDemo && !materialText.trim() && !fileBase64 && (
            <button
              onClick={useDemo}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Beispiel
            </button>
          )}
        </div>

        {fileError && <p className="field-error">{fileError}</p>}
        {attemptedSubmit && materialError && (
          <p style={{
            fontSize: '14px',
            color: 'var(--amber)',
            margin: 0,
            padding: '8px 12px',
            background: 'var(--amber-soft)',
            borderRadius: '8px',
          }}>
            {materialError}
          </p>
        )}

        <button
          onClick={handleNext}
          disabled={!topic.trim()}
          style={{
            width: '100%',
            background: topic.trim()
              ? 'linear-gradient(135deg, #e0b34a 0%, var(--gold) 60%, #c8952e 100%)'
              : 'var(--bg-card)',
            color: topic.trim() ? '#1a1206' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '17px',
            fontWeight: '800',
            cursor: topic.trim() ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
            boxShadow: topic.trim() ? '0 4px 20px rgba(212, 168, 67, 0.3)' : 'none',
            transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, filter 0.15s ease',
          }}
          onMouseEnter={e => { if (topic.trim()) { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
        >
          Weiter →
        </button>

        {/* Back + Legal — beide in einer Zeile, dezent */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          paddingTop: '2px',
        }}>
          <button
            type="button"
            onClick={() => setPhase('value')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
              opacity: 0.65,
            }}
          >
            ← Was macht Lumo?
          </button>

          {onShowLegal && (
            <button
              type="button"
              onClick={onShowLegal}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                cursor: 'pointer',
                padding: 0,
                opacity: 0.4,
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              Impressum
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
