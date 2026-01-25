import { useState, useRef, useLayoutEffect } from "react";
import FamilyMemberCard from "./components/FamilyMemberCard";
import data from "./data/familyMembers.json";
import "./App.css";

function App() {
  const distanceBGen = 100;

  const [isGrabbing, setIsGrabbing] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const memberRefs = useRef({});

  const [positions, setPositions] = useState({});

  const { members, relationships } = data;

  const groupedMembers = members.reduce((acc, member) => {
    const gen = member.generation || 1;
    if (!acc[gen]) acc[gen] = [];
    acc[gen].push(member);
    return acc;
  }, {});

  const sortedGenerations = Object.keys(groupedMembers)
    .sort((a, b) => a - b)
    .map((gen) => groupedMembers[gen]);

  useLayoutEffect(() => {
    const newPositions = {};
    members.forEach((member) => {
      const el = memberRefs.current[member.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        // MÓDOSÍTÁS: A parentRect mostantól a family-tree abszolút pozíciója
        const treeEl = el.closest(".family-tree");
        const parentRect = treeEl.getBoundingClientRect();

        newPositions[member.id] = {
          centerX: rect.left - parentRect.left + rect.width / 2,
          centerY: rect.top - parentRect.top + rect.height / 2,
          right: rect.right - parentRect.left,
          left: rect.left - parentRect.left,
          // ÚJ: Kell a teteje is a gyerekeknek a csatlakozáshoz
          topY: rect.top - parentRect.top,
        };
      }
    });
    setTimeout(() => {
      setPositions(newPositions);
    }, 0);
  }, [members]);

  return (
    <div
      className={`viewport ${isGrabbing ? "grabbing" : ""}`}
      onMouseDown={(e) => {
        setIsGrabbing(true);
        startXRef.current = e.clientX;
        startYRef.current = e.clientY;
      }}
      onMouseMove={(e) => {
        if (!isGrabbing) return;
        const deltaX = e.clientX - startXRef.current;
        const deltaY = e.clientY - startYRef.current;
        setOffsetX((prev) => prev + deltaX);
        setOffsetY((prev) => prev + deltaY);
        startXRef.current = e.clientX;
        startYRef.current = e.clientY;
      }}
      onMouseUp={() => setIsGrabbing(false)}
      onMouseLeave={() => setIsGrabbing(false)}
    >
      <div
        className="family-tree"
        style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
      >
        <svg className="connections-layer">
          {relationships.map((rel, index) => {
            // HÁZASTÁRSI VONAL (Vízszintes)
            if (
              rel.type === "spouse" &&
              positions[rel.from] &&
              positions[rel.to]
            ) {
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

            // SZÜLŐ-GYEREK VONAL (T-elágazás a szülők közepéből)
            if (
              rel.type === "parent" &&
              positions[rel.parent1id] &&
              positions[rel.parent2id] &&
              positions[rel.to]
            ) {
              const p1 = positions[rel.parent1id];
              const p2 = positions[rel.parent2id];
              const child = positions[rel.to];

              // A két szülő közötti vonal pontos közepe
              const startX = (p1.right + p2.left) / 2;
              const startY = p1.centerY;
              const forkY = startY + distanceBGen; // A töréspont mélysége a szülők alatt

              return (
                <path
                  key={`parent-${index}`}
                  d={`M ${startX} ${startY} 
                      L ${startX} ${forkY} 
                      L ${child.centerX} ${forkY} 
                      L ${child.centerX} ${child.topY}`}
                  fill="none"
                  stroke="#999"
                  strokeWidth="2"
                />
              );
            }
            return null;
          })}
        </svg>

        {/* MÓDOSÍTÁS: A sima members.map helyett a generációkon megyünk végig */}
        {sortedGenerations.map((genMembers, gIdx) => (
          <div key={`gen-${gIdx}`} className="generation-row">
            {genMembers.map((member) => (
              <FamilyMemberCard
                key={member.id}
                ref={(el) => (memberRefs.current[member.id] = el)}
                {...member}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
