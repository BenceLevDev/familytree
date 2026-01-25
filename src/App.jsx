import { useState, useRef, useLayoutEffect } from "react";
import FamilyMemberCard from "./components/FamilyMemberCard";
import data from "./data/familyMembers.json";
import "./App.css";

function App() {
  // --- 1. ÁLLAPOTOK ÉS REFERENCIÁK ---
  // isGrabbing: azt figyeli, hogy le van-e nyomva az egérgomb a húzáshoz (panning)
  const [isGrabbing, setIsGrabbing] = useState(false);
  // offsetX/Y: a családfa aktuális eltolása a képernyőn belül
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  // positions: ide mentjük el minden kártya pontos koordinátáját (X, Y) a vonalrajzoláshoz
  const [positions, setPositions] = useState({});

  // Referenciák az egérmozgás számításához és a DOM elemek eléréséhez
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  // memberRefs: egy objektum, amiben eltároljuk az összes kártya valódi DOM referenciáját (ID alapján)
  const memberRefs = useRef({});

  const { members, relationships } = data;

  // --- 2. ADATOK ELŐKÉSZÍTÉSE (GENERÁCIÓK) ---
  // A 'reduce' segítségével csoportosítjuk a tagokat a JSON-ben megadott 'generation' mezőjük alapján.
  // Ez hozza létre a vízszintes "sorokat" (szülők, gyerekek, unokák).
  const groupedMembers = members.reduce((acc, member) => {
    const gen = member.generation || 1;
    if (!acc[gen]) acc[gen] = [];
    acc[gen].push(member);
    return acc;
  }, {});

  // A generációk kulcsait (1, 2, 3...) sorba rendezzük, hogy a fa fentről lefelé épüljön fel.
  const sortedGenerations = Object.keys(groupedMembers)
    .sort((a, b) => a - b)
    .map((gen) => groupedMembers[gen]);

  // --- 3. KOORDINÁTÁK KISZÁMÍTÁSA (useLayoutEffect) ---
  // A useLayoutEffect akkor fut le, amikor a React már létrehozta a DOM-ot, de a böngésző még nem rajzolta ki.
  // Ezért tökéletes mérésre (getBoundingClientRect), mert így nem látunk "ugrálást".
  useLayoutEffect(() => {
    const newPositions = {};
    members.forEach((member) => {
      const el = memberRefs.current[member.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        // Keressük meg a közös szülőt (.family-tree), hogy hozzá képest számoljunk relatív pozíciót.
        // Így ha eltoljuk a fát (panning), a vonalak a kártyákkal együtt maradnak.
        const treeEl = el.closest(".family-tree");
        const parentRect = treeEl.getBoundingClientRect();

        newPositions[member.id] = {
          centerX: rect.left - parentRect.left + rect.width / 2, // Kártya közepe X
          centerY: rect.top - parentRect.top + rect.height / 2, // Kártya közepe Y
          right: rect.right - parentRect.left, // Kártya jobb széle
          left: rect.left - parentRect.left, // Kártya bal széle
          topY: rect.top - parentRect.top, // Kártya teteje (gyerekeknél ide fut a vonal)
        };
      }
    });

    // setTimeout 0: Kikerülünk a React szinkron renderelési ciklusából, elkerülve a hibát.
    setTimeout(() => {
      setPositions(newPositions);
    }, 0);
  }, [members]); // Csak akkor mérünk újra, ha a tagok listája változik

  return (
    <div
      className={`viewport ${isGrabbing ? "grabbing" : ""}`}
      // --- 4. PANNING (HÚZÁS) LOGIKA ---
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
        // A transform: translate mozgatja fizikailag a fát a képernyőn
        style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
      >
        {/* --- 5. ÖSSZEKÖTŐ VONALAK (SVG) --- */}
        <svg className="connections-layer">
          {relationships.map((rel, index) => {
            // HÁZASTÁRSI VONAL: Egyszerű egyenes a két kártya között
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

            // SZÜLŐ-GYEREK VONAL: Komplett hajlított útvonal (Path)
            if (
              rel.type === "parent" &&
              positions[rel.parent1id] &&
              positions[rel.parent2id] &&
              positions[rel.to]
            ) {
              const p1 = positions[rel.parent1id];
              const p2 = positions[rel.parent2id];
              const child = positions[rel.to];

              // Kezdőpont: a két szülő (házastársak) közötti vonal közepe
              const startX = (p1.right + p2.left) / 2;
              const startY = p1.centerY;
              // forkY: a generációk közötti magasság, ahol a vonal vízszintesen "kanyarodik"
              const forkY = startY + (child.topY - startY) / 2;

              const borderRadius = 30; // Az ív sugara
              const diffX = child.centerX - startX;
              const direction = diffX > 0 ? 1 : -1;

              const isStraight = Math.abs(diffX) < 20;

              // dPath: SVG rajzolási parancsok. M=Move, L=Line, Q=Quadratic Curve (hajlítás)
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

        {/* --- 6. KÁRTYÁK KIRAJZOLÁSA (GENERÁCIÓKKAL) --- */}
        {sortedGenerations.map((genMembers, gIdx) => (
          <div key={`gen-${gIdx}`} className="generation-row">
            {genMembers.map((member) => (
              <FamilyMemberCard
                key={member.id}
                // Ref mentése, hogy a fenti mérés elérje a kártya DOM elemét
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
