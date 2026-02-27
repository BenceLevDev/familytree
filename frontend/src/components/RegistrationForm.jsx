import React, { useState, useEffect } from "react";
import "./RegistrationForm.css";

// Hozzáadtam a token prop-ot, hogy az API hívásoknál azonosítsuk az admint
const RegistrationForm = ({ onMemberCreated, onCancel, token }) => {
  const [availableMembers, setAvailableMembers] = useState([]);

  useEffect(() => {
    // Betöltjük a neveket és ID-kat a dropdownhoz
    const fetchMembers = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/api/members/search-list",
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
    if (token) {
      fetchMembers();
    }
  }, [token]);

  const [formData, setFormData] = useState({
    last_name: "",
    first_name: "",
    gender: "male",
    generation: 1,
    komment: "",
    lakhely_tortenet: "",
    foglalkozas_tortenet: "",

    father_id: "",
    mother_id: "",
    spouse_id: "",
    // Születés
    birth_datum: "",
    birth_hely: "",
    apa_nev: "",
    anya_nev: "",
    // Keresztelő
    baptism_datum: "",
    baptism_hely: "",
    baptism_vallas: "",
    keresztelo_szemely: "",
    keresztapa_nev: "",
    keresztapa_foglalk: "",
    keresztapa_lakhely: "",
    keresztanya_nev: "",
    keresztanya_foglalk: "",
    keresztanya_lakhely: "",
    // Házasság
    hazastars_nev: "",
    marriage_hely: "",
    marriage_ido: "",
    tanu1_nev: "",
    tanu1_foglalk: "",
    tanu1_lakhely: "",
    tanu2_nev: "",
    tanu2_foglalk: "",
    tanu2_lakhely: "",
    // Halál
    death_datum: "",
    death_hely: "",
    death_ok: "",
    death_bejelento: "",
    // Források (lista)
    sources: [{ label: "", url: "" }],
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  const handleParentSelect = (e, type) => {
    const selectedId = e.target.value;
    const selectedMember = availableMembers.find(
      (m) => m.id.toString() === selectedId,
    );

    setFormData((prev) => {
      const newData = { ...prev };
      if (type === "father") {
        newData.father_id = selectedId;
        // Ha választottunk, beírjuk a nevet is, ha nem, üresre állítjuk vagy hagyjuk
        if (selectedMember) newData.apa_nev = selectedMember.full_name;
      } else if (type === "mother") {
        newData.mother_id = selectedId;
        if (selectedMember) newData.anya_nev = selectedMember.full_name;
      } else if (type === "spouse") {
        newData.spouse_id = selectedId;
        if (selectedMember) newData.hazastars_nev = selectedMember.full_name;
      }
      return newData;
    });
  };

  const onCancelHandler = () => {
    if (onCancel) {
      onCancel();
    } else {
      window.location.reload();
    }
  };

  // Forrás hozzáadása a listához
  const addSource = () => {
    setFormData((prev) => ({
      ...prev,
      sources: [...prev.sources, { label: "", url: "" }],
    }));
  };

  const handleSourceChange = (index, field, value) => {
    const newSources = [...formData.sources];
    newSources[index][field] = value;
    setFormData((prev) => ({ ...prev, sources: newSources }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      last_name: formData.last_name,
      first_name: formData.first_name,
      gender: formData.gender,
      generation: parseInt(formData.generation) || 1,
      komment: formData.komment,
      lakhely: formData.lakhely_tortenet,
      foglalkozas: formData.foglalkozas_tortenet,
      father_id: formData.father_id || null,
      mother_id: formData.mother_id || null,
      birth: {
        datum: formData.birth_datum,
        hely: formData.birth_hely,
        apa: formData.apa_nev,
        anya: formData.anya_nev,
      },
      baptism: {
        datum: formData.baptism_datum,
        hely: formData.baptism_hely,
        vallas: formData.baptism_vallas,
        keresztelo_szemely: formData.keresztelo_szemely,
        keresztapa: {
          nev: formData.keresztapa_nev,
          foglalk: formData.keresztapa_foglalk,
          lakhely: formData.keresztapa_lakhely,
        },
        keresztanya: {
          nev: formData.keresztanya_nev,
          foglalk: formData.keresztanya_foglalk,
          lakhely: formData.keresztanya_lakhely,
        },
      },
      marriages: formData.hazastars_nev
        ? [
            {
              hazastars: formData.hazastars_nev,
              spouse_id: formData.spouse_id || null,
              hely: formData.marriage_hely,
              datum: formData.marriage_ido,
              tanu1: {
                nev: formData.tanu1_nev,
                foglalk: formData.tanu1_foglalk,
                lakhely: formData.tanu1_lakhely,
              },
              tanu2: {
                nev: formData.tanu2_nev,
                foglalk: formData.tanu2_foglalk,
                lakhely: formData.tanu2_lakhely,
              },
            },
          ]
        : [],
      death:
        formData.death_datum || formData.death_ok
          ? {
              datum: formData.death_datum,
              hely: formData.death_hely,
              ok: formData.death_ok,
              bejelento: formData.death_bejelento,
            }
          : null,
      // Csak azokat a forrásokat küldjük el, amiknek van URL-je
      sources: formData.sources.filter((s) => s.url.trim() !== ""),
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newMember = await response.json();
        alert("Sikeres mentés!");
        window.location.reload();
        if (onMemberCreated) onMemberCreated(newMember);
      } else {
        alert("Hiba történt a mentés során.");
      }
    } catch (error) {
      console.error("Hiba:", error);
    }
  };
  // Helper stílus a selectekhez
  const selectStyle = {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  return (
    <div className="registration-form-container">
      <form onSubmit={handleSubmit}>
        <h1>Új családtag regisztrációja</h1>

        <section>
          <h3>Alapadatok</h3>
          <input
            id="last_name"
            type="text"
            placeholder="Vezetéknév"
            value={formData.last_name}
            onChange={handleChange}
            required
            className="creation-input-field"
          />
          <input
            id="first_name"
            type="text"
            placeholder="Keresztnév"
            value={formData.first_name}
            onChange={handleChange}
            required
            className="creation-input-field"
          />
          <div className="registration-form-spec-container">
            <select
              id="gender"
              value={formData.gender}
              onChange={handleChange}
              className="creation-input-field"
            >
              <option value="male">Férfi</option>
              <option value="female">Nő</option>
            </select>
          </div>

          <input
            id="generation"
            type="number"
            placeholder="Generáció"
            value={formData.generation}
            onChange={handleChange}
            className="creation-input-field"
          />
        </section>

        <section>
          <h3>Születés</h3>
          <input
            id="birth_datum"
            type="text"
            placeholder="Dátum"
            value={formData.birth_datum}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="birth_hely"
            type="text"
            placeholder="Hely"
            value={formData.birth_hely}
            onChange={handleChange}
            className="creation-input-field"
          />
          {/* --- APA: DROPDOWN + TEXT --- */}
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Apa:
          </label>
          <select
            value={formData.father_id}
            onChange={(e) => handleParentSelect(e, "father")}
            style={selectStyle}
          >
            <option value="">-- Válassz listából (opcionális) --</option>
            {availableMembers
              .filter((m) => m.gender === "male" || !m.gender)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.birth_year || "?"})
                </option>
              ))}
          </select>
          <input
            id="apa_nev"
            type="text"
            placeholder="Apa neve"
            value={formData.apa_nev}
            onChange={handleChange}
            className="creation-input-field"
          />
          {/* --- ANYA: DROPDOWN + TEXT --- */}
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Anya:
          </label>
          <select
            value={formData.mother_id}
            onChange={(e) => handleParentSelect(e, "mother")}
            style={selectStyle}
          >
            <option value="">-- Válassz listából (opcionális) --</option>
            {availableMembers
              .filter((m) => m.gender === "female" || !m.gender)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.birth_year || "?"})
                </option>
              ))}
          </select>
          <input
            id="anya_nev"
            type="text"
            placeholder="Anya neve"
            value={formData.anya_nev}
            onChange={handleChange}
            className="creation-input-field"
          />
        </section>

        <section>
          <h3>Keresztelő</h3>
          <input
            id="baptism_datum"
            type="text"
            placeholder="Dátum"
            value={formData.baptism_datum}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="baptism_vallas"
            type="text"
            placeholder="Vallás"
            value={formData.baptism_vallas}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="baptism_keresztelő_szemely"
            type="text"
            placeholder="Keresztelő személy"
            value={formData.baptism_keresztelo_szemely}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="baptism_hely"
            type="text"
            placeholder="Hely"
            value={formData.baptism_hely}
            onChange={handleChange}
            className="creation-input-field"
          />
          <p className="sub-label">Keresztapa adatai:</p>
          <input
            id="keresztapa_nev"
            type="text"
            placeholder="Név"
            value={formData.keresztapa_nev}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="keresztapa_foglalk"
            type="text"
            placeholder="Foglalkozás"
            value={formData.keresztapa_foglalk}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="keresztapa_lakhely"
            type="text"
            placeholder="Lakhely"
            value={formData.keresztapa_lakhely}
            onChange={handleChange}
            className="creation-input-field"
          />
          <p className="sub-label">Keresztanya adatai:</p>
          <input
            id="keresztanya_nev"
            type="text"
            placeholder="Név"
            value={formData.keresztanya_nev}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="keresztanya_foglalk"
            type="text"
            placeholder="Foglalkozás"
            value={formData.keresztanya_foglalk}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="keresztanya_lakhely"
            type="text"
            placeholder="Lakhely"
            value={formData.keresztanya_lakhely}
            onChange={handleChange}
            className="creation-input-field"
          />
        </section>

        <section>
          <h3>Házasság</h3>
          {/* --- HÁZASTÁRS: DROPDOWN + TEXT --- */}
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Házastárs:
          </label>
          <select
            value={formData.spouse_id}
            onChange={(e) => handleParentSelect(e, "spouse")}
            style={selectStyle}
          >
            <option value="">-- Válassz listából (opcionális) --</option>
            {availableMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.birth_year || "?"})
              </option>
            ))}
          </select>
          <input
            id="hazastars_nev"
            type="text"
            placeholder="Házastárs neve"
            value={formData.hazastars_nev}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="marriage_ido"
            type="text"
            placeholder="Esküvő ideje"
            value={formData.marriage_ido}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="marriage_hely"
            type="text"
            placeholder="Esküvő helye"
            value={formData.marriage_hely}
            onChange={handleChange}
            className="creation-input-field"
          />
          <p className="sub-label">1. Tanú:</p>
          <input
            id="tanu1_nev"
            type="text"
            placeholder="Név"
            value={formData.tanu1_nev}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="tanu1_foglalk"
            type="text"
            placeholder="Foglalkozás"
            value={formData.tanu1_foglalk}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="tanu1_lakhely"
            type="text"
            placeholder="Lakhely"
            value={formData.tanu1_lakhely}
            onChange={handleChange}
            className="creation-input-field"
          />
          <p className="sub-label">2. Tanú:</p>
          <input
            id="tanu2_nev"
            type="text"
            placeholder="Név"
            value={formData.tanu2_nev}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="tanu2_foglalk"
            type="text"
            placeholder="Foglalkozás"
            value={formData.tanu2_foglalk}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="tanu2_lakhely"
            type="text"
            placeholder="Lakhely"
            value={formData.tanu2_lakhely}
            onChange={handleChange}
            className="creation-input-field"
          />
        </section>

        <section>
          <h3>Halálozás</h3>
          <input
            id="death_datum"
            type="text"
            placeholder="Dátum"
            value={formData.death_datum}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="death_hely"
            type="text"
            placeholder="Hely"
            value={formData.death_hely}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="death_ok"
            type="text"
            placeholder="Halál oka"
            value={formData.death_ok}
            onChange={handleChange}
            className="creation-input-field"
          />
          <input
            id="death_bejelento"
            type="text"
            placeholder="Bejelentő"
            value={formData.death_bejelento}
            onChange={handleChange}
            className="creation-input-field"
          />
        </section>

        <section>
          <h3>Források</h3>
          {formData.sources.map((source, index) => (
            <div key={index} className="source-input-group">
              <input
                type="text"
                placeholder="Megnevezés (pl. Anyakönyv)"
                value={source.label}
                onChange={(e) =>
                  handleSourceChange(index, "label", e.target.value)
                }
                className="creation-input-field"
              />
              <input
                type="text"
                placeholder="URL link"
                value={source.url}
                onChange={(e) =>
                  handleSourceChange(index, "url", e.target.value)
                }
                className="creation-input-field"
              />
            </div>
          ))}
          <div className="registration-form-spec-container">
            <button
              type="button"
              onClick={addSource}
              className="family-tree-button"
            >
              + Új forrás
            </button>
          </div>
        </section>

        <section>
          <h3>Életút</h3>
          <textarea
            id="foglalkozas_tortenet"
            placeholder="Foglalkozások..."
            value={formData.foglalkozas_tortenet}
            onChange={handleChange}
            className="creation-input-field"
          ></textarea>
          <textarea
            id="lakhely_tortenet"
            placeholder="Lakhelyek..."
            value={formData.lakhely_tortenet}
            onChange={handleChange}
            className="creation-input-field"
          ></textarea>
          <textarea
            id="komment"
            placeholder="Megjegyzés..."
            value={formData.komment}
            onChange={handleChange}
            className="creation-input-field"
          ></textarea>
        </section>

        <div className="form-actions">
          <button type="submit" className="family-tree-button">
            Mentés
          </button>
          <button
            type="button"
            className="family-tree-button"
            onClick={onCancelHandler}
          >
            Mégse
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;
