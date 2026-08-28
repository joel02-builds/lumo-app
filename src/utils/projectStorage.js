const STORAGE_KEY = 'lumo_project';

// Nur das persistieren, was für den "Willkommen zurück"-Screen und den
// weiteren Lernfortschritt gebraucht wird – NICHT das rohe Lernmaterial
// (materialText/fileBase64), das kann mehrere MB groß sein und wird nach der
// Analyse ohnehin nicht mehr gebraucht.
export function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.blocks) || data.blocks.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveProject(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage kann voll sein (QuotaExceededError) oder z. B. im privaten
    // Modus fehlschlagen – dann einfach nicht persistieren, statt die App abstürzen zu lassen.
  }
}

export function clearProject() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
