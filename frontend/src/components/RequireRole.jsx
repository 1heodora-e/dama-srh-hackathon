import { Link, Navigate, useLocation } from "react-router-dom";
import { PATH_ROLE, ROLES, useAuth } from "../lib/auth";
import TopNav from "./TopNav";

/** Guards a staff space. Sends signed-out visitors to sign-in; blocks other roles. */
export default function RequireRole({ path, children }) {
  const { role, canAccess, signOut } = useAuth();
  const location = useLocation();
  const owner = ROLES[PATH_ROLE[path]];

  if (!role) {
    const next = encodeURIComponent(location.pathname);
    return <Navigate to={`/connexion?role=${owner.key}&next=${next}`} replace />;
  }

  if (canAccess(path)) return children;

  return (
    <>
      <TopNav />
      <main className="dm-wrap dm-locked-page">
        <div className="dm-locked">
          <div className="dm-locked-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <span className="dm-ref">{owner.space}</span>
          <h1>This space is for {owner.name}</h1>
          <p>
            You’re signed in as {role.name}. Each role only sees its own tools and data, so {owner.space} needs its own
            access code.
          </p>
          <div className="dm-locked-actions">
            <Link className="dm-btn dm-btn-terra" to={role.home}>
              Back to {role.space}
            </Link>
            <button type="button" className="dm-btn dm-btn-dark-line" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
