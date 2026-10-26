export default function CardVisual({ visual_type, visual_data, subjectColor }) {
  const color = subjectColor || '#D4A843';

  if (!visual_type || visual_type === 'none' || !visual_data) return null;

  const baseStyle = {
    width: '100%',
    background: 'var(--bg-elevated)',
    borderRadius: '10px',
    padding: '14px 16px',
    margin: '12px 0',
    border: `1px solid ${color}33`,
  };

  if (visual_type === 'comparison') {
    return (
      <div style={baseStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: color, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {visual_data.left_label || 'A'}
            </p>
            {visual_data.items?.slice(0, Math.ceil((visual_data.items?.length || 0) / 2)).map((item, i) => (
              <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: '1.4' }}>
                • {item}
              </p>
            ))}
          </div>
          <div style={{ borderLeft: `1px solid ${color}44`, paddingLeft: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {visual_data.right_label || 'B'}
            </p>
            {visual_data.items?.slice(Math.ceil((visual_data.items?.length || 0) / 2)).map((item, i) => (
              <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: '1.4' }}>
                • {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visual_type === 'timeline') {
    return (
      <div style={baseStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {visual_data.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, marginTop: '4px' }} />
                {i < (visual_data.items?.length || 0) - 1 && (
                  <div style={{ width: '2px', flex: 1, background: `${color}44`, minHeight: '20px' }} />
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: '1.4' }}>
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual_type === 'cause_effect') {
    const cause = visual_data.items?.[0];
    const effect = visual_data.items?.[1];
    return (
      <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: color, margin: '0 0 4px', textTransform: 'uppercase' }}>Ursache</p>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0', lineHeight: '1.4' }}>{cause}</p>
        </div>
        <div style={{ fontSize: '20px', color: color, flexShrink: 0 }}>→</div>
        <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 4px', textTransform: 'uppercase' }}>Wirkung</p>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0', lineHeight: '1.4' }}>{effect}</p>
        </div>
      </div>
    );
  }

  if (visual_type === 'list') {
    return (
      <div style={baseStyle}>
        {visual_data.title && (
          <p style={{ fontSize: '12px', fontWeight: '700', color: color, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {visual_data.title}
          </p>
        )}
        {visual_data.items?.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '6px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>{item}</p>
          </div>
        ))}
      </div>
    );
  }

  if (visual_type === 'process') {
    return (
      <div style={baseStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visual_data.steps?.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: color, color: '#1a1206',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.5', paddingTop: '2px' }}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Analogy – abstraktes Konzept ↔ konkretes Bild (Mayer Multimedia Learning)
  // Zeigt Konzept und Analogie als zwei Hälften, verbunden durch ein ≈ Symbol
  if (visual_type === 'analogy') {
    return (
      <div style={{ ...baseStyle, padding: '0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}>
          {/* Konzept-Seite */}
          <div style={{ padding: '14px 16px' }}>
            <p style={{
              fontSize: '10px', fontWeight: '700', color: color,
              margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1.2px',
            }}>
              {visual_data.concept_label || 'Konzept'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0', lineHeight: '1.5' }}>
              {visual_data.concept_description}
            </p>
          </div>
          {/* Verbindungs-Symbol */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            borderLeft: `1px solid ${color}33`,
            borderRight: `1px solid ${color}33`,
          }}>
            <span style={{
              fontSize: '18px', color: color, opacity: 0.6,
              fontFamily: 'serif', lineHeight: 1,
            }}>≈</span>
          </div>
          {/* Analogie-Seite */}
          <div style={{ padding: '14px 16px', background: `${color}08`, borderRadius: '0 9px 9px 0' }}>
            <p style={{
              fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)',
              margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1.2px',
            }}>
              {visual_data.analogy_label || 'Stell dir vor …'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.5', fontStyle: 'italic' }}>
              {visual_data.analogy_description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Spectrum – Konzept auf einem Kontinuum (kein Entweder/Oder)
  // Zeigt eine Linie von links nach rechts mit verorteten Markern
  if (visual_type === 'spectrum') {
    const markers = visual_data.markers || [];
    return (
      <div style={baseStyle}>
        {visual_data.description && (
          <p style={{
            fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 14px',
            fontStyle: 'italic', lineHeight: '1.4',
          }}>
            {visual_data.description}
          </p>
        )}
        {/* Spektrum-Linie */}
        <div style={{ position: 'relative', padding: '0 0 28px' }}>
          {/* Track */}
          <div style={{
            height: '4px', borderRadius: '2px',
            background: `linear-gradient(to right, ${color}44, ${color})`,
            position: 'relative',
          }}>
            {/* Marker-Punkte auf der Linie */}
            {markers.map((m, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${Math.max(0, Math.min(100, m.position || 50))}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '10px', height: '10px', borderRadius: '50%',
                background: color,
                border: '2px solid var(--bg-elevated)',
                boxShadow: `0 0 6px ${color}66`,
              }} />
            ))}
          </div>
          {/* Marker-Labels unter der Linie */}
          {markers.map((m, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.max(0, Math.min(100, m.position || 50))}%`,
              top: '12px',
              transform: 'translateX(-50%)',
              fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>
              {m.label}
            </div>
          ))}
        </div>
        {/* Achsenbeschriftung */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0' }}>
          <p style={{ fontSize: '11px', color: `${color}88`, margin: '0', fontWeight: '600' }}>
            {visual_data.left_label}
          </p>
          <p style={{ fontSize: '11px', color: color, margin: '0', fontWeight: '600' }}>
            {visual_data.right_label}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
