import { forwardRef, memo } from "react";
import "./FamilyMemberCard.css";

// A 'memo' a kulcs a teljesítményhez: megakadályozza az felesleges újrarajzolást
const FamilyMemberCard = memo(
  forwardRef(({ last_name, first_name, gender, image_url }, ref) => {
    return (
      <div ref={ref} className={`family-member-card ${gender}`}>
        {image_url && (
          <img src={image_url} alt={last_name + " " + first_name} />
        )}
        {image_url ? (
          <div className="family-member-info-w-img">
            <span>{last_name}</span>
            <span>{first_name}</span>
          </div>
        ) : (
          <div className="family-member-info-wo-img">
            <span>{last_name}</span>
            <span>{first_name}</span>
          </div>
        )}
      </div>
    );
  }),
);

export default FamilyMemberCard;
