import { useState, useRef, useLayoutEffect } from "react";
import FamilyMemberCard from "./components/FamilyMemberCard";
import data from "./data/familyMembers.json";
import "./App.css";

function App() {
  // --- 1. ÁLLAPOTOK ÉS REFERENCIÁK ---
  const [zoom, setZoom] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [positions, setPositions] = useState({});

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const memberRefs = useRef({});

  const { members, relationships } = data;

  // --- ÚJ: LÁGY ZOOM KEZELŐ FÜGGVÉNY ---
  // Ez biztosítja, hogy a gombbal való zoomolás is bekapcsolja a smooth-move-ot
  const handleZoomChange = (newZoom) => {
    setIsAnimating(true);
    setZoom(newZoom);
    setTimeout(() => setIsAnimating(false), 500);
  };

  useLayoutEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const focusOnMember = (id) => {
    const pos = positions[id];
    if (!pos) return;

    const viewportMidX = window.innerWidth / 2;
    const viewportMidY = window.innerHeight / 2;

    setIsAnimating(true);
    setOffsetX(viewportMidX - pos.centerX * zoom);
    setOffsetY(viewportMidY - pos.centerY * zoom);

    setTimeout(() => setIsAnimating(false), 500);
  };

  const groupedMembers = members.reduce((acc, member) => {
    const gen = member.generation || 1;
    if (!acc[gen]) acc[gen] = [];
    acc[gen].push(member);
    return acc;
  }, {});

  const sortedGenerations = Object.keys(groupedMembers)
    .sort((a, b) => a - b)
    .map((gen) => groupedMembers[gen]);

  // --- 3. KOORDINÁTÁK KISZÁMÍTÁSA (MODOSÍTVA A LÁGY MOZGÁSHOZ) ---
  useLayoutEffect(() => {
    const measure = () => {
      const newPositions = {};
      members.forEach((member) => {
        const el = memberRefs.current[member.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          const treeEl = el.closest(".family-tree");
          const parentRect = treeEl.getBoundingClientRect();

          newPositions[member.id] = {
            centerX: (rect.left - parentRect.left + rect.width / 2) / zoom,
            centerY: (rect.top - parentRect.top + rect.height / 2) / zoom,
            right: (rect.right - parentRect.left) / zoom,
            left: (rect.left - parentRect.left) / zoom,
            topY: (rect.top - parentRect.top) / zoom,
          };
        }
      });
      setPositions(newPositions);
    };

    // ÚJ: Ha animáció van, várunk a méréssel, hogy a vonalak ne "ugráljanak" közben
    if (isAnimating) {
      const timer = setTimeout(measure, 500);
      return () => clearTimeout(timer);
    } else {
      measure();
    }
  }, [members, zoom, isAnimating]); // isAnimating hozzáadva függőségnek

  return (
    <>
      <div
        className="zoom-controls"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        {/* MÓDOSÍTVA: handleZoomChange-et használunk a sima setZoom helyett */}
        <button onClick={() => handleZoomChange(Math.max(zoom - 0.2, 0.2))}>
          -
        </button>
        <span style={{ margin: "0 10px", fontFamily: "sans-serif" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => handleZoomChange(Math.min(zoom + 0.2, 2))}>
          +
        </button>
        <button
          onClick={() => {
            setIsAnimating(true); // Resetnél is legyen lágy mozgás
            setZoom(1);
            setOffsetX(0);
            setOffsetY(0);
            setTimeout(() => setIsAnimating(false), 500);
          }}
          style={{ marginLeft: "10px" }}
        >
          Reset
        </button>
      </div>

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
          className={`family-tree ${isAnimating ? "smooth-move" : ""}`}
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transition: isAnimating ? "transform 0.5s ease-out" : "none",
          }}
        >
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

              if (
                rel.type === "parent" &&
                positions[rel.parent1id] &&
                positions[rel.parent2id] &&
                positions[rel.to]
              ) {
                const p1 = positions[rel.parent1id];
                const p2 = positions[rel.parent2id];
                const child = positions[rel.to];

                const startX = (p1.right + p2.left) / 2;
                const startY = p1.centerY;
                const forkY = startY + (child.topY - startY) / 2;

                const borderRadius = 30;
                const diffX = child.centerX - startX;
                const direction = diffX > 0 ? 1 : -1;

                const isStraight = Math.abs(diffX) < 20;

                const dPath = isStraight
                  ? `M ${startX} ${startY} L ${startX} ${child.topY}`
                  : `M ${startX} ${startY}
                       L ${startX} ${forkY - borderRadius}
                       Q ${startX} ${forkY} ${startX + borderRadius * direction} ${forkY}
                       L ${child.centerX - borderRadius * direction} ${forkY}
                       Q ${child.centerX} ${forkY} ${child.centerX} ${forkY + borderRadius}
                       L ${child.centerX} ${child.topY}`;

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

          {sortedGenerations.map((genMembers, gIdx) => (
            <div key={`gen-${gIdx}`} className="generation-row">
              {genMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => focusOnMember(member.id)}
                  style={{ cursor: "pointer" }}
                >
                  <FamilyMemberCard
                    key={member.id}
                    ref={(el) => (memberRefs.current[member.id] = el)}
                    {...member}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
