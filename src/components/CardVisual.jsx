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

  return null;
}
