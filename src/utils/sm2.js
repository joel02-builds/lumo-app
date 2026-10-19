// SM-2 Algorithmus (SuperMemo 2)
// quality: 0=Keine Ahnung, 1=Schwer, 2=Mittel, 3=Leicht
export function calculateNextReview(card, quality) {
  const q = Math.max(0, Math.min(3, quality));

  let { easeFactor = 2.5, interval = 1, repetitions = 0 } = card;

  if (q >= 2) {
    // Korrekte Antwort
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (3 - q) * (0.08 + (3 - q) * 0.02));
  } else {
    // Falsche Antwort – zurück zum Anfang
    repetitions = 0;
    interval = 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview: nextReview.toISOString(),
    status: repetitions >= 5 ? 'mastered' : repetitions >= 1 ? 'learning' : 'new',
  };
}

export function isDueForReview(card) {
  if (!card.nextReview) return true;
  return new Date(card.nextReview) <= new Date();
}

export function getDueCards(flashcards) {
  return flashcards.filter(card =>
    card.status !== 'mastered' && isDueForReview(card)
  );
}

// Graduated Interleaving – Kornell & Bjork (2008)
//
// Ziel: Karten aus verschiedenen Blöcken/Subjects abwechseln, nicht blockieren.
// "Graduated" = erst leichtes Interleaving (selbes Subject, andere Karten),
// dann vollständiges Interleaving (andere Subjects).
//
// Algorithmus:
// 1. Karten nach Subject gruppieren
// 2. Round-Robin durch alle Subjects: eine Karte pro Runde
// 3. Innerhalb jedes Subjects: nach Schwierigkeit sortiert (schwer zuerst)
//    – dadurch kommt desirable difficulty früh, Erfolgserlebnisse am Ende
// 4. Wenn nur ein Subject vorhanden: zufällig mischen (kein blocked practice)
//
// Warum kein reines shuffle? Weil die Reihenfolge schwer→leicht innerhalb
// eines Subjects die Lernkurve nutzt. Reines shuffle verliert diese Struktur.
export function buildInterleavedQueue(cards) {
  if (!cards || cards.length === 0) return [];

  const difficultyOrder = { schwer: 0, mittel: 1, leicht: 2 };

  // Gruppieren nach Subject (oder Fallback 'default')
  const groups = {};
  for (const card of cards) {
    const key = card.subject || card.blockTitle || 'default';
    if (!groups[key]) groups[key] = [];
    groups[key].push(card);
  }

  // Innerhalb jeder Gruppe: schwer zuerst, dann nach nextReview (älteste zuerst)
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const diffDelta = (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
      if (diffDelta !== 0) return diffDelta;
      return new Date(a.nextReview || 0) - new Date(b.nextReview || 0);
    });
  }

  const subjectKeys = Object.keys(groups);

  // Nur ein Subject: zufällig mischen statt blockiert belassen
  if (subjectKeys.length === 1) {
    const arr = [...groups[subjectKeys[0]]];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Round-Robin über alle Subjects
  const queue = [];
  const pointers = {};
  for (const key of subjectKeys) pointers[key] = 0;

  let totalLeft = cards.length;
  while (totalLeft > 0) {
    for (const key of subjectKeys) {
      if (pointers[key] < groups[key].length) {
        queue.push(groups[key][pointers[key]]);
        pointers[key]++;
        totalLeft--;
      }
    }
  }

  return queue;
}
