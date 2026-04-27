import { useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";

const API_BASE = "http://127.0.0.1:8000";
const MAP_URL =
  "https://raw.githubusercontent.com/lordvins226/burkinafaso-geojson/main/public/geojson/provinces.geojson";

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreBadge(score) {
  if (score <= 40) return "status-low";
  if (score <= 70) return "status-medium";
  if (score <= 85) return "status-high";
  return "status-critical";
}

export default function Dashboard() {
  const [scores, setScores] = useState([]);
  const [topPriority, setTopPriority] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/vulnerability/scores`).then((res) => res.json()),
      fetch(`${API_BASE}/api/vulnerability/top-priority`).then((res) => res.json()),
      fetch(MAP_URL).then((res) => res.json()),
    ])
      .then(([scoresJson, topJson, mapJson]) => {
        const flat = scoresJson.features.map((f) => ({ ...f.properties }));
        const byName = Object.fromEntries(flat.map((row) => [normalizeName(row.province_name), row]));
        const features = (mapJson.features || [])
          .map((feature) => {
            const name = feature?.properties?.NAME_2 || feature?.properties?.name;
            const matched = byName[normalizeName(String(name || ""))];
            if (!matched) return null;
            return { ...feature, properties: { ...feature.properties, province_id: matched.province_id } };
          })
          .filter(Boolean);
        setScores(flat);
        setTopPriority(topJson);
        setGeoData({ type: "FeatureCollection", features });
        setSelectedId(topJson[0]?.province_id || null);
      })
      .catch(() => setError("Unable to load dashboard data. Please verify backend connectivity."));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`${API_BASE}/api/vulnerability/district/${selectedId}`)
      .then((res) => res.json())
      .then(setDetail)
      .catch(() => setError("Unable to load district details."));
  }, [selectedId]);

  const byId = useMemo(() => Object.fromEntries(scores.map((s) => [s.province_id, s])), [scores]);
  const topThree = useMemo(() => topPriority.slice(0, 3).map((row) => row.province_id), [topPriority]);

  const handleRefresh = async () => {
    const response = await fetch(`${API_BASE}/api/feedback/refresh`, { method: "POST" });
    const json = await response.json();
    setFeedbackText(
      `Refreshed at ${new Date(json.refreshed_at).toLocaleTimeString()} using ${json.interaction_summary.interaction_logs} interactions and ${json.interaction_summary.relay_visits} relay visits.`
    );
  };

  return (
    <>
      <TopNav />
      <div className="page-shell dashboard-page">
        <div className="container dashboard-inner">
          <h1 className="dashboard-title">Equity Intelligence Dashboard</h1>
          <p className="dashboard-subtitle">
            This mission view translates community interactions into district-level vulnerability intelligence so
            planners, radio teams, and relay workers can align action around the same evidence.
          </p>
          {error ? <p className="alert alert-error">{error}</p> : null}
          {feedbackText ? <p className="alert alert-info">{feedbackText}</p> : null}

          <div className="dashboard-grid">
            <section className="card dashboard-panel">
              <h2 className="dashboard-h2">Priority Districts</h2>
              <div className="priority-list">
                {topPriority.map((row, idx) => (
                  <button key={row.province_id} className="priority-btn" onClick={() => setSelectedId(row.province_id)}>
                    <span className="label priority-index">{idx + 1}</span>
                    <span className="priority-name">{row.province_name}</span>
                    <span className={`status-pill ${scoreBadge(row.vulnerability_score)}`}>
                      {row.vulnerability_score.toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="card dashboard-panel">
              <div className="dashboard-map-header">
                <h2 className="dashboard-h2">Burkina Faso Province Intelligence Map</h2>
              </div>
              <div className="dashboard-map-actions">
                <button className="btn-secondary" onClick={handleRefresh}>
                  Refresh Feedback Loop
                </button>
              </div>
              <MapContainer center={[12.2, -1.5]} zoom={6} className="dashboard-map">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {geoData ? (
                  <GeoJSON
                    data={geoData}
                    style={(feature) => {
                      const score = byId[feature?.properties?.province_id]?.vulnerability_score ?? 0;
                      return {
                        color: selectedId === feature?.properties?.province_id ? "#C1440E" : "#D7C7B4",
                        weight: selectedId === feature?.properties?.province_id ? 2 : 1,
                        fillColor: score > 85 ? "#1C1410" : score > 70 ? "#F7A07D" : score > 40 ? "#FBD8C3" : "#EAF6F0",
                        fillOpacity: topThree.includes(feature?.properties?.province_id) ? 0.92 : 0.76,
                      };
                    }}
                    onEachFeature={(feature, layer) => {
                      const score = byId[feature?.properties?.province_id];
                      if (!score) return;
                      layer.bindTooltip(`${score.province_name} (${score.vulnerability_score.toFixed(1)})`);
                      layer.on("click", () => setSelectedId(score.province_id));
                    }}
                  />
                ) : null}
              </MapContainer>
            </section>

            <section className="card dashboard-panel">
              <h2 className="dashboard-h2">District Detail</h2>
              {detail ? (
                <>
                  <h3 className="display-font detail-name">
                    {detail.province_name}
                  </h3>
                  <p className="detail-score">
                    <CountUp end={detail.vulnerability_score} decimals={1} /> / 100
                  </p>
                  <div className="metric-grid">
                    {Object.entries(detail.metrics).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="metric-card">
                        <span className="label">{key.replaceAll("_", " ")}</span>
                        <strong>{typeof value === "number" ? value.toLocaleString() : value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="detail-actions">
                    <Link className="btn-primary" to={`/radio/${detail.province_id}`}>
                      Generate Radio Script
                    </Link>
                    <Link className="btn-secondary" to="/relay">
                      Open Relay Portal
                    </Link>
                  </div>
                </>
              ) : (
                <p>Select a district to inspect live vulnerability drivers.</p>
              )}
            </section>
          </div>

          <section className="dashboard-bottom-row">
            <article className="card dashboard-mini-card">
              <h3 className="label">Flow 1</h3>
              <p>Dashboard identifies priority districts with live model scoring.</p>
            </article>
            <article className="card dashboard-mini-card">
              <h3 className="label">Flow 2</h3>
              <p>Radio scripts convert data into actionable district messaging.</p>
            </article>
            <article className="card dashboard-mini-card">
              <h3 className="label">Flow 3</h3>
              <p>Locator + Relay interactions feed new demand signals back to this map.</p>
            </article>
            <article className="card dashboard-mini-card">
              <h3 className="label">Report</h3>
              <button className="btn-primary" onClick={() => window.print()}>
                Export PDF
              </button>
            </article>
          </section>
        </div>
      </div>
    </>
  );
}
