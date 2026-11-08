// useChronoBias.js — Chronobiologisch ausgelöster Dusk-Modus
//
// Wissenschaftliche Basis:
//   Bijlenga et al. (2019) — 73% der ADHS-Erwachsenen zeigen ein Delayed Sleep
//   Phase Syndrome (DSPS). Ihr natürliches kognitives Fokus-Fenster liegt abends,
//   oft zwischen 20:00–01:00 Uhr. Lumo respektiert diesen Rhythmus, anstatt ihn
//   mit einem fixen Tageslayout zu ignorieren.
//
// Was dieser Hook tut:
//   Ab 20:00 Uhr setzt er data-dusk="" auf <html>. Das CSS reagiert darauf und
//   wechselt von Gold (#D4A843) zu Amber (#E87828) — wärmere, orange-betonte
//   Töne mit weniger Blauanteil. Morgens um 06:00 Uhr wechselt die Palette
//   automatisch zurück.
//
// Design-Entscheidungen:
//   - Kein manueller Toggle — automatisch wie das Licht draußen
//   - Prüft jede Minute, damit Tabs die über 20:00 offen bleiben korrekt umschalten
//   - Cleanup beim Unmount (SSR-safe, kein globaler Side-Effect verbleibt)

import { useEffect } from 'react';

/** Gibt true zurück wenn der aktuelle Zeitpunkt im Dusk-Fenster liegt (20:00–05:59). */
function isDuskTime() {
  const hours = new Date().getHours();
  // 20–23 Uhr: Abend-Fokusfenster laut Bijlenga et al. 2019
  // 0–5 Uhr:   Nacht (DSPS-bedingte Late-Night-Sessions)
  return hours >= 20 || hours < 6;
}

export function useChronoBias() {
  useEffect(() => {
    const html = document.documentElement;

    function applyChronoBias() {
      if (isDuskTime()) {
        html.setAttribute('data-dusk', '');
      } else {
        html.removeAttribute('data-dusk');
      }
    }

    // Sofort beim Mount anwenden
    applyChronoBias();

    // Jede Minute neu prüfen — damit der Wechsel bei 20:00 nicht erst beim
    // nächsten Reload passiert, sondern im laufenden Tab
    const interval = setInterval(applyChronoBias, 60_000);

    return () => {
      clearInterval(interval);
      // Cleanup: Attribut entfernen (z. B. bei HMR in Dev)
      html.removeAttribute('data-dusk');
    };
  }, []);
}
