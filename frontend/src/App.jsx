import { useState, useRef, useLayoutEffect, useMemo, useEffect } from "react";
import ZoomControls from "./components/ZoomControls";
import FamilyTreeCanvas from "./components/FamilyTreeCanvas";
import InformationSidebar from "./components/InformationSidebar";
import RegistrationForm from "./components/RegistrationForm";
import Login from "./components/Login";
import "./App.css";

function App() {
  // --- 0. KONSTANSOK ---
  const ANIMATION_DURATION = 1000; // ms
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 1.4;

  // --- ÚJ: AUTHENTIKÁCIÓS ÁLLAPOTOK ---
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem("isAdmin") === "true",
  );

  // --- 1. ÁLLAPOTOK (STATE) ÉS REFERENCIÁK (REF) ---
  const initialZoom = window.innerWidth < 845 ? 0.2 : 0.4;
  const [members, setMembers] = useState([]); // Kezdetben üres lista
  const [relationships, setRelationships] = useState([]); // Kezdetben üres lista
  const [zoom, setZoom] = useState(initialZoom);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [positions, setPositions] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);

  const [activeRegistrationForm, setActiveRegistrationForm] = useState(false);

  // ÚJ: Felhasználó regisztrációhoz tartozó állapotok
  const [activeUserRegistration, setActiveUserRegistration] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [userRegMessage, setUserRegMessage] = useState("");

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const memberRefs = useRef({});
  const animationTimeoutRef = useRef(null);

  // --- ÚJ: LOGIN ÉS LOGOUT LOGIKA ---
  const handleLoginSuccess = (newToken, adminStatus) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("isAdmin", adminStatus);
    setToken(newToken);
    setIsAdmin(adminStatus);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    setToken(null);
    setIsAdmin(false);
    setMembers([]);
    setRelationships([]);
    setSelectedMember(null);
  };

  const handleUserRegistration = async (e) => {
    e.preventDefault();
    setUserRegMessage("");
    try {
      const res = await fetch(
        "https://familytree-backend-9ua6.onrender.com/api/users/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // A token hitelesíti, hogy admin vagy
          },
          body: JSON.stringify({
            username: newUsername,
            password: newPassword,
            is_admin: newIsAdmin ? 1 : 0,
          }),
        },
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Hiba történt a regisztráció során.");
      }
      setUserRegMessage("Sikeresen létrehozva!");
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      // 2 másodperc múlva automatikusan becsukja a formot
      setTimeout(() => {
        setActiveUserRegistration(false);
        setUserRegMessage("");
      }, 2000);
    } catch (err) {
      setUserRegMessage(err.message);
    }
  };

  // --- 2. ADATOK BETÖLTÉSE A BACKENDRŐL ---
  useEffect(() => {
    if (!token) return;

    fetch("https://familytree-backend-9ua6.onrender.com/api/data", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          handleLogout();
          throw new Error("Lejárt a bejelentkezés");
        }
        return res.json();
      })
      .then((data) => {
        setMembers(data.members);
        setRelationships(data.relationships);
      })
      .catch((err) => console.error("Hiba a fa betöltésekor:", err));
  }, [token]);

  // --- 3. SEGÉDFÜGGVÉNYEK ÉS LOGIKA ---

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

  const centerTree = () => {
    const treeEl = document.querySelector(".family-tree");
    if (!treeEl) return;

    const treeWidth = treeEl.offsetWidth;
    const treeHeight = treeEl.offsetHeight;

    setOffsetX(window.innerWidth / 2 - (treeWidth / 2) * zoom);
    setOffsetY(window.innerHeight / 2 - (treeHeight / 2) * zoom);

    requestAnimationFrame(() => {
      triggerAnimation();
    });
  };

  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
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
    const targetZoom = window.innerWidth < 845 ? 0.2 : 0.4;
    setZoom(targetZoom);

    const treeEl = document.querySelector(".family-tree");
    if (treeEl) {
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
      setTimeout(() => {
        centerTree();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [zoom]);

  useLayoutEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) e.preventDefault();
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useLayoutEffect(() => {
    if (
      token &&
      Object.keys(positions).length > 0 &&
      offsetX === 0 &&
      offsetY === 0
    ) {
      const timer = setTimeout(() => {
        centerTree();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [positions, offsetX, offsetY, token]);

  const focusOnMember = (id) => {
    const pos = positions[id];
    if (!pos) return;

    fetch(`https://familytree-backend-9ua6.onrender.com/api/member/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          handleLogout();
          throw new Error("Lejárt a bejelentkezés");
        }
        return res.json();
      })
      .then((data) => {
        setSelectedMember(data);
      })
      .catch((err) => console.error("Hiba a részletek lekérésekor:", err));

    const member = members.find((m) => m.id == id);
    setSelectedMember(member);

    const targetX = window.innerWidth / 2 - pos.centerX * zoom;
    const targetY = window.innerHeight / 2 - pos.centerY * zoom;

    setOffsetX(targetX);
    setOffsetY(targetY);
    triggerAnimation();
  };

  const sortedGenerations = useMemo(() => {
    const spouseMap = {};
    if (relationships) {
      relationships.forEach((rel) => {
        if (rel.type === "spouse") {
          spouseMap[rel.from] = rel.to;
          spouseMap[rel.to] = rel.from;
        }
      });
    }
    const groupedMembers = members.reduce((acc, member) => {
      const gen = member.generation || 1;
      if (!acc[gen]) acc[gen] = [];
      acc[gen].push({
        ...member,
        spouseId: spouseMap[member.id] || null,
      });
      return acc;
    }, {});

    return Object.keys(groupedMembers)
      .sort((a, b) => b - a)
      .map((gen) => groupedMembers[gen]);
  }, [members, relationships]);

  // --- 4. KOORDINÁTÁK MÉRÉSE ÉS SZINKRONIZÁLÁSA ---

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

  // --- 5. POINTER EVENT KEZELŐ MOZGÁSHOZ ÉS MEGÁLLÁSHOZ ---
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

  // --- HA NINCS TOKEN, A LOGIN KÉPERNYŐT MUTATJUK ---
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <InformationSidebar
        selectedMember={selectedMember}
        allMembers={members} // <--- EZ HIÁNYZOTT MÚLTKOR!
        relationships={relationships} // <--- EZ IS HIÁNYZOTT!
        onMemberClick={focusOnMember}
        isAdmin={isAdmin} // A jogosultság átadása
        token={token} // A token átadása
      />
      <div className="menu">
        <ZoomControls
          zoom={zoom}
          onZoomIn={() => handleZoomChange(zoom + 0.2)}
          onZoomOut={() => handleZoomChange(zoom - 0.2)}
          onReset={handleReset}
        />

        <button onClick={handleLogout} className="family-tree-button">
          Kijelentkezés
        </button>
        <div className="hr"></div>
        {isAdmin && (
          <div className="user-member-registration">
            {/* MEGLÉVŐ: Családtag regisztráció */}
            <div
              className="registration-form-container"
              style={{ position: "static" }}
            >
              {!activeRegistrationForm ? (
                <button
                  onClick={() => setActiveRegistrationForm(true)}
                  className="family-tree-button"
                >
                  Új családtag regisztrációja
                </button>
              ) : (
                <RegistrationForm
                  onClose={() => setActiveRegistrationForm(false)}
                  token={token}
                />
              )}
            </div>
            <div className="hr"></div>
            {/* ÚJ: Felhasználói fiók regisztráció */}
            <div className="user-registration-container">
              {!activeUserRegistration ? (
                <button
                  onClick={() => setActiveUserRegistration(true)}
                  className="family-tree-button"
                  style={{ width: "100%" }}
                >
                  Új felhasználó (fiók) létrehozása
                </button>
              ) : (
                <form
                  onSubmit={handleUserRegistration}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <h4
                    style={{
                      margin: "0",
                      textAlign: "center",
                      color: "#333",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Új Fiók
                  </h4>
                  <input
                    type="text"
                    placeholder="Felhasználónév"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    className="creation-input-field"
                  />
                  <input
                    type="password"
                    placeholder="Jelszó"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="creation-input-field"
                  />
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "14px",
                      color: "#333",
                      cursor: "pointer",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newIsAdmin}
                      onChange={(e) => setNewIsAdmin(e.target.checked)}
                    />
                    Admin jogosultság
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button type="submit" className="family-tree-button">
                      Mentés
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveUserRegistration(false)}
                      className="family-tree-button"
                    >
                      Mégse
                    </button>
                  </div>
                  {userRegMessage && (
                    <div
                      style={{
                        fontSize: "14px",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: userRegMessage.includes("Sikeresen")
                          ? "green"
                          : "red",
                      }}
                    >
                      {userRegMessage}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>

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
