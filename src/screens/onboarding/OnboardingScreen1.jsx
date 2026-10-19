/**
 * OnboardingScreen1 — Überarbeiteter kombinierter Willkommens- & Material-Screen
 *
 * Änderungen vs. vorher:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. "Ich bin Lumo" — Mascot wird mit kurzer Intro-Animation eingeführt
 * 2. Material-Eingabe direkt hier (Screen 1 + 2 zusammengeführt)
 * 3. Demo-Material-Option ("Beispiel nutzen") für sofortiges Erleben ohne Upload
 * 4. Lernstil-Picker entfernt (erscheint später im Dashboard, nach erster Session)
 * 5. Schnellerer Weg zum ersten Wert: 1 Schritt statt 2 bis zum Ziel-Screen
 *
 * ADHS-Design-Prinzipien:
 * – Kein roter Feedback-Text für neutrale States (No-Red Principle)
 * – Immediacy: Demo-Material macht sofortigen Start möglich ohne Barrier
 * – Keine Überwältigung: feature chips weg, nur das Wesentliche
 */

import { useRef, useState, useEffect } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { readFileAsBase64, readFileAsText } from '../../utils/fileReader.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MIN_WORDS = 100;
const MAX_CHARS = 50000;

// Demo-Material für sofortigen Einstieg ohne eigenes Material
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

export default function OnboardingScreen1({ onNext, onShowLegal }) {
  const [topic, setTopic] = useState('');
  const [fileName, setFileName] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileMediaType, setFileMediaType] = useState('');
  const [fileError, setFileError] = useState('');
  const [truncationNotice, setTruncationNotice] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [showIntro, setShowIntro] = useState(true); // Lumo-Intro-Moment
  const [usingDemo, setUsingDemo] = useState(false);
  const inputRef = useRef(null);

  // Nach 2s verschwindet der Intro-Moment und gibt die Felder frei
  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(t);
  }, []);

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

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '20px', maxWidth: '440px' }}>

        {/* Lumo-Einführungsmoment — verschwindet nach 2s */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.4s ease',
        }}>
          <LumoMascot
            state={showIntro ? 'cheer' : 'idle'}
            size={showIntro ? 'large' : 'small'}
            label={showIntro ? undefined : 'Lumo'}
          />

          {showIntro ? (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s ease' }}>
              <h1 style={{
                fontSize: '26px',
                fontWeight: '800',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}>
                Hallo. Ich bin Lumo.
              </h1>
              <p style={{
                color: 'var(--gold)',
                fontWeight: '600',
                fontSize: '16px',
                margin: '0',
              }}>
                Ich lerne mit dir.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', lineHeight: '1.2' }}>
                Was lernst du gerade?
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0' }}>
                Gib dein Thema und Material ein – ich übernehme den Rest.
              </p>
            </div>
          )}
        </div>

        {/* Formular — erscheint nach Intro mit sanfter Animation */}
        {!showIntro && (
          <div style={{ width: '100%', animation: 'slideDown 0.4s ease both', display: 'contents' }}>
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
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold)', margin: '0 0 2px' }}>
                    Beispiel-Material geladen
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>
                    {DEMO_MATERIAL.topic}
                  </p>
                </div>
                <button
                  onClick={removeFile}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px',
                    padding: '0', flexShrink: 0,
                  }}
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

            {/* Upload-Zeile + Demo-Option */}
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
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
                  📎 Datei hochladen (PDF oder Text)
                </label>
              ) : fileName ? (
                <div className="upload-chip" style={{ flex: 1 }}>
                  <span>{fileName}</span>
                  <button type="button" onClick={removeFile} aria-label="Datei entfernen">×</button>
                </div>
              ) : null}

              {/* Demo-Material Button — schneller Einstieg */}
              {!fileName && !usingDemo && !materialText.trim() && !fileBase64 && (
                <button
                  onClick={useDemo}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--gold)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--gold)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Beispiel nutzen ✦
                </button>
              )}
            </div>

            {fileError && <p className="field-error">{fileError}</p>}
            {attemptedSubmit && materialError && (
              <p style={{
                fontSize: '14px',
                color: 'var(--amber)',
                margin: '0',
                padding: '8px 12px',
                background: 'var(--amber-soft)',
                borderRadius: '8px',
              }}>
                {materialError}
              </p>
            )}

            <Button onClick={handleNext} disabled={!topic.trim()} style={{ width: '100%' }}>
              Weiter →
            </Button>

            {/* Vertrauens-Chip – klein und unaufdringlich */}
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              margin: '0',
              opacity: 0.6,
              fontStyle: 'italic',
            }}>
              „Ich hab endlich aufgehört Lernmaterial nur durchzulesen." — Beta-Feedback
            </p>

            {/* Legal footer – DSGVO-konform, dezent */}
            {onShowLegal && (
              <p style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                margin: '0',
                opacity: 0.45,
              }}>
                <button
                  type="button"
                  onClick={onShowLegal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontSize: 'inherit',
                    cursor: 'pointer',
                    padding: '0',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Impressum & Datenschutz
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
