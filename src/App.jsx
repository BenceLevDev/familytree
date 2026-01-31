import { useState, useRef, useLayoutEffect, useMemo } from "react";
import data from "./data/familyMembers.json";
import ZoomControls from "./components/ZoomControls";
import FamilyTreeCanvas from "./components/FamilyTreeCanvas";
import InformationSidebar from "./components/InformationSidebar";
import "./App.css";

function App() {
  // --- 0. KONSTANSOK ---
  const ANIMATION_DURATION = 500; // ms
  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 1.2;

  // --- 1. ÁLLAPOTOK (STATE) ÉS REFERENCIÁK (REF) ---
  const [zoom, setZoom] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [positions, setPositions] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const memberRefs = useRef({});
  const animationTimeoutRef = useRef(null);

  const { members, relationships } = data;

  // --- 2. SEGÉDFÜGGVÉNYEK ÉS LOGIKA ---

  /**
   * Finom zoom kezelő, amely bekapcsolja az animációt a vizuális folytonosságért.
   */
  const triggerAnimation = () => {
    setIsAnimating(true);
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, ANIMATION_DURATION);
  };

  const handleZoomChange = (newZoom) => {
    // 3. itt megkapja az uj zoomot
    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM); // 4. leellenőrzi, hogy az új zoom érték a megfelelő határok között van e
    setZoom(clampedZoom); // 6. beállítja az új zoomot és átadja a zoom value-nak
    triggerAnimation();
  };

  const handleReset = () => {
    //kezeli a zoom resetet
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    triggerAnimation();
  };

  /**
   * Tiltja az alapértelmezett böngésző-zoomot (Ctrl + görgő).
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
   */
  const focusOnMember = (id) => {
    const pos = positions[id];
    if (!pos) return;

    const member = members.find((m) => m.id == id);
    setSelectedMember(member);

    // A cél: a kártya közepe legyen a képernyő közepén
    // Képernyő közepe - (Kártya helye a fán * aktuális nagyítás)
    const targetX = window.innerWidth / 2 - pos.centerX * zoom;
    const targetY = window.innerHeight / 2 - pos.centerY * zoom;

    setOffsetX(targetX);
    setOffsetY(targetY);
    triggerAnimation();
  };

  /**
   * Adat-előkészítés: Generációk szerint csoportosítja és rendezi a tagokat.
   */
  const sortedGenerations = useMemo(() => {
    const groupedMembers = members.reduce((acc, member) => {
      const gen = member.generation || 1;
      if (!acc[gen]) acc[gen] = [];
      acc[gen].push(member);
      return acc;
    }, {});

    return Object.keys(groupedMembers)
      .sort((a, b) => a - b)
      .map((gen) => groupedMembers[gen]);
  }, [members]);

  // --- 3. KOORDINÁTÁK MÉRÉSE ÉS SZINKRONIZÁLÁSA ---

  /**
   * Leméri a családtag kártyák pozícióját a DOM-ban az összekötő vonalak rajzolásához.
   */
  useLayoutEffect(() => {
    const measure = () => {
      const newPositions = {};
      members.forEach((member) => {
        const el = memberRefs.current[member.id];
        // A .family-tree-t keressük, de fontos, hogy a méréshez
        // az eltolástól (offset) és zoomtól mentes alapot nézzük
        if (el) {
          // offsetLeft/Top használata megbízhatóbb, mert ezek
          // a szülőhöz képesti fix távolságok, nem érinti őket a CSS transform scale
          const rect = {
            width: el.offsetWidth,
            height: el.offsetHeight,
            left: el.offsetLeft,
            top: el.offsetTop,
          };

          // Mivel a .generation-row és a .family-tree flexbox/gap alapú,
          // az offsetLeft a közvetlen szülőhöz (.generation-row) képest értendő.
          // Ahhoz, hogy a teljes fához képest kapjunk koordinátát:
          let parent = el.offsetParent;
          let totalLeft = el.offsetLeft;
          let totalTop = el.offsetTop;

          while (parent && !parent.classList.contains("family-tree")) {
            totalLeft += parent.offsetLeft;
            totalTop += parent.offsetTop;
            parent = parent.offsetParent;
          }

          newPositions[member.id] = {
            centerX: totalLeft + rect.width / 2,
            centerY: totalTop + rect.height / 2,
            right: totalLeft + rect.width,
            left: totalLeft,
            topY: totalTop,
          };
        }
      });
      setPositions(newPositions);
    };

    // Animáció esetén a mérést az animáció végére időzítjük.
    if (isAnimating) {
      const timer = setTimeout(measure, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    } else {
      measure();
    }
  }, [members, zoom, isAnimating]);

  // --- 4. POINTER EVENT HANDLERS for PANNING ---
  const handlePointerDown = (e) => {
    // Ha kártyára kattintunk, ne kezdjük el a mozgatást, hogy a klikk esemény átmenjen
    if (e.target.closest(".family-member-card")) {
      return;
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsGrabbing(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!isGrabbing) return;
    e.preventDefault();
    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;
    setOffsetX((prev) => prev + deltaX);
    setOffsetY((prev) => prev + deltaY);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsGrabbing(false);
  };

  const handlePointerCancel = (e) => {
    e.preventDefault();
    setIsGrabbing(false);
  };

  return (
    <>
      <InformationSidebar selectedMember={selectedMember} />

      <ZoomControls // 2. Itt aktiválódik a korábban benyomott gomb.
        zoom={zoom} // zoom értéket mekapja, by default 1
        onZoomIn={() => handleZoomChange(zoom + 0.2)} // ha onZoomIn lett benyomva, akkor a zoom(default 1) + 0.2 értéket kapja a handleZoomChange
        onZoomOut={() => handleZoomChange(zoom - 0.2)} // ha onZoomOut lett benyomva, akkor a zoom(default 1) - 0.2 értéket kapja a handleZoomChange
        onReset={handleReset}
      />

      <div
        className={`viewport ${isGrabbing ? "grabbing" : ""}`}
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: "100%",
            height: "100%",
            transition: isGrabbing
              ? "none"
              : `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0, 0.2, 1)`,
          }}
        >
          <FamilyTreeCanvas
            isAnimating={isAnimating}
            relationships={relationships}
            positions={positions}
            sortedGenerations={sortedGenerations}
            onMemberClick={focusOnMember}
            memberRefs={memberRefs}
          />
        </div>
      </div>
    </>
  );
}

export default App;
