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
 * 2. KEIN FEATURE-BINGO
 *    Keine langen Bullet-Listen. Nur das, was für Studenten wirklich relevant ist:
 *    "Ich muss das heute Abend wirklich verstehen."
 *    Lumo's Antwort darauf, in 3 Zeilen.
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

import { useRef, useState, useEffect } from 'react';
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
  // 'intro'     → Lumo-Einführungsmoment (1.8s auto-weiter)
  // 'value'     → 3 Value Props werden gezeigt
  // 'form'      → Formular erscheint
  const [phase, setPhase] = useState('intro');

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

  // Intro-Moment: nach 1.8s automatisch zu Value-Phase
  useEffect(() => {
    if (phase !== 'intro') return;
    const t = setTimeout(() => setPhase('value'), 1800);
    return () => clearTimeout(t);
  }, [phase]);

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

  // ── Phase: INTRO ──
  if (phase === 'intro') {
    return (
      <div className="screen">
        <div className="screen-content" style={{ gap: '16px' }}>
          <LumoMascot state="cheer" size="large" label="Lumo" />
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.2', marginBottom: '8px' }}>
              Hallo. Ich bin Lumo.
            </h1>
            <p style={{ color: 'var(--gold)', fontWeight: '600', fontSize: '17px', margin: 0 }}>
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
        <div className="screen-content" style={{ gap: '24px', maxWidth: '400px', animation: 'fadeIn 0.4s ease' }}>
          <LumoMascot state="idle" size="small" label="Lumo" />

          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: '10px',
            }}>
              Wie Lumo lernen verändert
            </p>
            <h1 style={{ fontSize: '22px', lineHeight: '1.35' }}>
              Lad dein Skript hoch.<br />Lumo macht den Rest.
            </h1>
          </div>

          {/* Value Props — kompakt, scanbar, konkret */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {VALUE_PROPS.map((v, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '1px' }}>{v.icon}</span>
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
              Material hochladen →
            </button>
            <button
              onClick={() => { useDemo(); setPhase('form'); }}
              style={{
                width: '100%',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px dashed rgba(212,168,67,0.4)',
                borderRadius: '14px',
                padding: '11px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Erst mal ausprobieren ✦
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: FORM ──
  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '14px', maxWidth: '440px', animation: 'fadeIn 0.35s ease' }}>

        <div style={{ textAlign: 'center' }}>
          <LumoMascot state="idle" size="small" label="Lumo" />
          <h1 style={{ fontSize: '20px', fontWeight: '800', marginTop: '12px', marginBottom: '4px', lineHeight: '1.2' }}>
            Was lernst du gerade?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Thema eingeben und Material einfügen — Lumo übernimmt den Rest.
          </p>
        </div>

        {/* Thema-Eingabe */}
        <input
          type="text"
          placeholder="Thema, z. B. Biologie – Zellbiologie"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ width: '100%' }}
          autoFocus
        />

        {/* Material-Eingabe */}
        {!hasPdf && !usingDemo && (
          <textarea
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
            background: topic.trim() ? 'var(--gold)' : 'var(--bg-card)',
            color: topic.trim() ? '#1a1206' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '14px',
            padding: '15px',
            fontSize: '17px',
            fontWeight: '800',
            cursor: topic.trim() ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
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
