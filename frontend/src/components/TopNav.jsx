import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/radio", label: "Radio" },
  { to: "/locator", label: "Locator" },
  { to: "/learn", label: "Sira" },
  { to: "/relay", label: "Relay" },
];

/** Floating capsule nav: hides while scrolling down, returns on scroll up. */
export default function TopNav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY.current + 6 && y > 140) setHidden(true);
      else if (y < lastY.current - 6 || y < 140) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`dm-navbar dm-outer ${hidden ? "is-hidden" : ""}`} onFocus={() => setHidden(false)}>
      <div className="dm-navbar-bar dm-patterned">
        <Link className="dm-brand" to="/">
          <i />
          dama
        </Link>
        <nav className="dm-links" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="dm-nav-cta">
          <Link className="dm-pill-btn" to="/locator">
            Find a clinic
          </Link>
          <Link className="dm-round-btn" to="/radio" aria-label="Radio scripts">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 10h16v10H4z" />
              <path d="M8 10l9-6" />
              <circle cx="9" cy="15" r="2" />
              <path d="M14 14h3M14 17h3" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
