const NOTES_KEY = 'lumo_notes';

function readAll() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadNote(blockId) {
  return readAll()[blockId] || '';
}

export function saveNote(blockId, text) {
  try {
    const all = readAll();
    all[blockId] = text;
    localStorage.setItem(NOTES_KEY, JSON.stringify(all));
  } catch {
    // localStorage kann z. B. im privaten Modus fehlschlagen – dann einfach nicht persistieren.
  }
}

// Block-IDs starten bei jedem neuen Projekt wieder bei 1 – ohne dieses Cleanup
// würden alte Notizen eines früheren Projekts in einem neuen Block wieder auftauchen.
export function clearAllNotes() {
  try {
    localStorage.removeItem(NOTES_KEY);
  } catch {
    // ignore
  }
}
