import React, { useState, useEffect } from "react";
import "./InformationSidebar.css";
import sideBarIconClosed from "../assets/menu-fold-svgrepo-com.svg";
import sideBarIconOpened from "../assets/menu-unfold-svgrepo-com.svg";

function InformationSidebar({
  selectedMember,
  allMembers = [],
  relationships = [],
  onMemberClick,
  isAdmin, // Új prop
  token, // Új prop
}) {
  const [isOpen, setIsOpen] = useState(false);

  // --- ÚJ STATE-EK a SZERKESZTÉSHEZ ---
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);

  // A szerkesztett adatokat egy komplex objektumban tároljuk
  const [editData, setEditData] = useState({
    last_name: "",
    first_name: "",
    foglalkozas: "",
    lakhely: "",
    komment: "",
    father_id: "",
    mother_id: "",
    birth: { datum: "", hely: "" },
    // ÚJ: Baptism inicializálás
    baptism: {
      datum: "",
      hely: "",
      vallas: "",
      keresztelo_szemely: "",
      keresztapa: { nev: "", lakhely: "", foglalk: "" },
      keresztanya: { nev: "", lakhely: "", foglalk: "" },
    },
    death: { datum: "", hely: "", ok: "", bejelento: "" },
    marriages: [],
    sources: [],
    sort_order: "",
  });

  const toggleSidebar = () => setIsOpen(!isOpen);

  // --- Segédfüggvény: Szülő ID megkeresése neme alapján ---
  const getParentId = (memberId, gender) => {
    if (!relationships || !allMembers) return null;
    const parentRel = relationships.find(
      (r) => r.type === "parent" && r.to === memberId,
    );
    if (parentRel) {
      const parent1 = allMembers.find((m) => m.id === parentRel.parent1id);
      const parent2 = allMembers.find((m) => m.id === parentRel.parent2id);
      if (parent1 && parent1.gender === gender) return parent1.id;
      if (parent2 && parent2.gender === gender) return parent2.id;
    }
    return null;
  };

  // --- Segédfüggvény: Név alapján ID keresése ---
  const findIdByName = (name) => {
    if (!name || !allMembers) return "";
    const found = allMembers.find(
      (m) => `${m.last_name} ${m.first_name}` === name.trim(),
    );
    return found ? found.id : "";
  };

  // --- 1. ADATOK BETÖLTÉSE SZERKESZTÉSHEZ ---
  useEffect(() => {
    setIsEditing(false);
    if (selectedMember) {
      const m = selectedMember;

      const currentFatherId = getParentId(m.id, "male");
      const currentMotherId = getParentId(m.id, "female");

      const emptyMarriageTemplate = {
        hazastars: "",
        spouse_id: "",
        datum: "",
        hely: "",
        tanu1: { nev: "", lakhely: "", foglalk: "" },
        tanu2: { nev: "", lakhely: "", foglalk: "" },
      };

      setEditData({
        last_name: m.last_name || "",
        first_name: m.first_name || "",
        foglalkozas: m.foglalkozas || "",
        lakhely: m.lakhely || "",
        komment: m.komment || "",
        sort_order:
          m.sort_order !== undefined && m.sort_order !== null
            ? m.sort_order
            : "",

        father_id: currentFatherId || "",
        mother_id: currentMotherId || "",

        birth: {
          datum: m.birth?.datum || "",
          hely: m.birth?.hely || "",
          apa_nev: m.birth?.apa_nev || "", // <-- apa_nev
          anya_nev: m.birth?.anya_nev || "", // <-- anya_nev
        },
        baptism: {
          datum: m.baptism?.datum || "",
          hely: m.baptism?.hely || "",
          vallas: m.baptism?.vallas || "",
          keresztelo_szemely: m.baptism?.keresztelo_szemely || "",
          keresztapa: {
            nev: m.baptism?.keresztapa?.nev || "",
            lakhely: m.baptism?.keresztapa?.lakhely || "",
            foglalk: m.baptism?.keresztapa?.foglalk || "",
          },
          keresztanya: {
            nev: m.baptism?.keresztanya?.nev || "",
            lakhely: m.baptism?.keresztanya?.lakhely || "",
            foglalk: m.baptism?.keresztanya?.foglalk || "",
          },
        },
        death: {
          datum: m.death?.datum || "",
          hely: m.death?.hely || "",
          ok: m.death?.ok || "",
          bejelento: m.death?.bejelento || "",
        },
        marriages:
          m.marriages && m.marriages.length > 0
            ? m.marriages.map((mar) => ({
                hazastars: mar.hazastars || "",
                spouse_id: findIdByName(mar.hazastars) || "",
                datum: mar.datum || "",
                hely: mar.hely || "",
                tanu1: {
                  nev: mar.tanu1?.nev || "",
                  lakhely: mar.tanu1?.lakhely || "",
                  foglalk: mar.tanu1?.foglalk || "",
                },
                tanu2: {
                  nev: mar.tanu2?.nev || "",
                  lakhely: mar.tanu2?.lakhely || "",
                  foglalk: mar.tanu2?.foglalk || "",
                },
              }))
            : [emptyMarriageTemplate],
        sources: m.sources
          ? m.sources.map((src) => ({
              label: src.label || "",
              url: src.url || "",
            }))
          : [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember, relationships]);

  useEffect(() => {
    // Ha nem vagyunk adminok, felesleges lekérni, mert úgysem szerkeszthet
    if (!isAdmin || !token) return;

    const fetchMembers = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/members/search-list",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableMembers(data);
        }
      } catch (error) {
        console.error("Nem sikerült betölteni a tagokat:", error);
      }
    };
    fetchMembers();
  }, [isEditing, isAdmin, token]);

  // --- 2. SZERKESZTÉS KEZELŐ FÜGGVÉNYEK ---

  const handleSimpleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (category, field, value) => {
    setEditData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  // ÚJ: Keresztszülők adatainak kezelése (mert ez mélyebben van: baptism -> keresztapa -> nev)
  const handleBaptismGodparentChange = (role, field, value) => {
    setEditData((prev) => ({
      ...prev,
      baptism: {
        ...prev.baptism,
        [role]: {
          ...prev.baptism[role],
          [field]: value,
        },
      },
    }));
  };

  const handleMarriageChange = (
    index,
    field,
    value,
    subObject = null,
    subField = null,
  ) => {
    const newMarriages = [...editData.marriages];

    if (subObject) {
      newMarriages[index][subObject] = {
        ...newMarriages[index][subObject],
        [subField]: value,
      };
    } else if (field === "spouse_id") {
      newMarriages[index]["spouse_id"] = value;
      const selectedSpouse = availableMembers.find(
        (m) => m.id.toString() === value.toString(),
      );
      if (selectedSpouse) {
        newMarriages[index]["hazastars"] = `${selectedSpouse.full_name}`;
      } else {
        newMarriages[index]["hazastars"] = "";
      }
    } else {
      newMarriages[index][field] = value;
    }
    setEditData((prev) => ({ ...prev, marriages: newMarriages }));
  };

  const handleSourceChange = (index, field, value) => {
    const newSources = [...editData.sources];
    newSources[index] = { ...newSources[index], [field]: value };
    setEditData((prev) => ({ ...prev, sources: newSources }));
  };

  const handleAddSource = () => {
    setEditData((prev) => ({
      ...prev,
      sources: [...prev.sources, { label: "", url: "" }],
    }));
  };

  const handleDeleteSource = (index) => {
    setEditData((prev) => ({
      ...prev,
      sources: prev.sources.filter((_, i) => i !== index),
    }));
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://familytree-backend-9ua6.onrender.com/api/member/${selectedMember.id}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editData),
        },
      );

      if (response.ok) {
        alert("Adatok sikeresen frissítve!");
        setIsEditing(false);
        window.location.reload();
      } else {
        const text = await response.text();
        try {
          const errJson = JSON.parse(text);
          alert("Hiba történt a mentéskor: " + (errJson.detail || text));
        } catch (e) {
          alert("Hiba történt a mentéskor: " + e);
        }
      }
    } catch (error) {
      console.error("Hiba:", error);
      alert("Hálózati hiba történt.");
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const inputStyle = {
    width: "100%",
    padding: "4px",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  if (!selectedMember) {
    return (
      <div className={`information-sidebar ${isOpen ? "open" : ""}`}>
        <button onClick={toggleSidebar} className="sidebar-toggle-button">
          <img
            className="sidebar-icon"
            src={isOpen ? sideBarIconOpened : sideBarIconClosed}
            alt="Menü"
          />
        </button>
        <div className="sidebar-content-container">
          <h2>Kérlek válassz ki egy személyt</h2>
        </div>
      </div>
    );
  }

  const m = selectedMember;
  const fatherId = getParentId(m.id, "male");
  const motherId = getParentId(m.id, "female");

  const linkStyle = {
    color: "#007bff",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "bold",
  };

  const displayMarriages = isEditing
    ? editData.marriages
    : m.marriages && m.marriages.length > 0
      ? m.marriages
      : [{}];

  const displaySources = isEditing
    ? editData.sources
    : m.sources && m.sources.length > 0
      ? m.sources
      : [];

  return (
    <>
      <button onClick={toggleSidebar} className="sidebar-toggle-button">
        <img
          className="sidebar-icon"
          src={isOpen ? sideBarIconOpened : sideBarIconClosed}
          alt="Menü"
        />
      </button>

      <div className={`information-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-content-container">
          {/* --- GOMBOK --- */}
          <div>
            {/* A Módosítás gomb csak adminnak jelenik meg */}
            {!isEditing && isAdmin && (
              <button onClick={startEditing} className="family-tree-button">
                Módosítás
              </button>
            )}
          </div>
          {isEditing && (
            <div>
              <input
                type="text"
                name="sort_order"
                value={editData.sort_order}
                onChange={handleSimpleChange}
                placeholder="Order number"
                className="modification-input-field"
              />
            </div>
          )}
          {/* --- MENTÉS GOMBOK --- */}
          {isEditing && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "10px",
                marginBottom: "20px",
              }}
            >
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                className="family-tree-button"
              >
                {isLoading ? "Mentés..." : "Mentés"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="family-tree-button"
              >
                Mégse
              </button>
            </div>
          )}
          {/* --- NÉV (FEJLÉC) --- */}
          {!isEditing ? (
            <h2>{`${m.last_name} ${m.first_name}`}</h2>
          ) : (
            <div style={{ marginBottom: "10px", display: "flex", gap: "5px" }}>
              <input
                type="text"
                name="last_name"
                value={editData.last_name}
                onChange={handleSimpleChange}
                placeholder="Vezetéknév"
                className="modification-input-field"
              />
              <input
                type="text"
                name="first_name"
                value={editData.first_name}
                onChange={handleSimpleChange}
                placeholder="Keresztnév"
                className="modification-input-field"
              />
            </div>
          )}

          {/* --- SZEMÉLYES ADATOK --- */}
          <div className="sidebar-section">
            <h3 className="section-title">Személyes adatok</h3>
            <div className="sidebar-content">
              {/* Születés */}
              <div className="sidebar-content-row">
                <p>
                  <strong>Születési dátum:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.birth?.datum || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.birth.datum}
                    onChange={(e) =>
                      handleNestedChange("birth", "datum", e.target.value)
                    }
                    placeholder="ÉÉÉÉ-HH-NN"
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Születési hely:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.birth?.hely || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.birth.hely}
                    onChange={(e) =>
                      handleNestedChange("birth", "hely", e.target.value)
                    }
                    placeholder="Város"
                    className="modification-input-field"
                  />
                )}
              </div>

              {/* --- APA SZERKESZTÉSE --- */}
              <div
                className="sidebar-content-row"
                style={{ marginTop: "10px" }}
              >
                <p>
                  <strong>Apa:</strong>
                </p>
                {!isEditing ? (
                  fatherId && onMemberClick ? (
                    <p
                      style={linkStyle}
                      onClick={() => onMemberClick(fatherId)}
                      title="Ugrás az adatlapra"
                    >
                      {m.birth?.apa || "N/A"}
                    </p>
                  ) : (
                    <p>{m.birth?.apa || "N/A"}</p>
                  )
                ) : (
                  <select
                    name="father_id"
                    value={editData.father_id}
                    onChange={handleSimpleChange}
                    className="modification-input-field"
                  >
                    <option value="">-- Válassz / Ismeretlen --</option>
                    {availableMembers
                      .filter((mem) => mem.gender === "male" && mem.id !== m.id)
                      .map((mem) => (
                        <option key={mem.id} value={mem.id}>
                          {`${mem.full_name}`} ({mem.birth_year || "?"})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* --- ANYA SZERKESZTÉSE --- */}
              <div className="sidebar-content-row">
                <p>
                  <strong>Anya:</strong>
                </p>
                {!isEditing ? (
                  motherId && onMemberClick ? (
                    <p
                      style={linkStyle}
                      onClick={() => onMemberClick(motherId)}
                      title="Ugrás az adatlapra"
                    >
                      {m.birth?.anya || "N/A"}
                    </p>
                  ) : (
                    <p>{m.birth?.anya || "N/A"}</p>
                  )
                ) : (
                  <select
                    name="mother_id"
                    value={editData.mother_id}
                    onChange={handleSimpleChange}
                    className="modification-input-field"
                  >
                    <option value="">-- Válassz / Ismeretlen --</option>
                    {availableMembers
                      .filter(
                        (mem) => mem.gender === "female" && mem.id !== m.id,
                      )
                      .map((mem) => (
                        <option key={mem.id} value={mem.id}>
                          {`${mem.full_name}`} ({mem.birth_year || "?"})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>
          </div>
          {/* --- KERESZTELÉS (ÚJ SZEKCIÓ) --- */}
          <div className="sidebar-section">
            <h3 className="section-title">Keresztelés</h3>
            <div className="sidebar-content">
              <div className="sidebar-content-row">
                <p>
                  <strong>Dátum:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.baptism?.datum || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.baptism.datum}
                    onChange={(e) =>
                      handleNestedChange("baptism", "datum", e.target.value)
                    }
                    placeholder="ÉÉÉÉ-HH-NN"
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Hely:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.baptism?.hely || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.baptism.hely}
                    onChange={(e) =>
                      handleNestedChange("baptism", "hely", e.target.value)
                    }
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Vallás:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.baptism?.vallas || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.baptism.vallas}
                    onChange={(e) =>
                      handleNestedChange("baptism", "vallas", e.target.value)
                    }
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Keresztelő személy:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.baptism?.keresztelo_szemely || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.baptism.keresztelo_szemely}
                    onChange={(e) =>
                      handleNestedChange(
                        "baptism",
                        "keresztelo_szemely",
                        e.target.value,
                      )
                    }
                    className="modification-input-field"
                  />
                )}
              </div>

              {/* Keresztapa */}
              <div className="sidebar-content-row">
                <p>
                  <strong>Keresztapa:</strong>
                </p>
                <div className="sidebar-content-row">
                  <p>Név:</p>
                  {!isEditing ? (
                    <p>{m.baptism?.keresztapa?.nev || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={editData.baptism.keresztapa.nev}
                      onChange={(e) =>
                        handleBaptismGodparentChange(
                          "keresztapa",
                          "nev",
                          e.target.value,
                        )
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>

                <div className="sidebar-content-row">
                  <p>Lakhely:</p>
                  {!isEditing ? (
                    <p>{m.baptism?.keresztapa?.lakhely || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={editData.baptism.keresztapa.lakhely}
                      onChange={(e) =>
                        handleBaptismGodparentChange(
                          "keresztapa",
                          "lakhely",
                          e.target.value,
                        )
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>
                <div className="sidebar-content-row">
                  <p>Foglalk.:</p>
                  {!isEditing ? (
                    <p>{m.baptism?.keresztapa?.foglalk || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={editData.baptism.keresztapa.foglalk}
                      onChange={(e) =>
                        handleBaptismGodparentChange(
                          "keresztapa",
                          "foglalk",
                          e.target.value,
                        )
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>
              </div>

              {/* Keresztanya */}
              <div className="sidebar-content-row">
                <p>
                  <strong>Keresztanya:</strong>
                </p>
                <div className="sidebar-content-row">
                  <p>Név:</p>
                  {!isEditing ? (
                    <p>{m.baptism?.keresztanya?.nev || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={editData.baptism.keresztanya.nev}
                      onChange={(e) =>
                        handleBaptismGodparentChange(
                          "keresztanya",
                          "nev",
                          e.target.value,
                        )
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>
                <div className="sidebar-content-row">
                  <p>Lakhely:</p>
                  {!isEditing ? (
                    <p>{m.baptism?.keresztanya?.lakhely || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={editData.baptism.keresztanya.lakhely}
                      onChange={(e) =>
                        handleBaptismGodparentChange(
                          "keresztanya",
                          "lakhely",
                          e.target.value,
                        )
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>
                <div className="sidebar-content-row">
                  <p>Foglalk.:</p>
                  {!isEditing ? (
                    <p>{m.baptism?.keresztanya?.foglalk || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={editData.baptism.keresztanya.foglalk}
                      onChange={(e) =>
                        handleBaptismGodparentChange(
                          "keresztanya",
                          "foglalk",
                          e.target.value,
                        )
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* --- ELHALÁLOZÁS --- */}
          <div className="sidebar-section">
            <h3 className="section-title">Elhalálozás</h3>
            <div className="sidebar-content">
              <div className="sidebar-content-row">
                <p>
                  <strong>Dátum:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.death?.datum || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.death.datum}
                    onChange={(e) =>
                      handleNestedChange("death", "datum", e.target.value)
                    }
                    placeholder="ÉÉÉÉ-HH-NN"
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Hely:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.death?.hely || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.death.hely}
                    onChange={(e) =>
                      handleNestedChange("death", "hely", e.target.value)
                    }
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Bejelentő:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.death?.bejelento || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.death.bejelento}
                    onChange={(e) =>
                      handleNestedChange("death", "bejelento", e.target.value)
                    }
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Ok:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.death?.ok || "N/A"}</p>
                ) : (
                  <input
                    type="text"
                    value={editData.death.ok}
                    onChange={(e) =>
                      handleNestedChange("death", "ok", e.target.value)
                    }
                    className="modification-input-field"
                  />
                )}
              </div>
            </div>
          </div>

          {/* --- Házasságok --- */}
          <div className="sidebar-section">
            <h3 className="section-title">Házasságok</h3>
            {displayMarriages.map((mar, idx) => (
              <div key={idx} className="sidebar-content">
                {/* Alapadatok */}
                <div className="sidebar-content-row">
                  <p>
                    <strong>Házastárs:</strong>
                  </p>
                  {!isEditing ? (
                    <p>{mar.hazastars || "N/A"}</p>
                  ) : (
                    <select
                      value={mar.spouse_id || ""}
                      onChange={(e) =>
                        handleMarriageChange(idx, "spouse_id", e.target.value)
                      }
                      className="modification-input-field"
                    >
                      <option value="">-- Válassz / Nincs adat --</option>
                      {availableMembers
                        .filter((mem) => mem.id !== m.id) // Önmagát ne
                        .map((mem) => (
                          <option key={mem.id} value={mem.id}>
                            {mem.full_name} ({mem.birth_year || "?"})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                <div className="sidebar-content-row">
                  <p>
                    <strong>Dátum:</strong>
                  </p>
                  {!isEditing ? (
                    <p>{mar.datum || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={mar.datum}
                      onChange={(e) =>
                        handleMarriageChange(idx, "datum", e.target.value)
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>
                <div className="sidebar-content-row">
                  <p>
                    <strong>Hely:</strong>
                  </p>
                  {!isEditing ? (
                    <p>{mar.hely || "N/A"}</p>
                  ) : (
                    <input
                      type="text"
                      value={mar.hely}
                      onChange={(e) =>
                        handleMarriageChange(idx, "hely", e.target.value)
                      }
                      className="modification-input-field"
                    />
                  )}
                </div>

                {/* Tanú 1 */}
                <div
                  style={{
                    marginTop: "10px",
                    paddingLeft: "10px",
                    borderLeft: "2px solid #ddd",
                  }}
                >
                  <p style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
                    1. Tanú:
                  </p>
                  <div className="sidebar-content-row">
                    <p>Név:</p>
                    {!isEditing ? (
                      <p>{mar.tanu1?.nev || "N/A"}</p>
                    ) : (
                      <input
                        type="text"
                        value={mar.tanu1?.nev || ""}
                        onChange={(e) =>
                          handleMarriageChange(
                            idx,
                            null,
                            e.target.value,
                            "tanu1",
                            "nev",
                          )
                        }
                        className="modification-input-field"
                      />
                    )}
                  </div>
                  <div className="sidebar-content-row">
                    <p>Lakhely:</p>
                    {!isEditing ? (
                      <p>{mar.tanu1?.lakhely || "N/A"}</p>
                    ) : (
                      <input
                        type="text"
                        value={mar.tanu1?.lakhely || ""}
                        onChange={(e) =>
                          handleMarriageChange(
                            idx,
                            null,
                            e.target.value,
                            "tanu1",
                            "lakhely",
                          )
                        }
                        className="modification-input-field"
                      />
                    )}
                  </div>
                  <div className="sidebar-content-row">
                    <p>Foglalk.:</p>
                    {!isEditing ? (
                      <p>{mar.tanu1?.foglalk || "N/A"}</p>
                    ) : (
                      <input
                        type="text"
                        value={mar.tanu1?.foglalk || ""}
                        onChange={(e) =>
                          handleMarriageChange(
                            idx,
                            null,
                            e.target.value,
                            "tanu1",
                            "foglalk",
                          )
                        }
                        className="modification-input-field"
                      />
                    )}
                  </div>
                </div>

                {/* Tanú 2 */}
                <div
                  style={{
                    marginTop: "10px",
                    paddingLeft: "10px",
                    borderLeft: "2px solid #ddd",
                  }}
                >
                  <p style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
                    2. Tanú:
                  </p>
                  <div className="sidebar-content-row">
                    <p>Név:</p>
                    {!isEditing ? (
                      <p>{mar.tanu2?.nev || "N/A"}</p>
                    ) : (
                      <input
                        type="text"
                        value={mar.tanu2?.nev || ""}
                        onChange={(e) =>
                          handleMarriageChange(
                            idx,
                            null,
                            e.target.value,
                            "tanu2",
                            "nev",
                          )
                        }
                        className="modification-input-field"
                      />
                    )}
                  </div>
                  <div className="sidebar-content-row">
                    <p>Lakhely:</p>
                    {!isEditing ? (
                      <p>{mar.tanu2?.lakhely || "N/A"}</p>
                    ) : (
                      <input
                        type="text"
                        value={mar.tanu2?.lakhely || ""}
                        onChange={(e) =>
                          handleMarriageChange(
                            idx,
                            null,
                            e.target.value,
                            "tanu2",
                            "lakhely",
                          )
                        }
                        className="modification-input-field"
                      />
                    )}
                  </div>
                  <div className="sidebar-content-row">
                    <p>Foglalk.:</p>
                    {!isEditing ? (
                      <p>{mar.tanu2?.foglalk || "N/A"}</p>
                    ) : (
                      <input
                        type="text"
                        value={mar.tanu2?.foglalk || ""}
                        onChange={(e) =>
                          handleMarriageChange(
                            idx,
                            null,
                            e.target.value,
                            "tanu2",
                            "foglalk",
                          )
                        }
                        className="modification-input-field"
                      />
                    )}
                  </div>
                </div>

                {idx < displayMarriages.length - 1 && (
                  <hr className="section-divider" />
                )}
              </div>
            ))}
          </div>

          {/* --- ÉLETÚT --- */}
          <div className="sidebar-section">
            <h3 className="section-title">Életút és Források</h3>
            <div className="sidebar-content">
              <div className="sidebar-content-row">
                <p>
                  <strong>Foglalkozás:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.foglalkozas || "N/A"}</p>
                ) : (
                  <textarea
                    name="foglalkozas"
                    value={editData.foglalkozas}
                    onChange={handleSimpleChange}
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Lakhely:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.lakhely || "N/A"}</p>
                ) : (
                  <textarea
                    name="lakhely"
                    value={editData.lakhely}
                    onChange={handleSimpleChange}
                    className="modification-input-field"
                  />
                )}
              </div>
              <div className="sidebar-content-row">
                <p>
                  <strong>Megjegyzés:</strong>
                </p>
                {!isEditing ? (
                  <p>{m.komment || "N/A"}</p>
                ) : (
                  <textarea
                    name="komment"
                    value={editData.komment}
                    onChange={handleSimpleChange}
                    className="modification-input-field"
                  />
                )}
              </div>
            </div>
          </div>

          {/* --- FORRÁSOK --- */}
          <div className="sidebar-section">
            <h3 className="section-title">Források</h3>
            <div className="sidebar-content">
              {!isEditing ? (
                // --- MEGTEKINTÉS MÓD ---
                displaySources.length > 0 ? (
                  displaySources.map((src, idx) => (
                    <div key={idx} style={{ marginBottom: "5px" }}>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="sidebar-link"
                        style={{ display: "block" }}
                      >
                        {src.label}
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="sidebar-content-row">N/A</p>
                )
              ) : (
                // --- SZERKESZTÉS MÓD ---
                <>
                  {displaySources.map((src, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "10px",
                        border: "1px solid #eee",
                        padding: "5px",
                        borderRadius: "4px",
                        position: "relative",
                      }}
                    >
                      {/* Törlés gomb */}
                      <button
                        onClick={() => handleDeleteSource(idx)}
                        style={{
                          position: "absolute",
                          top: "2px",
                          right: "2px",
                          background: "#ff4d4d",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                          fontSize: "12px",
                          lineHeight: "1",
                        }}
                        title="Törlés"
                      >
                        X
                      </button>

                      <input
                        type="text"
                        value={src.label}
                        onChange={(e) =>
                          handleSourceChange(idx, "label", e.target.value)
                        }
                        placeholder="Címke (pl. Anyakönyv)"
                        style={{ ...inputStyle, marginBottom: "5px" }}
                      />
                      <input
                        type="text"
                        value={src.url}
                        onChange={(e) =>
                          handleSourceChange(idx, "url", e.target.value)
                        }
                        placeholder="URL (http://...)"
                        className="modification-input-field"
                      />
                    </div>
                  ))}
                  {/* Hozzáadás gomb */}
                  <button
                    onClick={handleAddSource}
                    className="family-tree-button"
                  >
                    + Új forrás
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InformationSidebar;
