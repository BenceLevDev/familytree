import React from "react";
import FamilyMemberCard from "./FamilyMemberCard";
import ConnectionsLayer from "./ConnectionsLayer";

const FamilyTreeCanvas = ({
  isAnimating,
  transform,
  relationships,
  positions,
  sortedGenerations,
  onMemberClick,
  memberRefs,
}) => {
  return (
    <div
      className={`family-tree ${isAnimating ? "smooth-move" : ""}`}
      style={{
        transform: transform,
        transformOrigin: "0 0",
        transition: isAnimating ? "transform 0.5s ease-out" : "none",
      }}
    >
      <ConnectionsLayer relationships={relationships} positions={positions} />

      {/* KÁRTYÁK RÉTEG: A generációk és kártyák tényleges kirajzolása. */}
      {sortedGenerations.map((genMembers, gIdx) => (
        <div key={`gen-${gIdx}`} className="generation-row">
          {genMembers.map((member) => (
            <div
              key={member.id}
              onClick={() => onMemberClick(member.id)}
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
  );
};

export default FamilyTreeCanvas;
