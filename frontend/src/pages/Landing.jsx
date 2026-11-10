import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { API_BASE } from "../lib/api";

const RISK_LABELS = {
  distance_to_nearest_csps_km: "far from the nearest CSPS",
  displacement_population: "high displacement",
  conflict_affected_binary: "conflict-affected",
  poverty_rate: "high poverty",
  maternal_mortality_rate: "high maternal mortality",
  adolescent_birth_rate: "high adolescent births",
  number_of_closed_csps: "many CSPS closed",
  child_marriage_rate_pct: "high child marriage",
  contraceptive_availability_pct: "low contraceptive stock",
  chw_density_per_1000: "few relay workers",
  number_of_open_csps: "few open CSPS",
  population_density: "dense population",
};

const GREETINGS = ["Laafi bala", "Bonjour", "Hello"];

function riskLabel(key) {
  return RISK_LABELS[key] || String(key || "").replaceAll("_", " ");
}

function Arcs({ className = "dm-arcs" }) {
  return (
    <svg className={className} viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="160" cy="160" r="30" />
      <circle cx="160" cy="160" r="60" />
      <circle cx="160" cy="160" r="90" />
      <circle cx="160" cy="160" r="120" />
    </svg>
  );
}

function Pointer() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1 1l13 5-6 2-2 6z" />
    </svg>
  );
}

export default function Landing() {
  const [scores, setScores] = useState([]);
  const [top, setTop] = useState([]);
  const [greet, setGreet] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/vulnerability/scores`)
      .then((res) => res.json())
      .then((json) => setScores((json.features || []).map((f) => f.properties)))
      .catch(() => {});
    fetch(`${API_BASE}/api/vulnerability/top-priority`)
      .then((res) => res.json())
      .then((json) => setTop(Array.isArray(json) ? json : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => setGreet((g) => (g + 1) % GREETINGS.length), 2000);
    return () => clearInterval(id);
  }, []);

  const critical = scores.filter((s) => s.vulnerability_score > 85).length;
  const lead = top[0];
  const fmt = (n, d = 0) => (typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "–");

  return (
    <>
      <TopNav />
      <div className="dm-page dm-landing">
        {/* ---------- Hero ---------- */}
        <section className="dm-hero dm-outer">
          <div className="dm-frame dm-patterned">
            <span className="dm-cross tl" />
            <span className="dm-cross tr" />
            <span className="dm-cross bl" />
            <span className="dm-cross br" />
            <div className="dm-meta">
              <span className="dm-ref">{scores.length || 45} provinces · Burkina Faso</span>
              <span className="dm-ref">Réf. DHS-BF 2021 / UNFPA</span>
            </div>
            <div className="dm-hero-grid">
              <div className="dm-hero-copy">
                <span className="dm-live">
                  <b>LIVE</b>
                  <span className="dm-greet">
                    {GREETINGS.map((word, i) => (
                      <em key={word} className={i === greet ? "is-on" : ""}>
                        {word}
                      </em>
                    ))}
                  </span>
                </span>
                <h1 className="dm-wordmark">
                  <span className="dm-wordmark-dot" />
                  dama
                </h1>
                <p className="dm-tagline">
                  <span>Enough care.</span>
                  <span>For every woman.</span>
                  <span className="dm-accent">
                    Everywhere.
                    <svg className="dm-scribble" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 13 C 60 4, 120 18, 180 9 S 270 6, 296 11" />
                    </svg>
                  </span>
                </p>
                <div className="dm-ctas">
                  <Link className="dm-btn dm-btn-terra" to="/dashboard">
                    Open dashboard
                  </Link>
                  <Link className="dm-btn dm-btn-line" to="/learn">
                    Ask Sira
                  </Link>
                </div>
              </div>
              <div className="dm-photo" data-cursor="Laafi">
                <span className="dm-photo-caption dm-ref">
                  Fig. 01
                  <br />
                  Mère et enfant
                </span>
                <img src="/mother-child.webp" alt="A smiling mother holding her baby" width="900" height="772" />
              </div>
            </div>
          </div>
          <div className="dm-band">
            <div className="dm-band-in">
              <span className="dm-ref">Built on data from</span>
              <div className="dm-mask">
                <div className="dm-track">
                  {[0, 1].map((copy) =>
                    ["DHS Burkina Faso 2021", "UNFPA", "WHO", "Ministère de la Santé", "ACLED", "OCHA"].map((name) => (
                      <span key={`${copy}-${name}`} aria-hidden={copy === 1 ? "true" : undefined}>
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- About board ---------- */}
        <section className="dm-board dm-outer">
          <div className="dm-board-in dm-patterned">
            <span className="dm-cross tl" />
            <span className="dm-cross tr" />
            <span className="dm-cross bl" />
            <span className="dm-cross br" />
            <p className="dm-ref dm-board-label">About Dama</p>
            <div className="dm-note">
              <span className="dm-pin p1" />
              <span className="dm-pin p2" />
              <p className="dm-ref dm-note-ref">Avis · Affiché au CSPS</p>
              <p className="dm-note-text">
                We turn health data into <u>the nearest open clinic</u>, a radio message in <u>her own language</u>, and a
                knock on the door from <u>someone she trusts</u>.
              </p>
              <Link className="dm-read" to="/dashboard">
                See the data
              </Link>
            </div>
            <div className="dm-floats">
              <div className="dm-fcard f1">
                <span className="dm-fk">Radio · 18:00</span>
                <span className="dm-chip">MOS</span>
                <p className="dm-fq">“Laafi bala, Dama Laafi yãmb saam.”</p>
              </div>
              <div className="dm-fcard f2">
                <span className="dm-fk">Ask Sira</span>
                <p className="dm-bubble me">Est-ce normal d’avoir des règles irrégulières ?</p>
                <p className="dm-bubble her">Oui, c’est très courant à ton âge 🌿</p>
              </div>
              <div className="dm-fcard f3">
                <span className="dm-fk">Locator</span>
                <p className="dm-fbig">CSPS le plus proche</p>
                <p className="dm-fsub">
                  <span className="dm-open">● Ouvert</span> · gratuit
                </p>
              </div>
              <div className="dm-fcard f4">
                <span className="dm-fk">Relay visit</span>
                <p className="dm-fbig">Visite ✓</p>
                <p className="dm-fsub">Suivi prénatal enregistré</p>
              </div>
              <span className="dm-flag g1">
                <Pointer />
                <b>Relais Communautaire</b>
              </span>
              <span className="dm-flag g2">
                <Pointer />
                <b>Sage-femme</b>
              </span>
              <span className="dm-flag g3">
                <Pointer />
                <b>Animatrice radio</b>
              </span>
            </div>
          </div>
        </section>

        {/* ---------- Stats ---------- */}
        <section className="dm-block">
          <div className="dm-wrap">
            <div className="dm-stats">
              <div className="dm-stat is-dark dm-patterned">
                <Arcs />
                <p className="dm-num">{scores.length ? critical : "–"}</p>
                <p>Provinces scoring above 85 right now</p>
                <span className="dm-ref">Dama model · live</span>
              </div>
              <div className="dm-stat">
                <p className="dm-num">{scores.length || "–"}</p>
                <p>Provinces scored for SRH vulnerability</p>
                <span className="dm-ref">Dama model · live</span>
              </div>
              <div className="dm-stat">
                <p className="dm-num">
                  500<sup>+</sup>
                </p>
                <p>Health facilities closed by conflict</p>
                <span className="dm-ref">Nord &amp; Est regions</span>
              </div>
              <div className="dm-stat">
                <p className="dm-num">263.8</p>
                <p>Maternal deaths per 100,000 live births</p>
                <span className="dm-ref">National estimate</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Priority + lead province ---------- */}
        <section className="dm-block">
          <div className="dm-wrap dm-cols">
            <div className="dm-minw">
              <div className="dm-head">
                <h2>Priority provinces</h2>
                <Link to="/dashboard">View all →</Link>
              </div>
              <div className="dm-card">
                <ul className="dm-rows">
                  {top.length ? (
                    top.slice(0, 4).map((row, idx) => (
                      <li key={row.province_id}>
                        <span className="dm-ref dm-n">{String(idx + 1).padStart(2, "0")}</span>
                        <div className="dm-minw">
                          <div className="dm-name">{row.province_name}</div>
                          <div className="dm-meta-line">
                            {row.region} · {riskLabel(row.top_risk_factor)}
                          </div>
                        </div>
                        <span className="dm-score">{row.vulnerability_score.toFixed(1)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="dm-empty">Loading live rankings…</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="dm-minw">
              <div className="dm-head">
                <h2>Most urgent</h2>
                <span className="dm-tag">{lead ? lead.province_name : "Live"}</span>
              </div>
              <div className="dm-panel dm-patterned">
                <Arcs />
                <span className="dm-ref">{lead ? `${lead.region} · score ${lead.vulnerability_score.toFixed(1)}` : "Loading"}</span>
                <ul>
                  <li>
                    <span className="k">Open CSPS</span>
                    <span className="v">{fmt(lead?.metrics?.number_of_open_csps)}</span>
                  </li>
                  <li>
                    <span className="k">Closed CSPS</span>
                    <span className="v">{fmt(lead?.metrics?.number_of_closed_csps)}</span>
                  </li>
                  <li>
                    <span className="k">Km to nearest CSPS</span>
                    <span className="v">{fmt(lead?.metrics?.distance_to_nearest_csps_km, 1)}</span>
                  </li>
                  <li>
                    <span className="k">Contraceptive stock</span>
                    <span className="v">{lead ? `${fmt(lead.metrics?.contraceptive_availability_pct)}%` : "–"}</span>
                  </li>
                </ul>
                {lead ? (
                  <Link className="dm-panel-link" to={`/radio/${lead.province_id}`}>
                    Write a radio script for {lead.province_name} →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Explore tiles ---------- */}
        <section className="dm-block">
          <div className="dm-wrap">
            <div className="dm-head">
              <h2>Explore Dama</h2>
              <span className="dm-tag">For communities</span>
            </div>
            <div className="dm-tiles">
              <Link className="dm-tile t-terra" to="/radio">
                <span className="dm-ref">/ radio</span>
                <h3>Radio</h3>
                <p>Weekly scripts in Mooré, French and English for each province.</p>
                <span className="go">Generate a script →</span>
              </Link>
              <Link className="dm-tile t-sand" to="/locator">
                <span className="dm-ref">/ locator</span>
                <h3>Locator</h3>
                <p>Find the nearest open CSPS, even offline.</p>
                <span className="go">Find a clinic →</span>
              </Link>
              <Link className="dm-tile t-clay" to="/learn">
                <span className="dm-ref">/ sira</span>
                <h3>Sira</h3>
                <p>Private answers to health questions. Nothing is stored.</p>
                <span className="go">Ask a question →</span>
              </Link>
              <Link className="dm-tile t-dark dm-patterned" to="/relay">
                <span className="dm-ref">/ relay</span>
                <h3>Relay</h3>
                <p>Visit lists and follow-ups for Relais Communautaires.</p>
                <span className="go">Open the portal →</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
