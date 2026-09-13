import { useEffect, useRef } from 'react';

export default function ConceptMap({ nodes, edges, color }) {
  const svgRef = useRef(null);
  const c = color || '#D4A843';

  if (!nodes?.length) return null;

  // Einfaches radiales Layout
  const cx = 260;
  const cy = 180;
  const r = 120;
  const centerNode = nodes.find(n => n.isCenter) || nodes[0];
  const outerNodes = nodes.filter(n => !n.isCenter);

  const positions = {};
  positions[centerNode.id] = { x: cx, y: cy };
  outerNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / outerNodes.length - Math.PI / 2;
    positions[node.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 520 360"
      style={{ width: '100%', maxHeight: '280px' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Verbindungslinien */}
      {edges.map((edge, i) => {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) return null;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        return (
          <g key={i}>
            <line
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={`${c}44`}
              strokeWidth="1.5"
            />
            <rect
              x={mx - 36} y={my - 9}
              width="72" height="18"
              rx="9"
              fill="var(--bg)"
            />
            <text
              x={mx} y={my + 4}
              textAnchor="middle"
              fontSize="9"
              fill={`${c}99`}
              fontFamily="Inter, sans-serif"
            >
              {edge.label}
            </text>
          </g>
        );
      })}

      {/* Knoten */}
      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        const isCenter = node.isCenter;
        const nodeR = isCenter ? 44 : 36;
        const words = node.label.split(' ');
        return (
          <g key={node.id}>
            <circle
              cx={pos.x} cy={pos.y} r={nodeR}
              fill={isCenter ? c : 'var(--bg-card)'}
              stroke={c}
              strokeWidth={isCenter ? 0 : 1.5}
            />
            {words.map((word, wi) => (
              <text
                key={wi}
                x={pos.x}
                y={pos.y + (wi - (words.length - 1) / 2) * 13}
                textAnchor="middle"
                fontSize={isCenter ? 11 : 10}
                fontWeight={isCenter ? '700' : '500'}
                fill={isCenter ? '#1a1206' : 'var(--text-primary)'}
                fontFamily="Inter, sans-serif"
              >
                {word}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
