export function exportProject() {
  try {
    const project = localStorage.getItem('lumo_project');
    const streak = localStorage.getItem('lumo_streak');
    const notes = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('lumo_note_')) {
        notes[key] = localStorage.getItem(key);
      }
    }
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: project ? JSON.parse(project) : null,
      streak: streak ? JSON.parse(streak) : null,
      notes,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumo-backup-${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export function importProject(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.project) {
          reject(new Error('Ungültige Backup-Datei.'));
          return;
        }
        if (data.project) {
          localStorage.setItem('lumo_project', JSON.stringify(data.project));
        }
        if (data.streak) {
          localStorage.setItem('lumo_streak', JSON.stringify(data.streak));
        }
        if (data.notes) {
          Object.entries(data.notes).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
        }
        resolve(true);
      } catch {
        reject(new Error('Datei konnte nicht gelesen werden.'));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
    reader.readAsText(file);
  });
}
