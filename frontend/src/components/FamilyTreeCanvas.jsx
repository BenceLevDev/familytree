import React, { useMemo } from "react";
import FamilyMemberCard from "./FamilyMemberCard";
import ConnectionsLayer from "./ConnectionsLayer";
import "./FamilyTreeCanvas.css";

const FamilyTreeCanvas = ({
  isAnimating,
  transform,
  relationships,
  positions,
  sortedGenerations,
  onMemberClick,
  memberRefs,
}) => {
  // --- OPTIMALIZÁCIÓ: Memoizáljuk a csoportosítást ---
  // Így nem fut le újra a párosító logika minden egyes pixelnyi mozgatásnál,
  // csak akkor, ha a generációk vagy a kapcsolatok ténylegesen megváltoznak.
  const groupedGenerations = useMemo(() => {
    const groupMembersIntoCouples = (genMembers) => {
      const processedIds = new Set();
      const groups = [];

      genMembers.forEach((member) => {
        if (processedIds.has(member.id)) return;

        const spouseRel = relationships.find(
          (r) =>
            r.type === "spouse" && (r.from === member.id || r.to === member.id),
        );

        let spouse = null;
        if (spouseRel) {
          const spouseId =
            spouseRel.from === member.id ? spouseRel.to : spouseRel.from;
          spouse = genMembers.find((m) => m.id === spouseId);
        }

        if (spouse && !processedIds.has(spouse.id)) {
          groups.push({
            type: "couple",
            members: [member, spouse],
          });
          processedIds.add(member.id);
          processedIds.add(spouse.id);
        } else {
          groups.push({
            type: "single",
            member: member,
          });
          processedIds.add(member.id);
        }
      });

      return groups;
    };

    // Lefuttatjuk a csoportosítást minden generációra
    return sortedGenerations.map((gen) => groupMembersIntoCouples(gen));
  }, [sortedGenerations, relationships]);

  // Segédfüggvény a kártya rendereléshez (tisztább kód)
  const renderMember = (member) => (
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
  );

  return (
    <div
      className={`family-tree ${isAnimating ? "smooth-move" : ""}`}
      style={{
        transform: transform,
        transformOrigin: "0 0",
        transition: isAnimating ? "transform 0.5s ease-out" : "none",
        willChange: "transform", // Ez segít a böngészőnek előkészíteni a GPU-t a mozgatásra
      }}
    >
      <ConnectionsLayer relationships={relationships} positions={positions} />

      {/* KÁRTYÁK RÉTEG: A már előre kiszámolt 'groupedGenerations' használata */}
      {groupedGenerations.map((groupedNodes, gIdx) => (
        <div key={`gen-${gIdx}`} className="generation-row">
          {groupedNodes.map((node, i) => {
            if (node.type === "couple") {
              return (
                <div key={`couple-${i}`} className="couple-group">
                  {node.members.map((member) => renderMember(member))}
                </div>
              );
            } else {
              return renderMember(node.member);
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default FamilyTreeCanvas;
