import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/radio", label: "Radio" },
  { to: "/locator", label: "Locator" },
  { to: "/learn", label: "Sira 🌿" },
  { to: "/relay", label: "Relay" },
];

export default function TopNav() {
  return (
    <header className="topnav">
      <div className="container topnav-inner">
        <div className="topnav-brand">
          <span className="topnav-dot" />
          <span className="display-font topnav-wordmark">
            dama
          </span>
        </div>

        <nav className="topnav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `topnav-link ${isActive ? "topnav-link-active" : ""}`
              }
            end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <span className="topnav-time">Last Updated: {new Date().toLocaleString()}</span>
      </div>
    </header>
  );
}
