import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SectionHeading({ eyebrow, title, description, to, action = 'Xem tất cả' }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {to && <Link to={to}>{action} <ArrowRight size={17} /></Link>}
    </div>
  );
}
