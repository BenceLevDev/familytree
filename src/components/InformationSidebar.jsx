import React, { useState } from "react";
import "./InformationSideBar.css";
import sideBarIconClosed from "../assets/menu-fold-svgrepo-com.svg";
import sideBarIconOpened from "../assets/menu-unfold-svgrepo-com.svg";

function InformationSidebar({ selectedMember }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button onClick={toggleSidebar} className="sidebar-toggle-button">
        <img
          className="sidebar-icon"
          src={isOpen ? sideBarIconOpened : sideBarIconClosed}
          alt={isOpen ? "Menü bezárása" : "Menü megnyitása"}
        />
      </button>
      <div className={`information-sidebar ${isOpen ? "open" : ""}`}>
        {selectedMember ? (
          <div className="sidebar-content">
            <h2>
              {selectedMember.last_name} {selectedMember.first_name}
            </h2>
            <p>
              <strong>Született:</strong>{" "}
              {selectedMember.szuletes_datuma || "N/A"}
            </p>
            {selectedMember.keresztelet_helye && (
              <p>
                <strong>Hely:</strong> {selectedMember.keresztelet_helye}
              </p>
            )}
            {/* További mezőket itt tudsz hozzáadni a JSON alapján */}
          </div>
        ) : (
          <p style={{ padding: "20px" }}>
            Válassz ki egy családtagot a részletekhez.
          </p>
        )}
      </div>
    </>
  );
}

export default InformationSidebar;
