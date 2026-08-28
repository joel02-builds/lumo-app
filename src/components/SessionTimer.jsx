function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Dezenter, nur aufwärtszählender Zeitindikator – kein Countdown, kein Druck.
export default function SessionTimer({ seconds }) {
  return (
    <div className="session-timer" aria-hidden="true">
      {formatTime(seconds)}
    </div>
  );
}
