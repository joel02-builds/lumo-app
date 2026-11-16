/**
 * Dashboard-Kostenschutz
 * ─────────────────────────────────────────────────────────────────────────────
 * Das Dashboard darf beim Öffnen keinen KI-Aufruf auslösen. Früher feuerte es
 * generateCards zum "Vorwärmen" eines Caches, den es nicht gibt – jeder
 * Dashboard-Besuch kostete einen bezahlten API-Call.
 *
 * Ohne Browser-Testumgebung prüfen wir das am Quelltext: DashboardScreen darf
 * den API-Client weder importieren noch aufrufen.
 *
 *   DN-01  kein Import von api/lumo.js
 *   DN-02  kein lumoApi- oder fetch-Aufruf
 *   DN-03  App.jsx übergibt flashcards und projects (Fällig-Zähler)
 */
import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync(new URL('../src/screens/dashboard/DashboardScreen.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

describe('Dashboard löst keine KI-Aufrufe aus', () => {
  it('DN-01 importiert den API-Client nicht', () => {
    assert.ok(!dashboard.includes('api/lumo.js'), 'DashboardScreen importiert api/lumo.js');
  });

  it('DN-02 ruft weder lumoApi noch fetch auf', () => {
    assert.ok(!dashboard.includes('lumoApi.'), 'DashboardScreen ruft lumoApi auf');
    assert.ok(!dashboard.includes('fetch('), 'DashboardScreen ruft fetch auf');
  });

  it('DN-03 App.jsx übergibt flashcards und projects an das Dashboard', () => {
    const start = app.indexOf('<DashboardScreen');
    const usage = app.slice(start, app.indexOf('/>', start));
    assert.ok(usage.includes('flashcards={'), 'flashcards-Prop fehlt');
    assert.ok(usage.includes('projects={'), 'projects-Prop fehlt');
  });
});
