import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";

import { API_BASE } from "../lib/api";
const SERVICE_OPTIONS = [
  "family planning",
  "prenatal care",
  "GBV support",
  "contraceptives",
  "other",
];

const DEFAULT_RELAY_ID = "relay-kaya-01";

function buildInitialHouseholds(total = 0, labels = []) {
  const source = labels.length ? labels : Array.from({ length: total }, (_, idx) => `Household ${idx + 1}`);
  return source.map((label, idx) => ({
    id: idx + 1,
    name: label,
    visited: false,
    srhNeed: null,
    referralMade: null,
    serviceType: "",
    submitted: false,
  }));
}

export default function RelayPortal() {
  const [households, setHouseholds] = useState([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [syncPulse, setSyncPulse] = useState(false);
  const [relayProfile, setRelayProfile] = useState(null);
  const [feedbackText, setFeedbackText] = useState("Loading assigned households from backend...");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/relay/sync/${DEFAULT_RELAY_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error("Relay sync failed");
        return res.json();
      })
      .then((payload) => {
        setRelayProfile(payload.relay);
        setHouseholds(buildInitialHouseholds(payload.relay.assigned_households, payload.households));
        setLastSynced(new Date(payload.last_synced));
        setFeedbackText(
          `Assignments loaded for ${payload.relay.relay_name}. Log each household visit to continuously improve district intelligence.`
        );
        setErrorText("");
      })
      .catch((error) => {
        console.error("Relay sync failed", error);
        setRelayProfile({
          relay_id: DEFAULT_RELAY_ID,
          relay_name: "Relay Worker",
          province_id: 15,
          commune: "Fallback Commune",
          phone: "",
          assigned_households: 8,
        });
        setHouseholds(buildInitialHouseholds(8));
        setErrorText("Could not load relay assignments from backend. Using local fallback list.");
      });
  }, []);

  const completedCount = useMemo(() => households.filter((h) => h.submitted).length, [households]);
  const srhFlaggedCount = useMemo(() => households.filter((h) => h.submitted && h.srhNeed === true).length, [households]);
  const referralsMadeCount = useMemo(
    () => households.filter((h) => h.submitted && h.referralMade === true).length,
    [households]
  );
  const progressPct = households.length ? Math.round((completedCount / households.length) * 100) : 0;

  const activeHousehold = households.find((h) => h.id === activeHouseholdId) || null;

  const setHousehold = (id, updater) => {
    setHouseholds((prev) => prev.map((household) => (household.id === id ? { ...household, ...updater } : household)));
  };

  const toggleVisited = (id, checked) => {
    setHousehold(id, { visited: checked });
    setActiveHouseholdId(checked ? id : null);
  };

  const submitVisit = () => {
    if (!activeHousehold) return;
    if (activeHousehold.srhNeed === null || activeHousehold.referralMade === null || !activeHousehold.serviceType) return;
    fetch(`${API_BASE}/api/relay/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relay_id: relayProfile?.relay_id || DEFAULT_RELAY_ID,
        province_id: relayProfile?.province_id || 15,
        household_label: activeHousehold.name,
        srh_need_identified: activeHousehold.srhNeed,
        referral_made: activeHousehold.referralMade,
        service_type: activeHousehold.serviceType,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Visit submission failed");
        return res.json();
      })
      .then((payload) => {
        setHousehold(activeHousehold.id, { submitted: true });
        setActiveHouseholdId(null);
        setFeedbackText(
          `Visit submitted (${payload.visit_id.slice(0, 8)}...). Community indicators updated for this relay catchment.`
        );
        setErrorText("");
      })
      .catch((error) => {
        console.error("Visit submit failed", error);
        setErrorText("Visit could not be submitted. Please check connectivity and retry.");
      });
  };

  const handleSyncNow = () => {
    setSyncPulse(true);
    setTimeout(() => {
      fetch(`${API_BASE}/api/relay/sync/${relayProfile?.relay_id || DEFAULT_RELAY_ID}`)
        .then((res) => {
          if (!res.ok) throw new Error("Sync request failed");
          return res.json();
        })
        .then((payload) => {
          setLastSynced(new Date(payload.last_synced));
          setFeedbackText(
            `Sync successful. ${payload.households.length} assigned households confirmed for ${payload.relay.commune}.`
          );
          setErrorText("");
        })
        .catch(() => setErrorText("Sync request failed. You can continue capturing data offline."))
        .finally(() => setSyncPulse(false));
    }, 650);
  };

  return (
    <>
      <TopNav />
      <main className="page-shell relay-page">
        <div className="container relay-inner">
          <div className="mobile-center">
            <header className="relay-header-row">
              <div>
                <p className="label">
                  dama relay
                </p>
                <h1 className="relay-title">
                  Bonjour, {relayProfile?.relay_name || "Relay Worker"}
                </h1>
                <p className="radio-small">
                  Use this workflow during door-to-door outreach to capture anonymized SRH demand signals for your
                  commune.
                </p>
              </div>
              <span className="relay-badge">{relayProfile?.commune || "Assigned commune"}</span>
            </header>
            <p className="helper-box">{feedbackText}</p>
            {errorText ? <p className="alert alert-error">{errorText}</p> : null}

            <section className="card relay-card">
              <h2 className="relay-card-title">Today&apos;s Visits</h2>
              <p className="relay-subtext">
                {households.length} households assigned - {completedCount} completed
              </p>
              <div className="relay-progress">
                <progress value={completedCount} max={households.length || 1} />
              </div>
              <div className="relay-households">
                {households.map((household) => (
                  <label key={household.id} className={`relay-household-row ${household.visited ? "visited" : ""}`}>
                    <input
                      type="checkbox"
                      checked={household.visited}
                      onChange={(event) => toggleVisited(household.id, event.target.checked)}
                    />
                    <span>{household.name}</span>
                    {household.submitted ? <span className="relay-done-pill">Logged</span> : null}
                  </label>
                ))}
              </div>
            </section>

            {activeHousehold ? (
              <section className="card relay-card">
                <h2 className="relay-card-title">Log Visit Outcome ({activeHousehold.name})</h2>

                <div className="relay-field">
                  <p className="relay-field-label">SRH need identified?</p>
                  <div className="relay-toggle-row">
                    <button
                      type="button"
                      className={`relay-toggle-btn ${activeHousehold.srhNeed === true ? "active" : ""}`}
                      onClick={() => setHousehold(activeHousehold.id, { srhNeed: true })}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`relay-toggle-btn ${activeHousehold.srhNeed === false ? "active" : ""}`}
                      onClick={() => setHousehold(activeHousehold.id, { srhNeed: false })}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="relay-field">
                  <p className="relay-field-label">Referral made to CSPS?</p>
                  <div className="relay-toggle-row">
                    <button
                      type="button"
                      className={`relay-toggle-btn ${activeHousehold.referralMade === true ? "active" : ""}`}
                      onClick={() => setHousehold(activeHousehold.id, { referralMade: true })}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`relay-toggle-btn ${activeHousehold.referralMade === false ? "active" : ""}`}
                      onClick={() => setHousehold(activeHousehold.id, { referralMade: false })}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="relay-field">
                  <label className="relay-field-label">Service type needed?</label>
                  <select
                    value={activeHousehold.serviceType}
                    className="relay-select"
                    onChange={(event) => setHousehold(activeHousehold.id, { serviceType: event.target.value })}
                  >
                    <option value="">Select service type</option>
                    {SERVICE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="button" className="btn-primary relay-submit" onClick={submitVisit}>
                  Submit Visit
                </button>
              </section>
            ) : null}

            <section className="card relay-card">
              <h2 className="relay-card-title">Community Stats</h2>
              <div className="relay-stats-grid">
                <div className="relay-stat-tile">
                  <span className="relay-stat-label">Visits completed today</span>
                  <strong className="relay-stat-value">{completedCount}</strong>
                </div>
                <div className="relay-stat-tile">
                  <span className="relay-stat-label">SRH needs flagged</span>
                  <strong className="relay-stat-value">{srhFlaggedCount}</strong>
                </div>
                <div className="relay-stat-tile">
                  <span className="relay-stat-label">Referrals made</span>
                  <strong className="relay-stat-value">{referralsMadeCount}</strong>
                </div>
              </div>
            </section>

            <footer className="relay-sync">
              <div className="relay-sync-left">
                <span className={`relay-sync-dot ${online ? "online" : ""} ${syncPulse ? "pulse" : ""}`} />
                <span className="relay-sync-text">Last synced: {lastSynced.toLocaleString()}</span>
              </div>
              <button type="button" className="btn-secondary" onClick={handleSyncNow}>
                Sync Now
              </button>
            </footer>

            <div className="relay-actions">
              <Link to="/dashboard" className="btn-secondary">
                Back to main dashboard
              </Link>
              <Link to="/radio" className="btn-ghost">
                Open Radio Portal
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
