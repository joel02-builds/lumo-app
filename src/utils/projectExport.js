/**
 * Exportiert einen lesbaren Lernfortschritts-Bericht als Text-Datei (.txt).
 *
 * ADHS-Design-Überlegungen:
 * – Einfaches Format (kein PDF-Renderer nötig, läuft 100% offline)
 * – "Teilen"-Variante nutzt Web Share API wenn verfügbar (mobile-nativ)
 * – Klar strukturiert, schnell erfassbar — kein Rausch an Zahlen
 * – Motivationssprache: Effort-Praise (Dweck 1998) statt nur Zahlen
 *
 * Enthält:
 * – Thema & Ziel
 * – Lernfortschritt pro Block (✓ / noch offen)
 * – Streak
 * – Flashcard-Retention (sofern vorhanden)
 * – Generierungsdatum
 */
export function exportProgressReport() {
  try {
    const projectRaw = localStorage.getItem('lumo_project');
    const streakRaw = localStorage.getItem('lumo_streak');
    const project = projectRaw ? JSON.parse(projectRaw) : null;
    const streak = streakRaw ? JSON.parse(streakRaw) : null;

    if (!project) return { success: false, reason: 'Kein Lernprojekt gefunden.' };

    const blocks = project.blocks || [];
    const done = blocks.filter(b => b.completed || b.completionCount > 0);
    const topic = project.topic || 'Mein Thema';
    const goalType = project.goalType || 'verstehen';
    const date = new Date().toLocaleDateString('de-DE', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const streakDays = streak?.days || 0;
    const blocksAnalyzedTotal = project.blocksAnalyzedTotal || done.length;

    // Progress-Balken aus Unicode-Zeichen
    const pct = blocks.length > 0 ? Math.round((done.length / blocks.length) * 100) : 0;
    const barFull = Math.round(pct / 10);
    const bar = '█'.repeat(barFull) + '░'.repeat(10 - barFull);

    const lines = [
      '╔══════════════════════════════════════╗',
      '║        Lumo · Lernfortschritt        ║',
      '╚══════════════════════════════════════╝',
      '',
      `📚 Thema:   ${topic}`,
      `🎯 Ziel:    ${goalType === 'exam' ? 'Prüfung bestehen' : goalType === 'essay' ? 'Hausarbeit schreiben' : 'Thema verstehen'}`,
      `📅 Stand:   ${date}`,
      '',
      '──────────────────────────────────────',
      '  FORTSCHRITT',
      '──────────────────────────────────────',
      '',
      `  ${bar}  ${pct}%`,
      `  ${done.length} von ${blocks.length} Blöcken abgeschlossen`,
      `  ${blocksAnalyzedTotal} Blöcke insgesamt analysiert`,
      '',
    ];

    if (streakDays > 0) {
      lines.push(`  🔥 Lern-Streak: ${streakDays} ${streakDays === 1 ? 'Tag' : 'Tage'} am Stück`);
      lines.push('');
    }

    if (blocks.length > 0) {
      lines.push('──────────────────────────────────────');
      lines.push('  BLÖCKE');
      lines.push('──────────────────────────────────────');
      lines.push('');
      blocks.forEach(b => {
        const isDone = b.completed || (b.completionCount || 0) > 0;
        const icon = isDone ? '✓' : '○';
        const subject = b.subject ? ` [${b.subject}]` : '';
        lines.push(`  ${icon}  ${b.title || 'Block'}${subject}`);
      });
      lines.push('');
    }

    lines.push('──────────────────────────────────────');
    lines.push('');
    lines.push('  Du hast durchgehalten. Das zählt.');
    lines.push('');
    lines.push(`  Erstellt mit Lumo · lumo-app.de`);
    lines.push('');

    const text = lines.join('\n');
    const fileName = `lumo-fortschritt-${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.txt`;

    // Web Share API für mobile-natives Teilen (ADHS: niedrige Hürde zum Teilen)
    if (navigator.share) {
      navigator.share({
        title: `Mein Lernfortschritt: ${topic}`,
        text,
        // Kein `files` — maximale Kompatibilität
      }).catch(() => {
        // Fallback: Download
        _downloadText(text, fileName);
      });
      return { success: true, shared: true };
    }

    _downloadText(text, fileName);
    return { success: true, shared: false };
  } catch {
    return { success: false, reason: 'Export fehlgeschlagen.' };
  }
}

function _downloadText(text, fileName) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
