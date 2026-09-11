import LumoMascot from '../components/LumoMascot.jsx';
import Button from '../components/Button.jsx';
import { getSubjectColor } from '../utils/subjectColors.js';

export default function AnalysisResultScreen({ blocks, totalBlocks, recommendedOrder, onStart, onReanalyze, subject }) {
  const subjectColor = getSubjectColor(subject);
  const totalMinutes = blocks.reduce((sum, b) => sum + (b.estimatedMinutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeString = hours > 0
    ? `ca. ${hours} Std. ${minutes > 0 ? minutes + ' Min.' : ''}`
    : `ca. ${minutes} Min.`;

  return (
    <div className="screen">
      <div className="screen-content" style={{ gap: '24px', maxWidth: '480px' }}>

        <LumoMascot state="complete" />

        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: `${subjectColor}22`,
            border: `1px solid ${subjectColor}`,
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: '700',
            color: subjectColor,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            {subject || 'Allgemein'}
          </div>
          <h1 style={{ fontSize: '26px', marginBottom: '8px', lineHeight: '1.2' }}>
            Lumo hat alles vorbereitet.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {totalBlocks} Blöcke · {timeString} Gesamtlernzeit
          </p>
        </div>

        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {blocks.map((b, i) => (
            <div key={b.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              borderLeft: i === 0 ? `3px solid ${subjectColor}` : '1px solid var(--border)',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: i === 0 ? subjectColor : 'var(--bg-card-bright)',
                color: i === 0 ? '#1a1206' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: i === 0 ? '600' : '400',
                  color: 'var(--text-primary)',
                }}>
                  {b.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {b.estimatedMinutes} Min. · {b.difficulty}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={onStart} style={{ width: '100%' }}>
          Jetzt starten
        </Button>

        <button
          onClick={onReanalyze}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Neu analysieren
        </button>

      </div>
    </div>
  );
}
