/**
 * Golden Set – Auswertung (rein, ohne Netzwerk, daher testbar)
 * ─────────────────────────────────────────────────────────────────────────────
 * Zählt für /api/evaluate-card-answer:
 *   - Treffer (TP): Antwort enthält eine echte Fehlvorstellung UND Lumo nennt eine
 *   - Verpasst (FN): echte Fehlvorstellung, Lumo nennt keine
 *   - False Positive (FP): keine Fehlvorstellung in der Antwort, Lumo nennt trotzdem eine
 *   - Richtig still (TN): keine Fehlvorstellung, Lumo schweigt
 * Zusätzlich: Stimmt isGood mit der Erwartung überein (nur wo eine Erwartung steht)?
 *
 * Ob der GENANNTE Text inhaltlich stimmt, misst das Skript nicht – das muss ein
 * Mensch in der Ausgabe lesen (Spalte "Text").
 */

/** @param {unknown} v */
export function hasMisconception(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * @param {Array<{id:string,kategorie:string,expectMisconception:boolean,expectGood:boolean|null}>} items
 * @param {Record<string,{isGood?:boolean,misconception?:string}|{error:string}>} responses  id → Antwort der API
 */
export function score(items, responses) {
  const rows = [];
  let tp = 0, fn = 0, fp = 0, tn = 0, goodChecked = 0, goodOk = 0, failed = 0;

  for (const it of items) {
    const r = responses[it.id];
    if (!r) continue; // nicht gelaufen (z. B. Kurzlauf)
    if ('error' in r) {
      failed++;
      rows.push({ id: it.id, kategorie: it.kategorie, erwartet: it.expectMisconception, fehler: r.error });
      continue;
    }
    const got = hasMisconception(r.misconception);
    let outcome;
    if (it.expectMisconception && got) { tp++; outcome = 'Treffer'; }
    else if (it.expectMisconception && !got) { fn++; outcome = 'verpasst'; }
    else if (!it.expectMisconception && got) { fp++; outcome = 'FALSE POSITIVE'; }
    else { tn++; outcome = 'richtig still'; }

    let goodMatch = null;
    if (typeof it.expectGood === 'boolean' && typeof r.isGood === 'boolean') {
      goodChecked++;
      goodMatch = r.isGood === it.expectGood;
      if (goodMatch) goodOk++;
    }
    rows.push({
      id: it.id, kategorie: it.kategorie, erwartet: it.expectMisconception,
      genannt: got, outcome, isGood: r.isGood, goodMatch,
      text: got ? r.misconception.trim() : '',
    });
  }

  const positives = tp + fn;
  const negatives = fp + tn;
  return {
    rows,
    counts: { tp, fn, fp, tn, positives, negatives, failed, goodChecked, goodOk },
    // null = nicht berechenbar (keine Fälle dieser Art gelaufen)
    recall: positives ? tp / positives : null,
    falsePositiveRate: negatives ? fp / negatives : null,
  };
}

/** Prozent für die Ausgabe; mit Zähler, damit kleine Stichproben nicht größer wirken als sie sind. */
export function fmt(part, whole) {
  if (!whole) return 'n/a (keine Fälle)';
  return `${part} von ${whole} (${Math.round((part / whole) * 100)} %)`;
}

/** Kurzlauf = nur die mit quick:true markierten Fälle. */
export function selectItems(items, quick) {
  return quick ? items.filter((i) => i.quick) : items;
}
