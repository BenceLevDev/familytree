import React from "react";

const ConnectionsLayer = ({ relationships, positions }) => {
  return (
    <svg className="connections-layer">
      {relationships.map((rel, index) => {
        // Házastársak közötti egyenes vonal
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
              stroke="#666"
              strokeWidth="2"
            />
          );
        }

        // Szülő-Gyermek közötti hajlított (Bézier) vonal
        if (
          rel.type === "parent" &&
          positions[rel.parent1id] &&
          positions[rel.parent2id] &&
          positions[rel.to]
        ) {
          const p1 = positions[rel.parent1id];
          const p2 = positions[rel.parent2id];
          const child = positions[rel.to];

          // Számítások az ívhez:
          const startX = (p1.right + p2.left) / 2; // Két szülő közötti pont
          const startY = p1.centerY;
          const forkY = startY + (child.topY - startY) / 2; // Hol ágazzon el a vonal lefelé

          const borderRadius = 30;
          const diffX = child.centerX - startX;
          const direction = diffX > 0 ? 1 : -1;
          const isStraight = Math.abs(diffX) < 20;

          // SVG Path útvonal leírása (M=mozgás, L=vonal, Q=hajlítás)
          const dPath = isStraight
            ? `M ${startX} ${startY} L ${startX} ${child.topY}`
            : `M ${startX} ${startY} L ${startX} ${forkY - borderRadius} Q ${startX} ${forkY} ${startX + borderRadius * direction} ${forkY} L ${child.centerX - borderRadius * direction} ${forkY} Q ${child.centerX} ${forkY} ${child.centerX} ${forkY + borderRadius} L ${child.centerX} ${child.topY}`;

          return (
            <path
              key={`parent-${index}`}
              d={dPath}
              fill="none"
              stroke="#999"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        }
        return null;
      })}
    </svg>
  );
};

export default ConnectionsLayer;
