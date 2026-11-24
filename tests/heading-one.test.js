/**
 * Eine Hauptüberschrift je Screen / Session-Phase (axe page-has-heading-one, WCAG 2.4.6)
 * Semantisch: aria-level={1} auf der vorhandenen Überschrift statt <h1>, weil die globalen
 * h1-Regeln (index.css: 28px Serif, unter 600px 22px !important) das Aussehen verändern würden.
 *
 *   H1-01  Jede Datei hat mindestens eine Level-1-Überschrift
 *   H1-02  Dashboard: unsichtbare h1 (.visually-hidden), Layout bleibt unverändert
 *   H1-03  Kein h2 ohne aria-level in den Screens, die sonst keine h1 haben
 */
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const files = [
  'src/screens/dashboard/DashboardScreen.jsx',
  'src/screens/FlashcardScreen.jsx',
  'src/screens/WelcomeBackScreen.jsx',
  'src/screens/session/CardLearningPhase.jsx',
  'src/screens/session/ElaborationPhase.jsx',
  'src/screens/session/ExplainChatPhase.jsx',
  'src/screens/session/ConceptMapScreen.jsx',
  'src/screens/session/LernzettelScreen.jsx',
  'src/screens/session/FocusRitualPhase.jsx',
  'src/screens/session/CheckUnderstandingPhase.jsx',
  'src/screens/session/DepthChoicePhase.jsx',
  'src/screens/session/BlockCompletePhase.jsx',
  'src/screens/session/MidSessionBreakScreen.jsx',
  'src/screens/session/SessionSummaryScreen.jsx',
];

it('H1-01 jede Datei hat eine Level-1-Überschrift', () => {
  for (const f of files) {
    assert.match(read(f), /<h1[\s>]|aria-level=\{1\}/, f);
  }
});

it('H1-02 Dashboard: unsichtbare h1 in beiden Rückgaben', () => {
  const n = (read(files[0]).match(/<h1 className="visually-hidden">/g) || []).length;
  assert.equal(n, 2);
});

it('H1-03 kein h2 ohne aria-level in den ehemals h1-losen Screens', () => {
  for (const f of files.filter((x) => /FlashcardScreen|CardLearning|Elaboration|ConceptMap|Lernzettel/.test(x))) {
    const bad = read(f).match(/<h2(?![^>]*aria-level)/g) || [];
    assert.equal(bad.length, 0, f);
  }
});

it('H1-04 Check-Ergebnis: summaryText ist die Level-1-Überschrift', () => {
  assert.match(read('src/screens/session/CheckUnderstandingPhase.jsx'), /<p className="feedback-text" role="heading" aria-level=\{1\}>\{result\.summaryText\}<\/p>/);
});
