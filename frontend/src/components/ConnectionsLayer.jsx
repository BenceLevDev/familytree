import React from "react";

const ConnectionsLayer = ({ relationships, positions }) => {
  const pairIndices = {};
  let nextPairIndex = 0;

  return (
    <svg className="connections-layer" style={{ overflow: "visible" }}>
      {relationships.map((rel, index) => {
        // --- 1. Házastársak (Szaggatott vonal) ---
        if (rel.type === "spouse" && positions[rel.from] && positions[rel.to]) {
          const fromPos = positions[rel.from];
          const toPos = positions[rel.to];
          return (
            <line
              key={`spouse-${index}`}
              x1={fromPos.right}
              y1={fromPos.centerY}
              x2={toPos.left}
              y2={toPos.centerY}
              stroke="#000000"
              strokeWidth="3"
              strokeDasharray="5,5"
              strokeLinecap="square"
            />
          );
        }

        // --- 2. Szülő-Gyermek kapcsolat (Szögletes vonalvezetés) ---
        if (
          rel.type === "parent" &&
          positions[rel.parent1id] &&
          positions[rel.parent2id] &&
          positions[rel.to]
        ) {
          const p1 = positions[rel.parent1id];
          const p2 = positions[rel.parent2id];
          const child = positions[rel.to];

          // Szülőpáros azonosítása és indexelése a magassághoz
          const parentsKey = [rel.parent1id, rel.parent2id].sort().join("-");

          if (pairIndices[parentsKey] === undefined) {
            pairIndices[parentsKey] = nextPairIndex++;
          }
          const pairIndex = pairIndices[parentsKey];

          // Lépcsőzetes eltolás
          const verticalOffset = (pairIndex % 10) * 12;

          // Koordináták
          const startX = (p1.right + p2.left) / 2;
          const startY = p1.centerY;
          const forkY = startY + (child.topY - startY) / 2 + verticalOffset;

          const diffX = child.centerX - startX;
          // Ha nagyon közel van vízszintesen, akkor egyenesnek tekintjük
          const isStraight = Math.abs(diffX) < 1;

          // Útvonal generálás - SZÖGLETES (Manhattan routing)
          // Nincs 'Q' (quadratic curve), csak 'L' (line to)
          const dPath = isStraight
            ? `M ${startX} ${startY} L ${startX} ${child.topY}`
            : `M ${startX} ${startY} 
               L ${startX} ${forkY} 
               L ${child.centerX} ${forkY} 
               L ${child.centerX} ${child.topY}`;

          const pathColor = "#4b5b5e"; // Palaszürke

          return (
            <g key={`parent-group-${index}`}>
              <path
                d={dPath}
                fill="none"
                stroke={pathColor}
                strokeWidth="2"
                strokeLinejoin="miter" // Hegyes sarok a 'round' helyett
                strokeLinecap="square" // Szögletes végződés a 'round' helyett
              />
            </g>
          );
        }
        return null;
      })}
    </svg>
  );
};

export default ConnectionsLayer;
