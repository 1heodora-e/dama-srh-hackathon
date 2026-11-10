import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="dm-footer dm-outer">
      <div className="dm-frame dm-patterned">
        <span className="dm-cross tl" />
        <span className="dm-cross tr" />
        <span className="dm-cross bl" />
        <span className="dm-cross br" />
        <svg className="dm-arcs" viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="160" r="30" />
          <circle cx="80" cy="160" r="55" />
          <circle cx="80" cy="160" r="80" />
          <circle cx="80" cy="160" r="105" />
        </svg>
        <div className="dm-footer-top">
          <div className="dm-footer-big">
            <i />
            dama
          </div>
          <nav className="dm-footer-links" aria-label="Footer">
            <Link to="/locator">Find a clinic</Link>
            <Link to="/learn">Ask Sira</Link>
            <Link to="/connexion">Staff sign-in</Link>
          </nav>
        </div>
        <div className="dm-footer-row">
          <span className="dm-ref">Enough care. For every woman. Everywhere.</span>
          <span className="dm-ref">CRA Public Sector Innovation Hackathon · 2026</span>
        </div>
      </div>
    </footer>
  );
}
