export default function HighlightedText({ text, color, onTermClick }) {
  if (!text) return null;

  // Parst **Begriff** Markdown zu klickbaren Spans
  const parts = text.split(/\*\*([^*]+)\*\*/g);

  return (
    <span>
      {parts.map((part, i) => {
        // Ungerade Indizes sind die Begriffe zwischen **
        if (i % 2 === 1) {
          return (
            <span
              key={i}
              onClick={() => onTermClick?.(part)}
              style={{
                fontWeight: '700',
                color: color || 'var(--gold)',
                cursor: onTermClick ? 'pointer' : 'default',
                borderBottom: onTermClick ? `1px dashed ${color || 'var(--gold)'}` : 'none',
                padding: '0 1px',
              }}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
