import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import TopNav from "../components/TopNav";
import { ROLES, useAuth } from "../lib/auth";

const STAFF = ["moh", "relay", "radio"];

export default function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { role: current, signIn } = useAuth();
  const initial = STAFF.includes(params.get("role")) ? params.get("role") : "moh";
  const [roleKey, setRoleKey] = useState(initial);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const role = ROLES[roleKey];
  const next = params.get("next");

  if (current && !params.get("role")) return <Navigate to={current.home} replace />;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!code.trim()) {
      setError("Enter the access code your supervisor gave you.");
      return;
    }
    if (!signIn(roleKey, code)) {
      setError("That code doesn’t match this role. Check it and try again.");
      return;
    }
    const target = next && role.allowed.some((p) => next.startsWith(p)) ? next : role.home;
    navigate(target, { replace: true });
  };

  return (
    <>
      <TopNav />
      <div className="dm-page">
        <PageHeader
          refLeft="Staff sign-in"
          refRight="Women and girls never need an account"
          title="Sign in to your space"
          subtitle="Dama’s staff tools are for the Ministry of Health, Relais Communautaires and community radio hosts. Choose your role and enter your access code."
        />
        <section className="dm-wrap dm-signin-wrap">
          <div className="dm-role-pick" role="radiogroup" aria-label="Your role">
            {STAFF.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={roleKey === key}
                className={`dm-role-opt ${roleKey === key ? "is-on" : ""}`}
                onClick={() => {
                  setRoleKey(key);
                  setError("");
                }}
              >
                <span className="dm-ref">{ROLES[key].space}</span>
                <strong>{ROLES[key].name}</strong>
                <span>{ROLES[key].blurb}</span>
              </button>
            ))}
          </div>

          <form className="dm-signin" onSubmit={handleSubmit} noValidate>
            <span className="dm-ref dm-signin-role">{role.space}</span>
            <h2>Sign in as {role.name}</h2>
            <label htmlFor="access-code" className="dm-ref">
              Access code
            </label>
            <input
              id="access-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="XXXX-2026"
              autoComplete="off"
              autoCapitalize="characters"
              className={error ? "is-bad" : ""}
              aria-invalid={Boolean(error)}
              aria-describedby="access-msg"
            />
            <p id="access-msg" className="dm-signin-msg" role="alert">
              {error}
            </p>
            <button type="submit" className="dm-btn dm-btn-terra">
              Sign in
            </button>
            <p className="dm-signin-hint">
              Demo code for judges: <code>{role.code}</code>
            </p>
            <p className="dm-signin-note">
              Demo access only. In production, Ministry staff sign in with their existing accounts and Relais with phone
              number + PIN, checked by the server.
            </p>
          </form>

          <p className="dm-signin-public">
            Looking for care? <Link to="/locator">Find a clinic</Link> or <Link to="/learn">ask Sira</Link>. No account
            needed.
          </p>
        </section>
      </div>
    </>
  );
}
