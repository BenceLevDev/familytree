import FamilyMemberCard from "./components/FamilyMemberCard";
import familyMembers from "./data/familyMembers.json";
import "./App.css";
import { useState, useRef } from "react";

function App() {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  return (
    <div
      className={`viewport ${isGrabbing ? "grabbing" : ""}`} // a "canvas" vagy nézetterület
      onMouseDown={(e) => {
        setIsGrabbing(true); // lenyomás kezdete
        startXRef.current = e.clientX; // kezdeti X rögzítése
        startYRef.current = e.clientY; // kezdeti Y rögzítése
      }}
      onMouseMove={(e) => {
        if (!isGrabbing) return; // csak lenyomás közben
        const deltaX = e.clientX - startXRef.current; // X mozgás
        const deltaY = e.clientY - startYRef.current; // Y mozgás
        console.log(deltaY, deltaX);
        setOffsetX((prev) => prev + deltaX); // X offset frissítése
        setOffsetY((prev) => prev + deltaY); // Y offset frissítése
        startXRef.current = e.clientX; // új kezdőpozíció X
        startYRef.current = e.clientY; // új kezdőpozíció Y
      }}
      onMouseUp={() => setIsGrabbing(false)} // lenyomás felengedés
      onMouseLeave={() => setIsGrabbing(false)} // ha elhagyja a viewportot
    >
      <div
        className="family-tree"
        style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }} // eltolás a grab alapján
      >
        {familyMembers.map((member) => (
          <FamilyMemberCard
            key={member.id}
            last_name={member.last_name}
            first_name={member.first_name}
            gender={member.gender}
            image={member.image}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
