import { useState, useRef, useLayoutEffect } from "react";
import FamilyMemberCard from "./components/FamilyMemberCard";
import data from "./data/familyMembers.json";
import "./App.css";

function App() {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const memberRefs = useRef({});

  const [positions, setPositions] = useState({});

  const { members, relationships } = data;

  // Frissíti a cardok pozícióját render után + mozgatáskor

  useLayoutEffect(() => {
    const newPositions = {};
    members.forEach((member) => {
      const el = memberRefs.current[member.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        const parentRect = el.parentElement.getBoundingClientRect();

        // Itt a trükk: ki kell vonni az aktuális eltolást (offsetX/Y),
        // hogy az alap (0,0) pozíciókat kapjuk meg a szülőben
        newPositions[member.id] = {
          centerX: rect.left - parentRect.left + rect.width / 2,
          centerY: rect.top - parentRect.top + rect.height / 2,
          right: rect.right - parentRect.left,
          left: rect.left - parentRect.left,
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
        {/* SVG réteg a vonalaknak */}
        <svg className="connections-layer">
          {relationships.map((rel, index) => {
            if (
              rel.type === "spouse" &&
              positions[rel.from] &&
              positions[rel.to]
            ) {
              const fromPos = positions[rel.from];
              const toPos = positions[rel.to];
              return (
                <line
                  key={`rel-${index}`}
                  x1={fromPos.right}
                  y1={fromPos.centerY}
                  x2={toPos.left}
                  y2={toPos.centerY}
                  stroke="#666"
                  strokeWidth="2"
                />
              );
            }
            return null;
          })}
        </svg>
        {members.map((member) => (
          <FamilyMemberCard
            key={member.id}
            ref={(el) => (memberRefs.current[member.id] = el)}
            last_name={member.last_name}
            first_name={member.first_name}
            gender={member.gender}
            image={member.image}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
