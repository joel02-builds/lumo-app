/**
 * Tab-Abgleich (F009 Stufe 1) – zwei Tabs / Browser + PWA überschreiben sich nicht mehr
 * ─────────────────────────────────────────────────────────────────────────────
 * Problem: Jeder Tab hält seinen State im Speicher und schrieb ihn bei JEDER Änderung
 * blind nach localStorage, IndexedDB und zum Server. Ein Tab mit altem Stand
 * überschrieb so den neueren Stand des anderen Tabs (Block-Fortschritt, FSRS-Karten).
 *
 * Lösung, nur im Client, Speicherformat des Projekts (`lumo_project`) UNVERÄNDERT:
 *   • Zusätzlich gibt es einen eigenen kleinen Schlüssel `lumo_project_rev` mit einer
 *     zufälligen Revisions-Kennung. Wer schreibt, setzt eine neue Kennung.
 *   • Jeder Tab merkt sich, welche Kennung er zuletzt selbst geschrieben oder
 *     übernommen hat (`lastSeen`). Weicht die gespeicherte Kennung davon ab, hat ein
 *     anderer Tab seitdem geschrieben → dieser Tab ist veraltet.
 *   • Ein veralteter Tab schreibt NICHT blind. Er vergleicht per countProgress, welcher
 *     Stand mehr Fortschritt hat (Gleichstand → der gespeicherte, weil neuer). Der
 *     Gewinner bleibt unverändert; nur wenn der Verlierer für DIESELBE Karten-ID mehr
 *     Wiederholungen hat, wird diese eine Karte übernommen (ganzes Kartenobjekt, keine
 *     Feld-Mischung, Reihenfolge des Gewinners bleibt).
 *   • Tab-lokale Fortschritte in anderen Blöcken werden nicht gemischt – das wäre ein
 *     echter Merge (Stufe 2, braucht Versionszähler am Server).
 *
 * Rein und ohne Browser-Globals testbar: `storage` wird übergeben.
 */
import { countProgress, cardReps } from './progress.js';

export const PROJECT_KEY = 'lumo_project';
export const REV_KEY = 'lumo_project_rev';

let revCounter = 0;
const newRev = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${(revCounter++).toString(36)}`;

function safeGet(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

/** Gespeicherten Stand lesen. null, wenn nichts Brauchbares (leer, kaputt, ohne Blöcke/Projekte). */
function readStoredSnapshot(storage) {
  try {
    const raw = storage.getItem(PROJECT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const hasBlocks = Array.isArray(data.blocks) && data.blocks.length > 0;
    const hasProjects = Array.isArray(data.projects) && data.projects.length > 0;
    return hasBlocks || hasProjects ? data : null;
  } catch {
    return null;
  }
}

/** Ist `b` für dieselbe Karte „weiter“ als `a`? Mehr Wiederholungen, bei Gleichstand späteres lastReviewed. */
function isFurther(a, b) {
  const ra = cardReps(a), rb = cardReps(b);
  if (rb !== ra) return rb > ra;
  const ta = Date.parse(a?.lastReviewed) || 0, tb = Date.parse(b?.lastReviewed) || 0;
  return tb > ta;
}

/**
 * Gewinner-Stand + beste Karten des Verlierers (gleiche ID).
 * Verändert die Eingaben nicht. Gibt dasselbe Objekt zurück, wenn nichts ersetzt wird.
 */
export function resolveSnapshots(mine, stored) {
  const base = countProgress(stored) >= countProgress(mine) ? stored : mine;
  const other = base === stored ? mine : stored;
  if (!Array.isArray(base.flashcards) || !Array.isArray(other.flashcards)) return base;

  const otherById = new Map();
  for (const c of other.flashcards) if (c && c.id != null) otherById.set(c.id, c);

  let changed = false;
  const cards = base.flashcards.map((c) => {
    const o = c && c.id != null ? otherById.get(c.id) : undefined;
    if (o && isFurther(c, o)) { changed = true; return o; }
    return c;
  });
  return changed ? { ...base, flashcards: cards } : base;
}

/**
 * @param {{ storage?: Storage }} [opts]
 * Fällt bei fehlendem/kaputtem Speicher auf „immer schreiben“ zurück (altes Verhalten).
 */
export function createTabSync({ storage } = {}) {
  let store = storage;
  if (!store) {
    try { store = globalThis.localStorage; } catch { store = null; }
  }
  if (!store) {
    return { beforeSave: () => ({ action: 'write', adopt: false }), afterSave() {}, checkIncoming: () => ({ adopt: false }) };
  }

  let lastSeen = safeGet(store, REV_KEY);
  let echo = null;       // JSON eines gerade übernommenen Stands: das Zurückspeichern überspringen
  let prevProject = null;

  /** Stand eines anderen Tabs gegen den eigenen abwägen (nur aufrufen, wenn veraltet). */
  function resolveStale(snapshot, raw) {
    const stored = readStoredSnapshot(store);
    lastSeen = raw;
    if (!stored) return { action: 'write', adopt: false };
    const mineJson = JSON.stringify(snapshot);
    const storedJson = JSON.stringify(stored);
    if (mineJson === storedJson) return { action: 'skip', adopt: false }; // schon identisch
    const merged = resolveSnapshots(snapshot, stored);
    const mergedJson = JSON.stringify(merged);
    if (mergedJson === mineJson) return { action: 'write', adopt: false }; // eigener Stand gewinnt unverändert
    // Eigener State muss sich ändern → übernehmen. Das Zurückschreiben überspringen wir nur,
    // wenn der Stand bereits exakt so gespeichert ist; sonst schreibt der nächste Lauf das Ergebnis.
    echo = mergedJson === storedJson ? mergedJson : null;
    return { action: 'skip', adopt: true, snapshot: merged };
  }

  return {
    /**
     * Vor jedem Speichern aufrufen.
     * → { action: 'write' | 'skip', adopt: boolean, snapshot?: object }
     *   adopt=true: State per ADOPT_SNAPSHOT auf `snapshot` setzen.
     *   action='skip': diesmal weder localStorage noch IndexedDB noch Server beschreiben.
     */
    beforeSave(snapshot) {
      const raw = safeGet(store, REV_KEY);
      if (echo !== null) {
        const same = JSON.stringify(snapshot) === echo;
        echo = null;
        if (same) { lastSeen = raw; return { action: 'skip', adopt: false }; }
      }
      if (raw === lastSeen) {
        prevProject = safeGet(store, PROJECT_KEY);
        return { action: 'write', adopt: false };
      }
      const res = resolveStale(snapshot, raw);
      if (res.action === 'write') prevProject = safeGet(store, PROJECT_KEY);
      return res;
    },

    /** Direkt nach dem localStorage-Write aufrufen. Neue Revision nur, wenn sich der Inhalt änderte. */
    afterSave() {
      try {
        if (safeGet(store, PROJECT_KEY) === prevProject) return; // nichts geändert → kein Lärm für andere Tabs
        const rev = newRev();
        store.setItem(REV_KEY, rev);
        lastSeen = rev;
      } catch { /* Speicher voll/gesperrt – dann gibt es auch keinen Abgleich */ }
    },

    /** Bei storage-Event / Tab wieder sichtbar: veraltet? Dann Stand übernehmen (kein Schreiben). */
    checkIncoming(snapshot) {
      const raw = safeGet(store, REV_KEY);
      if (raw === lastSeen) return { adopt: false };
      const res = resolveStale(snapshot, raw);
      return res.adopt ? { adopt: true, snapshot: res.snapshot } : { adopt: false };
    },
  };
}
