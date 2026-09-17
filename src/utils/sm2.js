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
