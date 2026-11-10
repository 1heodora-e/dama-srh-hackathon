import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const PUBLIC_LINKS = [
  { to: "/", label: "Home" },
  { to: "/locator", label: "Find a clinic" },
  { to: "/learn", label: "Ask Sira" },
];

const STAFF_LINKS = {
  moh: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/radio", label: "Radio" },
    { to: "/relay", label: "Relay" },
  ],
  relay: [{ to: "/relay", label: "My visits" }],
  radio: [{ to: "/radio", label: "This week’s script" }],
};

/** Floating capsule nav: hides while scrolling down, returns on scroll up. */
export default function TopNav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

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

  const links = role ? [...STAFF_LINKS[role.key], ...PUBLIC_LINKS.slice(1)] : PUBLIC_LINKS;

  return (
    <header className={`dm-navbar dm-outer ${hidden ? "is-hidden" : ""}`} onFocus={() => setHidden(false)}>
      <div className="dm-navbar-bar dm-patterned">
        <Link className="dm-brand" to="/">
          <i />
          dama
        </Link>
        <nav className="dm-links" aria-label="Main">
          {links.map((item) => (
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
          {role ? (
            <>
              <span className="dm-role-badge" title={role.audience}>
                {role.space}
              </span>
              <button
                type="button"
                className="dm-pill-btn dm-pill-ghost"
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link className="dm-pill-btn" to="/connexion">
              Staff sign-in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
