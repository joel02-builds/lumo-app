// Der Mood-Check im FocusRitual kennt vier Lernzustände (Pekrun 2006) plus
// 'good' beim Überspringen. Der Karten-Prompt (server/prompts.js →
// getCardSystem) und CardLearningPhase kennen dagegen nur drei Stufen:
// good | okay | bad. Ohne diese Übersetzung landeten "müde", "gestresst" und
// "überfordert" im Standardzweig "fit und motiviert" – das Gegenteil dessen,
// was Lumo dem Nutzer im Ritual zusagt.
//
// Die Zuordnung folgt den Zusagen, die FocusRitualPhase anzeigt:
//   tired / overwhelmed → bad   ("Kürzere Erklärungen", "Nur das Wichtigste")
//   stressed            → okay  ("Ich halte es übersichtlich")
const SESSION_MOODS = {
  focused: 'good',
  good: 'good',
  stressed: 'okay',
  tired: 'bad',
  overwhelmed: 'bad',
};

export function toSessionMood(ritualMood) {
  return SESSION_MOODS[ritualMood] ?? null;
}
