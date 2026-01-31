import React, { useState } from "react";
import "./InformationSideBar.css";
import { FAMILY_DATA_CONFIG } from "./FamilyDataConfig";
import sideBarIconClosed from "../assets/menu-fold-svgrepo-com.svg";
import sideBarIconOpened from "../assets/menu-unfold-svgrepo-com.svg";

function InformationSidebar({ selectedMember }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Early return: Ha nincs adat, nem is próbáljuk megmappelni a mezőket
  if (!selectedMember) {
    return (
      <div className={`information-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-content-container">
          <h2>Kérlek válassz ki egy személyt</h2>
        </div>
      </div>
    );
  }

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
          <h2>{`${selectedMember.last_name} ${selectedMember.first_name}`}</h2>

          {Object.entries(FAMILY_DATA_CONFIG).map(([sectionKey, section]) => (
            <div key={sectionKey} className="sidebar-section">
              <h3 className="section-title">{section.title}</h3>
              <div className="sidebar-content">
                {section.fields.map((field) => (
                  <div className="sidebar-content-row" key={field.key}>
                    <p>
                      <strong>{field.label}</strong>
                    </p>
                    <p>
                      {field.type === "link" ? (
                        // 1. Ellenőrizzük, hogy tömb-e (több forrás)
                        Array.isArray(selectedMember[field.key]) ? (
                          <span className="links-list">
                            {selectedMember[field.key].map((item, index) => (
                              <a
                                key={index}
                                href={item.url || item}
                                target="_blank"
                                rel="noreferrer"
                                className="sidebar-link"
                              >
                                {item.label || `Forrás ${index + 1}`}
                              </a>
                            ))}
                          </span>
                        ) : // 2. Ha csak egy sima string (a jelenlegi állapot)
                        selectedMember[field.key] ? (
                          <a
                            href={selectedMember[field.key]}
                            target="_blank"
                            rel="noreferrer"
                            className="sidebar-link"
                          >
                            Megnyitás
                          </a>
                        ) : (
                          "N/A"
                        )
                      ) : (
                        // Minden más mező (szövegek)
                        selectedMember[field.key] || "N/A"
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default InformationSidebar;
