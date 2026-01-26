import { useState, useRef, useLayoutEffect } from "react";
import FamilyMemberCard from "./components/FamilyMemberCard";
import data from "./data/familyMembers.json";
import "./App.css";

function App() {
  // --- 1. ÁLLAPOTOK (STATE) ÉS REFERENCIÁK (REF) ---

  // A zoom mértéke (1 = 100%). Ezzel skálázzuk a teljes családfát.
  const [zoom, setZoom] = useState(1);

  // Jelzi, ha épp automatikus mozgás (fókusz vagy zoom gomb) van folyamatban.
  // Arra használjuk, hogy ilyenkor bekapcsoljuk a CSS animációt (smooth-move).
  const [isAnimating, setIsAnimating] = useState(false);

  // Azt figyeli, hogy az egér épp le van-e nyomva a fa "húzásához" (panning).
  const [isGrabbing, setIsGrabbing] = useState(false);

  // A fa vízszintes (X) és függőleges (Y) eltolása a képernyőn pixelben.
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Ebben az objektumban tároljuk a kártyák koordinátáit (pl. centerX, topY).
  // Ezt az SVG vonalak rajzolásához használjuk fel.
  const [positions, setPositions] = useState({});

  // Segéd-referenciák az egér mozgatásának számításához (hol volt az egér az előző pillanatban).
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  // Ebben gyűjtjük össze a kártyák valódi HTML elemeit (DOM nodes), hogy le tudjuk mérni őket.
  const memberRefs = useRef({});

  const { members, relationships } = data;

  // --- 2. SEGÉDFÜGGVÉNYEK ÉS LOGIKA ---

  /**
   * Finom zoom kezelő.
   * Miért: Ha csak setZoom-ot hívnánk, a fa azonnal ugrana.
   * Hogyan: Bekapcsolja az animációt, átállítja a zoomot, majd 0.5mp múlva kikapcsolja az animációt.
   */
  const handleZoomChange = (newZoom) => {
    // Math.min(newZoom, 1.2) -> Nem engedi 1.2 (120%) fölé
    // Math.max(..., 0.2) -> Nem engedi 0.2 (20%) alá
    const clampedZoom = Math.min(Math.max(newZoom, 0.2), 1.2);

    setIsAnimating(true);
    setZoom(clampedZoom);
    setTimeout(() => setIsAnimating(false), 500);
  };

  /**
   * Tiltja az alapértelmezett böngésző-zoomot (Ctrl + görgő).
   * Miért: Hogy ne az egész weboldal mérete változzon, hanem csak a mi családfánk.
   */
  useLayoutEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) e.preventDefault();
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  /**
   * Egy adott családtagot a képernyő közepére igazít.
   * Hogyan: Kiszámolja a képernyő közepét, és levonja belőle a kártya (zoomolt) pozícióját.
   */
  const focusOnMember = (id) => {
    const pos = positions[id];
    if (!pos) return;

    const viewportMidX = window.innerWidth / 2;
    const viewportMidY = window.innerHeight / 2;

    setIsAnimating(true);
    // Kiszámoljuk az eltolást: képernyő_közepe - (kártya_helye * aktuális_nagyítás)
    setOffsetX(viewportMidX - pos.centerX * zoom);
    setOffsetY(viewportMidY - pos.centerY * zoom);

    setTimeout(() => setIsAnimating(false), 500);
  };

  /**
   * Adat-előkészítés: Generációk szerint csoportosítjuk a tagokat.
   * Miért: Hogy a CSS (flexbox) szépen sorokba tudja rendezni őket (szülők felül, gyerekek alul).
   */
  const groupedMembers = members.reduce((acc, member) => {
    const gen = member.generation || 1;
    if (!acc[gen]) acc[gen] = [];
    acc[gen].push(member);
    return acc;
  }, {});

  const sortedGenerations = Object.keys(groupedMembers)
    .sort((a, b) => a - b)
    .map((gen) => groupedMembers[gen]);

  // --- 3. KOORDINÁTÁK MÉRÉSE ÉS SZINKRONIZÁLÁSA ---

  /**
   * Ez a "szíve" a rendszernek. Leméri, hol vannak a kártyák a vásznon.
   * Miért: Az SVG vonalaknak pontos pixeladatok kellenek a rajzoláshoz.
   * Hogyan: A getBoundingClientRect() segítségével meghatározza a kártyák helyét a .family-tree-hez képest.
   */
  useLayoutEffect(() => {
    const measure = () => {
      const newPositions = {};
      members.forEach((member) => {
        const el = memberRefs.current[member.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          const treeEl = el.closest(".family-tree");
          const parentRect = treeEl.getBoundingClientRect();

          // KORREKCIÓ: Mivel a .family-tree skálázva (zoom) van, a mérést el kell osztani a zoommal,
          // hogy megkapjuk az "eredeti", 100%-os koordinátákat az SVG-n belüli rajzoláshoz.
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

    // Ha animáció (úszás) van, várunk 500ms-ot a méréssel, különben a vonalak lemaradnának.
    if (isAnimating) {
      const timer = setTimeout(measure, 500);
      return () => clearTimeout(timer);
    } else {
      measure();
    }
  }, [members, zoom, isAnimating]);

  return (
    <>
      {/* ZOOM ÉS RESET VEZÉRLŐK */}
      <div className="zoom-controls">
        {/* Csökkentés: 20% az alja */}
        <button onClick={() => handleZoomChange(zoom - 0.2)}> - </button>

        <span style={{ margin: "0 10px", fontFamily: "sans-serif" }}>
          {Math.round(zoom * 100)}%
        </span>

        {/* Növelés: 120% a teteje */}
        <button onClick={() => handleZoomChange(zoom + 0.2)}> + </button>

        <button
          onClick={() => {
            setIsAnimating(true);
            setZoom(1); // Reset mindig 100%
            setOffsetX(0);
            setOffsetY(0);
            setTimeout(() => setIsAnimating(false), 500);
          }}
          style={{ marginLeft: "10px" }}
        >
          Reset
        </button>
      </div>

      {/* VIEWPORT: Ez a "keret", amiben a fát látjuk. Ez kezeli a húzást (Panning). */}
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
          setOffsetX((prev) => prev + deltaX); // Mozgatjuk a fát az egér irányába
          setOffsetY((prev) => prev + deltaY);
          startXRef.current = e.clientX;
          startYRef.current = e.clientY;
        }}
        onMouseUp={() => setIsGrabbing(false)}
        onMouseLeave={() => setIsGrabbing(false)}
      >
        {/* FAMILY TREE: Ez a tényleges vászon, amit skálázunk (zoom) és eltolunk (translate). */}
        <div
          className={`family-tree ${isAnimating ? "smooth-move" : ""}`}
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
            transformOrigin: "0 0", // Fontos: a zoom a bal felső sarokból induljon, különben elcsúszik a mérés.
            transition: isAnimating ? "transform 0.5s ease-out" : "none", // Csak fókuszáláskor/zoomkor animáljon.
          }}
        >
          {/* SVG RÉTEG: Itt rajzoljuk ki az összekötő vonalakat. */}
          <svg className="connections-layer">
            {relationships.map((rel, index) => {
              // Házastársak közötti egyenes vonal
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

          {/* KÁRTYÁK RÉTEG: A generációk és kártyák tényleges kirajzolása. */}
          {sortedGenerations.map((genMembers, gIdx) => (
            <div key={`gen-${gIdx}`} className="generation-row">
              {genMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => focusOnMember(member.id)}
                  style={{ cursor: "pointer" }}
                >
                  <FamilyMemberCard
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
