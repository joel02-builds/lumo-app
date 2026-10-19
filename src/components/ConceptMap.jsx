/**
 * ConceptMap — Interaktive Concept Map Komponente
 *
 * Verbesserungen vs. vorher:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Drag-to-reposition: Nodes können verschoben werden (Pointer Events)
 * 2. Tap/Click auf Node → Fokus-State: hebt den Node hervor, zeigt Label
 * 3. Aktive Verbindungen werden hervorgehoben wenn Node fokussiert
 * 4. Touch-optimiert (ADHS-Nutzer nutzen oft Mobile)
 *
 * ADHS-Design:
 * – Interaktivität steigert Engagement und Aufmerksamkeit
 * – Generative Processing: eigenes Anordnen fördert tieferes Verstehen
 *   (Chi et al., 1989 – Self-Explanation Effect)
 * – Keine forcierte Struktur: freies Layout reduziert kognitiven Druck
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const NODE_RADIUS_CENTER = 46;
const NODE_RADIUS_OUTER = 38;
const SVG_W = 520;
const SVG_H = 360;

function buildInitialPositions(nodes) {
  const cx = SVG_W / 2;
  const cy = SVG_H / 2;
  const r = 130;
  const centerNode = nodes.find(n => n.isCenter) || nodes[0];
  const outerNodes = nodes.filter(n => n.id !== centerNode.id);
  const positions = {};
  positions[centerNode.id] = { x: cx, y: cy };
  outerNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / outerNodes.length - Math.PI / 2;
    positions[node.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  return positions;
}

export default function ConceptMap({ nodes, edges, color }) {
  const c = color || '#D4A843';
  const svgRef = useRef(null);

  // Initialpositionen
  const [positions, setPositions] = useState(() =>
    nodes?.length ? buildInitialPositions(nodes) : {}
  );

  // Neuberechnung wenn nodes sich ändern
  useEffect(() => {
    if (nodes?.length) {
      setPositions(buildInitialPositions(nodes));
      setFocusId(null);
    }
  }, [JSON.stringify(nodes?.map(n => n.id))]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag State
  const dragRef = useRef(null); // { nodeId, startX, startY, origX, origY }
  const [focusId, setFocusId] = useState(null); // angeklickter Node

  if (!nodes?.length) return null;

  // Koordinaten aus Pointer Event → SVG-Koordinaten umrechnen
  function getSVGCoords(e) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = SVG_W / rect.width;
    const scaleY = SVG_H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(e, nodeId) {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getSVGCoords(e);
    dragRef.current = {
      nodeId,
      startX: x,
      startY: y,
      origX: positions[nodeId].x,
      origY: positions[nodeId].y,
      moved: false,
    };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragRef.current) return;
    const { x, y } = getSVGCoords(e);
    const dx = x - dragRef.current.startX;
    const dy = y - dragRef.current.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 4) dragRef.current.moved = true;

    const nodeId = dragRef.current.nodeId;
    const newX = Math.max(48, Math.min(SVG_W - 48, dragRef.current.origX + dx));
    const newY = Math.max(40, Math.min(SVG_H - 40, dragRef.current.origY + dy));
    setPositions(prev => ({
      ...prev,
      [nodeId]: { x: newX, y: newY },
    }));
  }

  function onPointerUp(e, nodeId) {
    if (!dragRef.current) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current = null;
    // Wenn nicht bewegt → Tap → Toggle focus
    if (!wasDrag) {
      setFocusId(prev => prev === nodeId ? null : nodeId);
    }
  }

  function onPointerCancel() {
    dragRef.current = null;
  }

  const centerNode = nodes.find(n => n.isCenter) || nodes[0];

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          width: '100%',
          maxHeight: '300px',
          touchAction: 'none', // verhindert Scroll beim Drag auf Touch
          cursor: 'default',
          userSelect: 'none',
        }}
        xmlns="http://www.w3.org/2000/svg"
        onPointerMove={onPointerMove}
        onPointerUp={(e) => {
          // Falls Drag auf SVG-Ebene endet (außerhalb Node)
          if (dragRef.current) {
            dragRef.current = null;
          }
        }}
        onPointerCancel={onPointerCancel}
      >
        {/* Hintergrund-Tap zum Defokussieren */}
        <rect
          x="0" y="0"
          width={SVG_W} height={SVG_H}
          fill="transparent"
          onClick={() => setFocusId(null)}
        />

        {/* Verbindungslinien */}
        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          // Edge ist aktiv wenn fokussierter Node beteiligt ist
          const isActive = focusId && (edge.from === focusId || edge.to === focusId);
          const isInactive = focusId && !isActive;

          return (
            <g key={i} style={{ transition: 'opacity 0.2s ease' }} opacity={isInactive ? 0.2 : 1}>
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke={isActive ? c : `${c}44`}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
              />
              {/* Pfeil-Spitze für aktive Kanten */}
              {isActive && (
                <circle
                  cx={to.x}
                  cy={to.y}
                  r={4}
                  fill={c}
                  opacity={0.7}
                />
              )}
              {/* Edge-Label */}
              <rect
                x={mx - 38} y={my - 10}
                width="76" height="20"
                rx="10"
                fill="var(--bg)"
                opacity={isInactive ? 0.4 : 1}
              />
              <text
                x={mx} y={my + 4}
                textAnchor="middle"
                fontSize="9"
                fill={isActive ? c : `${c}88`}
                fontFamily="Inter, sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const isCenter = node.id === centerNode.id;
          const isFocused = focusId === node.id;
          const isInactive = focusId && !isFocused && !edges.some(e => e.from === focusId && e.to === node.id || e.to === focusId && e.from === node.id);
          const nodeR = isCenter ? NODE_RADIUS_CENTER : NODE_RADIUS_OUTER;
          const words = node.label.split(' ');

          return (
            <g
              key={node.id}
              style={{
                cursor: 'grab',
                transition: 'opacity 0.2s ease',
              }}
              opacity={isInactive ? 0.3 : 1}
              onPointerDown={(e) => onPointerDown(e, node.id)}
              onPointerUp={(e) => onPointerUp(e, node.id)}
            >
              {/* Glow-Ring bei fokussiertem Node */}
              {isFocused && (
                <circle
                  cx={pos.x} cy={pos.y}
                  r={nodeR + 10}
                  fill="none"
                  stroke={c}
                  strokeWidth="2"
                  opacity={0.3}
                  style={{
                    animation: 'lumo-breathe 2s ease-in-out infinite',
                  }}
                />
              )}
              <circle
                cx={pos.x} cy={pos.y}
                r={nodeR}
                fill={isCenter ? c : isFocused ? `${c}33` : 'var(--bg-card)'}
                stroke={c}
                strokeWidth={isFocused ? 2 : isCenter ? 0 : 1.5}
                style={{ transition: 'fill 0.2s ease, stroke-width 0.15s ease' }}
              />
              {words.map((word, wi) => (
                <text
                  key={wi}
                  x={pos.x}
                  y={pos.y + (wi - (words.length - 1) / 2) * 13}
                  textAnchor="middle"
                  fontSize={isCenter ? 11 : 10}
                  fontWeight={isCenter || isFocused ? '700' : '500'}
                  fill={isCenter ? '#1a1206' : isFocused ? c : 'var(--text-primary)'}
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: 'none', transition: 'fill 0.2s ease' }}
                >
                  {word}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Interaktivitäts-Hinweis */}
      <p style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        marginTop: '6px',
        opacity: 0.6,
        fontStyle: 'italic',
      }}>
        Tippe auf einen Begriff · Ziehe zum Anordnen
      </p>
    </div>
  );
}
