const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function daysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

// value/onChange arbeiten mit { day, month, year } (Zahlen oder '' wenn leer).
export default function DateSelect({ value, onChange }) {
  const { day, month, year } = value;
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];

  function update(field, raw) {
    const val = raw === '' ? '' : Number(raw);
    const next = { ...value, [field]: val };
    if (next.day) {
      const max = daysInMonth(field === 'month' ? val : next.month, field === 'year' ? val : next.year);
      if (next.day > max) next.day = max;
      if (next.day < 1) next.day = 1;
    }
    onChange(next);
  }

  function handleDayInput(raw) {
    if (raw === '') {
      update('day', '');
      return;
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    update('day', String(Math.min(31, Math.max(1, n))));
  }

  return (
    <div className="date-select-row">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        placeholder="TT"
        className="date-input"
        value={day}
        onChange={(e) => handleDayInput(e.target.value)}
        aria-label="Tag"
      />
      <select
        className="date-select date-select--month"
        value={month}
        onChange={(e) => update('month', e.target.value)}
        aria-label="Monat"
      >
        <option value="">Monat</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        className="date-select"
        value={year}
        onChange={(e) => update('year', e.target.value)}
        aria-label="Jahr"
      >
        <option value="">Jahr</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export function isDateComplete(value) {
  return Boolean(value.day && value.month && value.year);
}

export function toIsoDate(value) {
  if (!isDateComplete(value)) return '';
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}
