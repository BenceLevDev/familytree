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
  const initialZoom = window.innerWidth < 845 ? 0.2 : 1;
  const [zoom, setZoom] = useState(initialZoom);
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

  /**
   * A teljes családfát a képernyő közepére igazítja.
   */
  const centerTree = () => {
    const treeEl = document.querySelector(".family-tree");
    if (!treeEl) return;

    const treeWidth = treeEl.offsetWidth;
    const treeHeight = treeEl.offsetHeight;

    // Itt közvetlenül állítjuk be az új értékeket
    setOffsetX(window.innerWidth / 2 - (treeWidth / 2) * zoom);
    setOffsetY(window.innerHeight / 2 - (treeHeight / 2) * zoom);

    // Az animációt csak egy hajszállal később indítjuk
    requestAnimationFrame(() => {
      triggerAnimation();
    });
  };

  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);

    // Zoom a képernyő középpontjához viszonyítva
    const zoomFactor = clampedZoom / zoom;

    setOffsetX(
      (prevX) =>
        window.innerWidth / 2 - (window.innerWidth / 2 - prevX) * zoomFactor,
    );
    setOffsetY(
      (prevY) =>
        window.innerHeight / 2 - (window.innerHeight / 2 - prevY) * zoomFactor,
    );

    setZoom(clampedZoom);
    triggerAnimation();
  };

  const handleReset = () => {
    // Itt is eldöntjük, mi legyen a cél-zoom a kijelző alapján
    const targetZoom = window.innerWidth < 845 ? 0.2 : 1;
    setZoom(targetZoom);

    const treeEl = document.querySelector(".family-tree");
    if (treeEl) {
      // Fontos: a targetZoom-mal számolunk az offsetX/Y-nál is!
      setOffsetX(window.innerWidth / 2 - (treeEl.offsetWidth / 2) * targetZoom);
      setOffsetY(
        window.innerHeight / 2 - (treeEl.offsetHeight / 2) * targetZoom,
      );
    }

    setSelectedMember(null);
    triggerAnimation();
  };
  useLayoutEffect(() => {
    const handleResize = () => {
      // Kis késleltetés kell, hogy a böngésző biztosan végezzen az elforgatással
      setTimeout(() => {
        centerTree();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    // orientationchange esemény is biztos ami biztos
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [zoom]); // Ha változik a zoom, az elforgatáskor is az aktuális zoommal számoljon

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
   * Automatikus középre igazítás az első betöltéskor, amint megvannak a pozíciók.
   */
  useLayoutEffect(() => {
    if (Object.keys(positions).length > 0 && offsetX === 0 && offsetY === 0) {
      const timer = setTimeout(() => {
        centerTree();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [positions, offsetX, offsetY]);

  /**
   * Egy adott családtagot a képernyő közepére igazít.
   */
  const focusOnMember = (id) => {
    const pos = positions[id];
    if (!pos) return;

    const member = members.find((m) => m.id == id);
    setSelectedMember(member);

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

  useLayoutEffect(() => {
    const measure = () => {
      const newPositions = {};
      members.forEach((member) => {
        const el = memberRefs.current[member.id];
        if (el) {
          const rect = {
            width: el.offsetWidth,
            height: el.offsetHeight,
          };

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

    if (isAnimating) {
      const timer = setTimeout(measure, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    } else {
      measure();
    }
  }, [members, zoom, isAnimating]);

  // --- 4. POINTER EVENT HANDLERS for PANNING ---
  const handlePointerDown = (e) => {
    if (e.target.closest(".family-member-card")) return;

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

      <ZoomControls
        zoom={zoom}
        onZoomIn={() => handleZoomChange(zoom + 0.2)}
        onZoomOut={() => handleZoomChange(zoom - 0.2)}
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
