import { forwardRef } from "react";
import "./FamilyMemberCard.css";

const FamilyMemberCard = forwardRef(
  ({ last_name, first_name, gender, image }, ref) => {
    return (
      <div ref={ref} className={`family-member-card ${gender}`}>
        {image && <img src={image} alt={last_name + " " + first_name} />}
        {image ? (
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
        <button className="info-btn">i</button>
      </div>
    );
  },
);

export default FamilyMemberCard;
