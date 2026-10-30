/**
 * OnboardingScreen1 — Vollständiges Lumo Onboarding (4 Screens)
 *
 * S0 — Chaos:   Floating-Tags, Mascot, Serif-Headline, Gold CTA
 * S1 — Demo:    Demo-Card zeigt Lumo's Fähigkeiten
 * S2 — Quiz:    2 Fragen mit Chip-Multi-Select
 * S3 — Ready:   Lumo ist bereit, Final CTA
 * form —        Material-Upload (bestehend)
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
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

Neurotransmitter-Abbau: Nach der Wirkung werden Transmitter durch Enzyme abgebaut oder durch Wiederaufnahmepumpen zurückgeholt. ADHS: Bei ADHS ist das dopaminerge System verändert. Methylphenidat (Ritalin) blockiert DAT.`,
};

function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

// S2 Quiz-Daten
const QUIZ_Q1 = {
  label: 'WIE LERNST DU AM BESTEN?',
  question: 'Wie gehst du meistens an neuen Stoff ran?',
  chips: [
    { id: 'read', label: '📖 Lesen & markieren' },
    { id: 'listen', label: '🎧 Vorlesungen hören' },
    { id: 'practice', label: '✏️ Aufgaben lösen' },
    { id: 'visual', label: '🗺️ Mindmaps & Diagramme' },
    { id: 'teach', label: '🗣️ Anderen erklären' },
  ],
};

const QUIZ_Q2 = {
  label: 'DEINE GRÖSSTE HÜRDE',
  question: 'Was macht dir beim Lernen am meisten zu schaffen?',
  chips: [
    { id: 'focus', label: '😵‍💫 Konzentration halten' },
    { id: 'start', label: '🚀 Anfangen & Loslegen' },
    { id: 'overview', label: '🗂️ Überblick behalten' },
    { id: 'time', label: '⏰ Zeit einschätzen' },
    { id: 'memory', label: '🧠 Dinge behalten' },
  ],
};

export default function OnboardingScreen1({ onNext }) {
  const [phase, setPhase] = useState('s0'); // s0 → s1 → s2 → s3 → form
  const [outPhase, setOutPhase] = useState(null);

  // S2 Quiz state
  const [q1Sel, setQ1Sel] = useState([]);
  const [q2Sel, setQ2Sel] = useState([]);
  const [q1Done, setQ1Done] = useState(false);
  const [q2Done, setQ2Done] = useState(false);

  // form state
  const [topic, setTopic] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [files, setFiles] = useState([]); // [{ name, base64, mediaType, text }]
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Computed: has any file loaded?
  const hasFiles = files.length > 0;

  // ── Screen-Transition ──────────────────────────────────────────────────────
  const goTo = useCallback((next) => {
    setOutPhase(phase);
    setTimeout(() => {
      setPhase(next);
      setOutPhase(null);
    }, 280);
  }, [phase]);

  // P2-UX-13: Back-Navigation — Nutzer können im Onboarding rückwärts navigieren.
  // Vorwärts-Only-Flow war ein UX-Blocker: wer in S2 eine falsche Auswahl trifft
  // oder die Intro-Demo nochmal sehen will, war bisher gefangen. Zurück ist immer
  // eine natürliche Erwartung in einem Step-Flow.
  const PHASE_ORDER = ['s0', 's1', 's2', 's3', 'form'];
  const goBack = useCallback(() => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx > 0) goTo(PHASE_ORDER[idx - 1]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, goTo]);

  // ── Progress per Phase ─────────────────────────────────────────────────────
  const progressMap = { s0: 20, s1: 40, s2: 65, s3: 85, form: 100 };
  const progress = progressMap[phase] || 20;

  // ── S2: Chip toggle ────────────────────────────────────────────────────────
  const toggleQ1 = (id) => {
    const next = q1Sel.includes(id)
      ? q1Sel.filter(x => x !== id)
      : [...q1Sel, id];
    setQ1Sel(next);
    if (next.length > 0 && !q1Done) setQ1Done(true);
  };
  const toggleQ2 = (id) => {
    const next = q2Sel.includes(id)
      ? q2Sel.filter(x => x !== id)
      : [...q2Sel, id];
    setQ2Sel(next);
    if (next.length > 0 && !q2Done) setQ2Done(true);
  };

  // ── Form handlers ──────────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return null;
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Datei zu groß (max. 25 MB)');
      return null;
    }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      setFileError('Nur PDF, DOCX oder TXT erlaubt');
      return null;
    }
    const [b64, txt] = await Promise.all([readFileAsBase64(file), readFileAsText(file).catch(() => '')]);
    return { name: file.name, base64: b64, mediaType: file.type || 'application/octet-stream', text: txt || '' };
  }, []);

  const handleFiles = useCallback(async (fileList) => {
    setFileError('');
    const fileArray = Array.from(fileList);
    const results = await Promise.all(fileArray.map(f => processFile(f)));
    const valid = results.filter(Boolean);
    if (valid.length > 0) {
      setFiles(prev => {
        // Deduplicate by name
        const existingNames = new Set(prev.map(f => f.name));
        const newFiles = valid.filter(f => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });
      // Use text from first text-extractable file if no manual text yet
      const firstWithText = valid.find(f => f.text);
      if (firstWithText && !materialText) {
        setMaterialText(firstWithText.text.slice(0, MAX_CHARS));
      }
    }
  }, [processFile, materialText]);

  const removeFile = useCallback((name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) await handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleSubmit = async () => {
    if (isProcessing) return;
    const wc = countWords(materialText);
    if (wc < MIN_WORDS && !hasFiles) {
      setFileError(`Mindestens ${MIN_WORDS} Wörter nötig (aktuell: ${wc})`);
      return;
    }
    setIsProcessing(true);
    // Send files array + materialText (server handles both)
    onNext({ topic, materialText, files });
  };

  const handleDemo = () => {
    onNext({
      topic: DEMO_MATERIAL.topic,
      materialText: DEMO_MATERIAL.text,
      files: [],
    });
  };

  // ── CSS ────────────────────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');

    .ob-root {
      position: fixed; inset: 0;
      background: #0E0C09; color: #F0EAE0;
      font-family: 'Inter', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
    }

    /* ── Ambient Glow ── */
    .ob-glow {
      position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
    }
    .ob-glow::before {
      content: ''; position: absolute;
      top: -15%; right: -10%; width: 100vw; height: 100vw;
      max-width: 600px; max-height: 600px;
      background: radial-gradient(circle, rgba(212,146,74,0.28) 0%, rgba(196,120,43,0.10) 40%, transparent 68%);
      animation: obGlow1 9s ease-in-out infinite;
    }
    .ob-glow::after {
      content: ''; position: absolute;
      bottom: -15%; left: -15%; width: 80vw; height: 80vw;
      max-width: 440px; max-height: 440px;
      background: radial-gradient(circle, rgba(180,100,30,0.20) 0%, rgba(160,80,20,0.06) 48%, transparent 70%);
      animation: obGlow2 12s ease-in-out infinite;
    }
    @keyframes obGlow1 {
      0%,100% { transform: scale(1) translate(0,0); opacity: 1; }
      50% { transform: scale(1.12) translate(-4%,3%); opacity: .8; }
    }
    @keyframes obGlow2 {
      0%,100% { transform: scale(1) translate(0,0); opacity: 1; }
      50% { transform: scale(1.08) translate(3%,-4%); opacity: .85; }
    }

    /* ── Progress Bar ── */
    .ob-prog {
      position: fixed; top: env(safe-area-inset-top, 0px); left: 0; right: 0;
      height: 2px; background: rgba(240,234,224,0.08); z-index: 50;
    }
    .ob-prog-fill {
      height: 100%;
      background: linear-gradient(90deg, #C47A2B, #E5A85E);
      transition: width .5s cubic-bezier(0.23,1,0.32,1);
    }

    /* ── Skip ── */
    .ob-skip {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 14px);
      right: max(20px, env(safe-area-inset-right, 0px));
      z-index: 50; background: none; border: none;
      color: rgba(240,234,224,0.55); font-size: 13px; font-family: inherit;
      cursor: pointer; padding: 4px 0;
    }
    .ob-skip:hover { color: #F0EAE0; }

    /* ── Back (P2-UX-13) — symmetrisch zum Skip, linke Seite ── */
    .ob-back {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 14px);
      left: max(20px, env(safe-area-inset-left, 0px));
      z-index: 50; background: none; border: none;
      color: rgba(240,234,224,0.55); font-size: 13px; font-family: inherit;
      cursor: pointer; padding: 4px 0;
      display: flex; align-items: center; gap: 4px;
    }
    .ob-back:hover { color: #F0EAE0; }
    .ob-back:focus-visible {
      outline: 2px solid rgba(212,146,74,0.7);
      outline-offset: 2px; border-radius: 4px;
    }

    /* ── Screen base ── */
    .ob-screen {
      position: absolute; inset: 0; z-index: 10;
      opacity: 0; pointer-events: none;
      transform: translateX(28px);
      transition: opacity .26s cubic-bezier(0.23,1,0.32,1),
                  transform .26s cubic-bezier(0.23,1,0.32,1);
    }
    .ob-screen.active { opacity: 1; pointer-events: auto; transform: translateX(0); }
    .ob-screen.out    { opacity: 0; transform: translateX(-22px); }

    /* ── CTA ── */
    .ob-cta {
      display: inline-flex; align-items: center; gap: 9px;
      background: #D4924A; color: #0A0907;
      font-size: 14px; font-weight: 600; letter-spacing: .01em;
      padding: 14px 24px; border-radius: 11px; border: none;
      cursor: pointer; min-height: 50px;
      transition: background 120ms cubic-bezier(0.23,1,0.32,1), transform 100ms;
    }
    .ob-cta:hover { background: #E5A85E; }
    .ob-cta:active { transform: scale(0.97); }
    .ob-cta:disabled { opacity: .28; pointer-events: none; }
    .ob-cta-full {
      width: 100%; justify-content: center;
      padding: 17px 24px; font-size: 15px;
      box-shadow: 0 0 0 1px rgba(212,146,74,0.4), 0 4px 24px rgba(212,146,74,0.35);
      letter-spacing: .02em;
    }

    /* ════════════════════════════
       S0 — CHAOS
    ════════════════════════════ */
    #ob-s0 {
      display: grid;
      grid-template-rows: 1fr auto;
      padding-bottom: max(env(safe-area-inset-bottom, 0px), 40px);
    }
    .ob-chaos-canvas {
      position: relative; width: 100%; min-height: 0;
    }
    .ob-chaos-mascot {
      position: absolute; left: 50%; top: 48%;
      transform: translate(-50%,-50%);
      width: 108px; height: 108px;
      opacity: .62; filter: blur(0.3px);
      border-radius: 50%; object-fit: cover;
    }

    /* Floating tabs */
    .ob-ftab {
      position: absolute;
      display: flex; align-items: center; gap: 6px;
      padding: 6px 10px 6px 8px;
      border-radius: 8px;
      font-size: 12px; font-weight: 500; line-height: 1.2;
      border: 1px solid transparent;
      white-space: nowrap;
      backdrop-filter: blur(6px);
      box-shadow: 0 2px 12px rgba(0,0,0,.3);
    }
    .ob-ftab .ob-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .ob-ftab.red   { background: rgba(220,60,60,0.16); border-color: rgba(220,60,60,0.30); color: #F5A0A0; }
    .ob-ftab.red .ob-dot { background: #E05050; }
    .ob-ftab.amber { background: rgba(212,146,74,0.16); border-color: rgba(212,146,74,0.28); color: #E5B87A; }
    .ob-ftab.amber .ob-dot { background: #D4924A; }
    .ob-ftab.blue  { background: rgba(80,140,220,0.14); border-color: rgba(80,140,220,0.26); color: #90B8E8; }
    .ob-ftab.blue .ob-dot { background: #5890D8; }
    .ob-ftab.green { background: rgba(60,180,100,0.13); border-color: rgba(60,180,100,0.24); color: #80D8A0; }
    .ob-ftab.green .ob-dot { background: #40B870; }
    .ob-ftab.ghost {
      background: rgba(240,234,224,0.05); border-color: rgba(240,234,224,0.12);
      color: rgba(240,234,224,0.38); font-style: italic; font-size: 11px;
    }

    .ob-ftab.t1 { top: 8%;  left: 3%;  transform: rotate(-3deg);   animation: obF1 5.5s ease-in-out infinite; }
    .ob-ftab.t2 { top: 15%; right: 3%; transform: rotate(2.5deg);  animation: obF2 6.5s ease-in-out infinite; }
    .ob-ftab.t3 { top: 24%; left: 2%;  transform: rotate(1deg);    animation: obF3 7s   ease-in-out infinite; }
    .ob-ftab.t4 { top: 20%; right: 3%; transform: rotate(-2deg);   animation: obF4 5s   ease-in-out infinite; }
    .ob-ftab.t5 { top: 44%; left: 1%;  transform: rotate(1.5deg);  animation: obF5 8s   ease-in-out infinite; }
    .ob-ftab.t6 { top: 42%; right: 2%; transform: rotate(-1.5deg); animation: obF6 6s   ease-in-out infinite; }
    .ob-ftab.t7 { top: 63%; left: 5%;  transform: rotate(.8deg);   animation: obF7 7.5s ease-in-out infinite; }
    .ob-ftab.t8 { top: 68%; right: 4%; transform: rotate(-2.5deg); animation: obF8 6.2s ease-in-out infinite; }
    .ob-ftab.t9 { top: 84%; left: 18%; transform: rotate(1.2deg);  animation: obF9 5.8s ease-in-out infinite; }

    @keyframes obF1 { 0%,100%{transform:rotate(-3deg) translate(0,0)}   50%{transform:rotate(-3deg) translate(-2px,-6px)} }
    @keyframes obF2 { 0%,100%{transform:rotate(2.5deg) translate(0,0)}  50%{transform:rotate(2.5deg) translate(3px,-8px)} }
    @keyframes obF3 { 0%,100%{transform:rotate(1deg) translate(0,0)}    50%{transform:rotate(1deg) translate(-3px,5px)} }
    @keyframes obF4 { 0%,100%{transform:rotate(-2deg) translate(0,0)}   50%{transform:rotate(-2deg) translate(4px,-4px)} }
    @keyframes obF5 { 0%,100%{transform:rotate(1.5deg) translate(0,0)}  50%{transform:rotate(1.5deg) translate(-2px,7px)} }
    @keyframes obF6 { 0%,100%{transform:rotate(-1.5deg) translate(0,0)} 50%{transform:rotate(-1.5deg) translate(5px,3px)} }
    @keyframes obF7 { 0%,100%{transform:rotate(.8deg) translate(0,0)}   50%{transform:rotate(.8deg) translate(-4px,-5px)} }
    @keyframes obF8 { 0%,100%{transform:rotate(-2.5deg) translate(0,0)} 50%{transform:rotate(-2.5deg) translate(3px,6px)} }
    @keyframes obF9 { 0%,100%{transform:rotate(1.2deg) translate(0,0)}  50%{transform:rotate(1.2deg) translate(-3px,-4px)} }

    .ob-s0-bottom {
      padding: 0 max(24px, env(safe-area-inset-left, 0px)) 0 max(24px, env(safe-area-inset-right, 0px));
    }
    .ob-s0-head {
      font-family: 'Instrument Serif', Georgia, serif;
      font-style: italic; font-weight: 400;
      font-size: clamp(34px, 9.5vw, 50px);
      line-height: 1.06; letter-spacing: -.026em;
      margin-bottom: 12px; text-wrap: balance;
    }
    .ob-s0-sub {
      font-size: 15px; color: rgba(240,234,224,0.55);
      line-height: 1.55; margin-bottom: 24px;
    }
    .ob-cta-area {
      padding: 0 max(24px, env(safe-area-inset-left, 0px));
      padding-right: max(24px, env(safe-area-inset-right, 0px));
      padding-bottom: 8px; flex-shrink: 0;
    }

    /* ════════════════════════════
       S1 — DEMO CARD
    ════════════════════════════ */
    #ob-s1 {
      display: grid;
      grid-template-rows: 1fr auto;
      padding-bottom: max(env(safe-area-inset-bottom, 0px), 40px);
    }
    .ob-s1-canvas {
      display: flex; align-items: center; justify-content: center;
      padding: max(env(safe-area-inset-top, 0px), 56px) 20px 20px;
    }
    .ob-demo-card {
      width: min(300px, 84vw);
      background: rgba(30,26,18,0.92);
      border: 1px solid rgba(212,146,74,0.22);
      border-radius: 14px; padding: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(212,146,74,0.06);
    }
    .ob-dc-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
    }
    .ob-dc-avatar {
      width: 34px; height: 34px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
    }
    .ob-dc-greeting { font-size: 11px; color: rgba(240,234,224,0.55); letter-spacing: .02em; }
    .ob-dc-name { font-size: 13px; font-weight: 600; color: #F0EAE0; }
    .ob-dc-divider { height: 1px; background: rgba(240,234,224,0.08); margin: 12px 0; }
    .ob-dc-eyebrow { font-size: 10px; color: #D4924A; letter-spacing: .06em; font-weight: 500; margin-bottom: 4px; }
    .ob-dc-topic { font-size: 16px; font-weight: 600; color: #F0EAE0; margin-bottom: 6px; }
    .ob-dc-where {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: rgba(240,234,224,0.55);
    }
    .ob-dc-wdot { width: 5px; height: 5px; border-radius: 50%; background: #D4924A; flex-shrink: 0; }
    .ob-dc-caps { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
    .ob-dc-cap { display: flex; align-items: center; gap: 9px; }
    .ob-dc-cap-icon {
      width: 28px; height: 28px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px;
    }
    .ob-dc-cap-icon.anti  { background: rgba(220,60,60,0.15);  border: 1px solid rgba(220,60,60,0.25); }
    .ob-dc-cap-icon.focus { background: rgba(212,146,74,0.14); border: 1px solid rgba(212,146,74,0.22); }
    .ob-dc-cap-icon.know  { background: rgba(80,180,120,0.12); border: 1px solid rgba(80,180,120,0.20); }
    .ob-dc-cap-label { font-size: 12px; line-height: 1.35; }
    .ob-dc-cap-label strong { color: #F0EAE0; display: block; font-size: 13px; }
    .ob-dc-cap-label span { color: rgba(240,234,224,0.55); }
    .ob-s1-text {
      padding: 16px max(24px, env(safe-area-inset-left, 0px)) 16px;
      padding-right: max(24px, env(safe-area-inset-right, 0px));
    }
    .ob-s1-head {
      font-family: 'Instrument Serif', Georgia, serif;
      font-style: italic; font-weight: 400;
      font-size: clamp(30px, 8.5vw, 44px);
      line-height: 1.08; letter-spacing: -.024em;
      margin-bottom: 10px; text-wrap: balance;
    }
    .ob-s1-sub { font-size: 15px; color: rgba(240,234,224,0.55); line-height: 1.55; }

    /* ════════════════════════════
       S2 — QUIZ
    ════════════════════════════ */
    #ob-s2 {
      display: flex; flex-direction: column;
      padding: max(env(safe-area-inset-top, 0px), 52px) max(24px, env(safe-area-inset-left, 0px)) max(env(safe-area-inset-bottom, 0px), 32px);
      padding-right: max(24px, env(safe-area-inset-right, 0px));
      overflow-y: auto; -webkit-overflow-scrolling: touch;
    }
    .ob-q-mascot-row {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 24px; margin-top: 4px;
    }
    .ob-q-mascot {
      width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
    }
    .ob-q-lumo-label { font-size: 12px; color: rgba(240,234,224,0.55); }
    .ob-q-block { margin-bottom: 20px; }
    .ob-q-label {
      font-size: 11px; font-weight: 500; letter-spacing: .04em;
      color: #D4924A; margin-bottom: 6px;
    }
    .ob-q-question {
      font-size: 17px; font-weight: 600; color: #F0EAE0;
      line-height: 1.3; margin-bottom: 12px; text-wrap: balance;
    }
    .ob-q-chips {
      display: flex; flex-wrap: wrap; gap: 8px;
    }
    .ob-chip {
      padding: 8px 13px; border-radius: 20px;
      background: rgba(240,234,224,0.06); border: 1px solid rgba(240,234,224,0.14);
      color: rgba(240,234,224,0.72); font-size: 13px; font-weight: 500;
      cursor: pointer; font-family: inherit;
      transition: background 150ms, border-color 150ms, color 150ms, transform 80ms;
    }
    .ob-chip:hover { background: rgba(240,234,224,0.10); color: #F0EAE0; }
    .ob-chip:active { transform: scale(0.96); }
    .ob-chip.sel {
      background: rgba(212,146,74,0.18); border-color: rgba(212,146,74,0.45); color: #E5B87A;
    }
    .ob-lumo-resp {
      margin-top: 14px;
      background: rgba(212,146,74,0.08); border: 1px solid rgba(212,146,74,0.18);
      border-radius: 10px; padding: 12px 14px;
      animation: obRespIn .3s cubic-bezier(0.23,1,0.32,1);
    }
    @keyframes obRespIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .ob-resp-label { font-size: 10px; color: #D4924A; letter-spacing: .05em; font-weight: 500; margin-bottom: 4px; }
    .ob-resp-text { font-size: 13px; color: rgba(240,234,224,0.72); line-height: 1.45; }
    .ob-q-cta-area { margin-top: auto; padding-top: 20px; }

    /* ════════════════════════════
       S3 — READY
    ════════════════════════════ */
    #ob-s3 {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: max(env(safe-area-inset-top, 0px), 40px) max(24px, env(safe-area-inset-left, 0px)) max(env(safe-area-inset-bottom, 0px), 40px);
      padding-right: max(24px, env(safe-area-inset-right, 0px));
      text-align: center;
    }
    .ob-r-mascot-row {
      position: relative; display: inline-block; margin-bottom: 24px;
    }
    .ob-r-mascot {
      width: 72px; height: 72px; border-radius: 50%; overflow: hidden;
    }
    .ob-r-pulse-dot {
      position: absolute; bottom: 2px; right: 2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #40B870;
      border: 2px solid #0E0C09;
      animation: obPulse 2.2s ease-in-out infinite;
    }
    @keyframes obPulse {
      0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(64,184,112,0.5); }
      50%     { transform: scale(1.08); box-shadow: 0 0 0 5px rgba(64,184,112,0); }
    }
    .ob-r-eyebrow {
      font-size: 11px; font-weight: 500; letter-spacing: .06em;
      color: #D4924A; margin-bottom: 10px; text-transform: uppercase;
    }
    .ob-r-head {
      font-family: 'Instrument Serif', Georgia, serif;
      font-style: italic; font-weight: 400;
      font-size: clamp(36px, 10vw, 54px);
      line-height: 1.04; letter-spacing: -.028em;
      margin-bottom: 12px; text-wrap: balance;
    }
    .ob-r-body {
      font-size: 15px; color: rgba(240,234,224,0.60);
      line-height: 1.55; max-width: 300px; margin-bottom: 28px;
    }
    .ob-r-quickwin {
      width: 100%; max-width: 320px;
      background: rgba(212,146,74,0.07); border: 1px solid rgba(212,146,74,0.18);
      border-radius: 12px; padding: 14px 16px;
      margin-bottom: 28px; text-align: left;
    }
    .ob-r-qw-label {
      font-size: 10px; color: #D4924A; letter-spacing: .06em;
      font-weight: 500; margin-bottom: 8px;
    }
    .ob-r-qw-row {
      display: flex; align-items: flex-start; gap: 9px; margin-bottom: 6px;
    }
    .ob-r-qw-row:last-child { margin-bottom: 0; }
    .ob-r-check {
      width: 16px; height: 16px; border-radius: 50%;
      background: rgba(212,146,74,0.15); border: 1px solid rgba(212,146,74,0.30);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px; font-size: 9px; color: #D4924A;
    }
    .ob-r-qw-text { font-size: 13px; color: rgba(240,234,224,0.70); line-height: 1.35; }
    .ob-r-cta-wrap { width: 100%; max-width: 320px; }

    /* ════════════════════════════
       FORM
    ════════════════════════════ */
    #ob-form {
      display: flex; flex-direction: column;
      padding: max(env(safe-area-inset-top, 0px), 52px) max(24px, env(safe-area-inset-left, 0px)) max(env(safe-area-inset-bottom, 0px), 32px);
      padding-right: max(24px, env(safe-area-inset-right, 0px));
      overflow-y: auto; -webkit-overflow-scrolling: touch; gap: 20px;
    }
    .ob-form-head {
      font-family: 'Instrument Serif', Georgia, serif;
      font-style: italic; font-weight: 400;
      font-size: clamp(26px, 7vw, 36px);
      line-height: 1.1; letter-spacing: -.02em; margin-bottom: 4px;
    }
    .ob-form-sub {
      font-size: 14px; color: rgba(240,234,224,0.55); line-height: 1.5;
    }
    .ob-label {
      font-size: 11px; font-weight: 600; letter-spacing: .04em;
      color: #D4924A; margin-bottom: 6px;
    }
    .ob-input {
      width: 100%; background: rgba(240,234,224,0.06);
      border: 1px solid rgba(240,234,224,0.14); border-radius: 10px;
      padding: 12px 14px; font-size: 15px; color: #F0EAE0;
      font-family: inherit; outline: none;
      transition: border-color 150ms;
    }
    .ob-input:focus { border-color: rgba(212,146,74,0.5); }
    .ob-input::placeholder { color: rgba(240,234,224,0.30); }
    .ob-drop-zone {
      border: 1.5px dashed rgba(240,234,224,0.20); border-radius: 12px;
      padding: 24px 16px; text-align: center;
      cursor: pointer;
      transition: border-color 150ms, background 150ms;
    }
    .ob-drop-zone.over { border-color: rgba(212,146,74,0.6); background: rgba(212,146,74,0.06); }
    .ob-drop-zone.compact { padding: 14px 16px; }
    .ob-drop-icon { font-size: 28px; margin-bottom: 8px; }
    .ob-drop-zone.compact .ob-drop-icon { font-size: 20px; margin-bottom: 4px; }
    .ob-drop-main { font-size: 14px; font-weight: 500; color: #F0EAE0; margin-bottom: 4px; }
    .ob-drop-sub { font-size: 12px; color: rgba(240,234,224,0.45); }

    .ob-file-list {
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;
    }
    .ob-file-item {
      display: flex; align-items: center; gap: 8px;
      background: rgba(212,146,74,0.08);
      border: 1px solid rgba(212,146,74,0.25);
      border-radius: 8px; padding: 8px 10px;
    }
    .ob-file-icon { font-size: 15px; flex-shrink: 0; }
    .ob-file-name {
      flex: 1; font-size: 13px; font-weight: 500; color: #D4924A;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ob-file-remove {
      background: none; border: none; color: rgba(240,234,224,0.45);
      font-size: 18px; cursor: pointer; padding: 0 2px; line-height: 1;
      flex-shrink: 0; transition: color 150ms;
    }
    .ob-file-remove:hover { color: #F5A0A0; }
    .ob-textarea {
      width: 100%; background: rgba(240,234,224,0.06);
      border: 1px solid rgba(240,234,224,0.14); border-radius: 10px;
      padding: 12px 14px; font-size: 14px; color: #F0EAE0;
      font-family: inherit; outline: none; resize: vertical; min-height: 100px;
      transition: border-color 150ms;
    }
    .ob-textarea:focus { border-color: rgba(212,146,74,0.5); }
    .ob-textarea::placeholder { color: rgba(240,234,224,0.30); }
    .ob-error { font-size: 13px; color: #F5A0A0; }
    .ob-demo-link {
      background: none; border: none; color: rgba(240,234,224,0.45);
      font-size: 13px; font-family: inherit; cursor: pointer;
      text-decoration: underline; text-underline-offset: 3px;
      padding: 4px 0;
    }
    .ob-demo-link:hover { color: rgba(240,234,224,0.70); }
  `;

  // ── Render ─────────────────────────────────────────────────────────────────
  const isActive = (p) => phase === p ? 'active' : outPhase === p ? 'out' : '';

  return (
    <div className="ob-root">
      <style>{styles}</style>

      {/* Ambient Glow */}
      <div className="ob-glow" />

      {/* Progress Bar */}
      <div className="ob-prog">
        <div className="ob-prog-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Back — sichtbar ab S1 (S0 hat kein Zurück); im Form zurück zu S3 */}
      {phase !== 's0' && (
        <button className="ob-back" onClick={goBack} aria-label="Zurück">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M13 8H3M7 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Zurück
        </button>
      )}

      {/* Skip (nur in S0-S3 sichtbar, nicht im Form) */}
      {phase !== 'form' && (
        <button className="ob-skip" onClick={() => goTo('form')}>
          Überspringen
        </button>
      )}

      {/* ── S0: CHAOS ──────────────────────────────────────────────────────── */}
      <div id="ob-s0" className={`ob-screen ${isActive('s0')}`}>
        <div className="ob-chaos-canvas">
          {/* Floating Tags */}
          <div className="ob-ftab red t1"><span className="ob-dot" />Kapitel 7 – noch nicht</div>
          <div className="ob-ftab amber t2"><span className="ob-dot" />Klausur: 4 Tage</div>
          <div className="ob-ftab blue t3"><span className="ob-dot" />Lerngruppe – 18 Uhr</div>
          <div className="ob-ftab ghost t4">Zusammenfassung?</div>
          <div className="ob-ftab red t5"><span className="ob-dot" />Kapitel 3–6 offen</div>
          <div className="ob-ftab green t6"><span className="ob-dot" />Bio ✓</div>
          <div className="ob-ftab amber t7"><span className="ob-dot" />Karteikarten?</div>
          <div className="ob-ftab blue t8"><span className="ob-dot" />Wiederholung</div>
          <div className="ob-ftab ghost t9">wo fang ich an?</div>

          {/* Mascot centered */}
          <div className="ob-chaos-mascot">
            <LumoMascot mood="thinking" size={108} style={{ borderRadius: '50%', opacity: 0.62 }} />
          </div>
        </div>

        <div>
          <div className="ob-s0-bottom">
            <div className="ob-s0-head">Kopf voll.<br />Überblick verloren.<br />Wo fängst du an?</div>
            <div className="ob-s0-sub">Lumo entscheidet das für dich.</div>
          </div>
          <div className="ob-cta-area">
            <button className="ob-cta ob-cta-full" onClick={() => goTo('s1')}>
              Das will ich
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── S1: DEMO CARD ──────────────────────────────────────────────────── */}
      <div id="ob-s1" className={`ob-screen ${isActive('s1')}`}>
        <div className="ob-s1-canvas">
          <div className="ob-demo-card">
            <div className="ob-dc-header">
              <div className="ob-dc-avatar">
                <LumoMascot mood="cheer" size={34} />
              </div>
              <div>
                <div className="ob-dc-greeting">KI-Lernassistentin</div>
                <div className="ob-dc-name">Lumo</div>
              </div>
            </div>
            <div className="ob-dc-divider" />
            <div className="ob-dc-eyebrow">DEIN THEMA</div>
            <div className="ob-dc-topic">Synaptische Übertragung</div>
            <div className="ob-dc-where">
              <span className="ob-dc-wdot" />
              <span>Klausur in 4 Tagen · 68 % gelernt</span>
            </div>
            <div className="ob-dc-caps">
              <div className="ob-dc-cap">
                <div className="ob-dc-cap-icon anti">🚫</div>
                <div className="ob-dc-cap-label">
                  <strong style={{ color: '#F5A0A0' }}>Anti-Ablenkungsplan</strong>
                  <span>Klausurreihenfolge nach Lücken</span>
                </div>
              </div>
              <div className="ob-dc-cap">
                <div className="ob-dc-cap-icon focus">⚡</div>
                <div className="ob-dc-cap-label">
                  <strong>Fokus-Blöcke</strong>
                  <span>25-min-Einheiten für deinen Stil</span>
                </div>
              </div>
              <div className="ob-dc-cap">
                <div className="ob-dc-cap-icon know">🧠</div>
                <div className="ob-dc-cap-label">
                  <strong>Wissens-Check</strong>
                  <span>Sofort sehen, was sitzt</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="ob-s1-text">
            <div className="ob-s1-head">So sieht dein Kopf aus — wenn Lumo ihn kennt.</div>
            <div className="ob-s1-sub">Kein endloser Plan. Nur der nächste Schritt.</div>
          </div>
          <div className="ob-cta-area">
            <button className="ob-cta ob-cta-full" onClick={() => goTo('s2')}>
              Weiter
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── S2: QUIZ ───────────────────────────────────────────────────────── */}
      <div id="ob-s2" className={`ob-screen ${isActive('s2')}`}>
        <div className="ob-q-mascot-row">
          <div className="ob-q-mascot">
            <LumoMascot mood="wave" size={36} />
          </div>
          <span className="ob-q-lumo-label">Lumo möchte dich kennenlernen</span>
        </div>

        {/* Q1 */}
        <div className="ob-q-block">
          <div className="ob-q-label">{QUIZ_Q1.label}</div>
          <div className="ob-q-question">{QUIZ_Q1.question}</div>
          <div className="ob-q-chips">
            {QUIZ_Q1.chips.map(c => (
              <button
                key={c.id}
                className={`ob-chip${q1Sel.includes(c.id) ? ' sel' : ''}`}
                onClick={() => toggleQ1(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {q1Done && (
            <div className="ob-lumo-resp">
              <div className="ob-resp-label">LUMO</div>
              <div className="ob-resp-text">
                Super! Ich passe deinen Lernplan genau auf diese Stärken an.
              </div>
            </div>
          )}
        </div>

        {/* Q2 */}
        <div className="ob-q-block">
          <div className="ob-q-label">{QUIZ_Q2.label}</div>
          <div className="ob-q-question">{QUIZ_Q2.question}</div>
          <div className="ob-q-chips">
            {QUIZ_Q2.chips.map(c => (
              <button
                key={c.id}
                className={`ob-chip${q2Sel.includes(c.id) ? ' sel' : ''}`}
                onClick={() => toggleQ2(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {q2Done && (
            <div className="ob-lumo-resp">
              <div className="ob-resp-label">LUMO</div>
              <div className="ob-resp-text">
                Verstanden. Ich weiß jetzt, worauf es bei dir ankommt.
              </div>
            </div>
          )}
        </div>

        <div className="ob-q-cta-area">
          <button
            className="ob-cta ob-cta-full"
            disabled={q1Sel.length === 0 && q2Sel.length === 0}
            onClick={() => goTo('s3')}
          >
            {(q1Sel.length > 0 || q2Sel.length > 0) ? 'Weiter' : 'Wähle mindestens eine Option'}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── S3: READY ──────────────────────────────────────────────────────── */}
      <div id="ob-s3" className={`ob-screen ${isActive('s3')}`}>
        <div className="ob-r-mascot-row">
          <div className="ob-r-mascot">
            <LumoMascot mood="cheer" size={72} />
          </div>
          <div className="ob-r-pulse-dot" />
        </div>

        <div className="ob-r-eyebrow">ALLES BEREIT</div>
        <div className="ob-r-head">Dein Kopf.<br />Jetzt klar.</div>
        <div className="ob-r-body">
          Lumo hat alles, was es braucht. Ab jetzt läuft dein Lernen strukturiert — ohne Chaos, ohne Überwältigung.
        </div>

        <div className="ob-r-quickwin">
          <div className="ob-r-qw-label">DEIN ERSTER SCHRITT</div>
          <div className="ob-r-qw-row">
            <div className="ob-r-check">✓</div>
            <div className="ob-r-qw-text">Lernplan wird aus deinem Material erstellt</div>
          </div>
          <div className="ob-r-qw-row">
            <div className="ob-r-check">✓</div>
            <div className="ob-r-qw-text">Fokus-Blöcke nach deinem Stil</div>
          </div>
          <div className="ob-r-qw-row">
            <div className="ob-r-check">✓</div>
            <div className="ob-r-qw-text">Sofort-Check: Was sitzt, was nicht</div>
          </div>
        </div>

        <div className="ob-r-cta-wrap">
          <button className="ob-cta ob-cta-full" onClick={() => goTo('form')}>
            Jetzt starten
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── FORM: MATERIAL UPLOAD ───────────────────────────────────────────── */}
      <div id="ob-form" className={`ob-screen ${isActive('form')}`}>
        <div>
          <div className="ob-form-head">Dein Material.<br />Los geht's.</div>
          <div className="ob-form-sub">Lade dein Skript oder deine Notizen hoch — Lumo macht den Rest.</div>
        </div>

        <div>
          <div className="ob-label">THEMA (optional)</div>
          <input
            className="ob-input"
            placeholder="z.B. Neurobiologie – Synaptische Übertragung"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>

        <div>
          <div className="ob-label">DEIN MATERIAL</div>

          {/* File list */}
          {files.length > 0 && (
            <div className="ob-file-list">
              {files.map(f => (
                <div key={f.name} className="ob-file-item">
                  <span className="ob-file-icon">📄</span>
                  <span className="ob-file-name">{f.name}</span>
                  <button
                    className="ob-file-remove"
                    onClick={() => removeFile(f.name)}
                    aria-label="Datei entfernen"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone — always visible to allow adding more files */}
          <div
            className={`ob-drop-zone${dragOver ? ' over' : ''}${hasFiles ? ' compact' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="ob-drop-icon">📂</div>
            {hasFiles ? (
              <>
                <div className="ob-drop-main">Weitere Datei hinzufügen</div>
                <div className="ob-drop-sub">PDF, DOCX oder TXT · max. 25 MB</div>
              </>
            ) : (
              <>
                <div className="ob-drop-main">Dateien ablegen oder tippen</div>
                <div className="ob-drop-sub">Mehrere PDFs, DOCX oder TXT möglich · max. 25 MB pro Datei</div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.length && handleFiles(e.target.files)}
          />
        </div>

        {!hasFiles && (
          <div>
            <div className="ob-label">ODER: TEXT EINFÜGEN</div>
            <textarea
              className="ob-textarea"
              placeholder="Füge hier deinen Lernstoff ein …"
              value={materialText}
              onChange={e => setMaterialText(e.target.value.slice(0, MAX_CHARS))}
              rows={5}
            />
            <div style={{ fontSize: '12px', color: 'rgba(240,234,224,0.35)', marginTop: '4px', textAlign: 'right' }}>
              {countWords(materialText)} Wörter
            </div>
          </div>
        )}

        {fileError && <div className="ob-error">{fileError}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            className="ob-cta ob-cta-full"
            disabled={isProcessing || (!materialText.trim() && !hasFiles)}
            onClick={handleSubmit}
          >
            {isProcessing ? 'Wird analysiert …' : 'Jetzt analysieren →'}
          </button>
          <button className="ob-demo-link" onClick={handleDemo}>
            Demo-Material verwenden
          </button>
        </div>
      </div>
    </div>
  );
}
