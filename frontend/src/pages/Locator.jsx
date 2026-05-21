import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";

import { API_BASE } from "../lib/api";
const CACHE_PREFIX = "dama_locator_facilities_";

export default function Locator() {
  const [provinceId, setProvinceId] = useState("1");
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [statusText, setStatusText] = useState("Checking nearest facilities for the selected province.");

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/vulnerability/scores`)
      .then((res) => res.json())
      .then((json) =>
        setProvinceOptions(
          json.features.map((f) => ({
            province_id: String(f.properties.province_id),
            province_name: f.properties.province_name,
          }))
        )
      );
  }, []);

  useEffect(() => {
    const cacheKey = `${CACHE_PREFIX}${provinceId}`;
    fetch(`${API_BASE}/api/locator/facilities/${provinceId}`)
      .then((res) => res.json())
      .then((data) => {
        setFacilities(data.facilities);
        localStorage.setItem(cacheKey, JSON.stringify(data.facilities));
        setStatusText(
          `Loaded ${data.facilities.length} facilities for this district profile. Share this screen directly during outreach visits.`
        );
      })
      .catch(() => {
        const cached = localStorage.getItem(cacheKey);
        setFacilities(cached ? JSON.parse(cached) : []);
      });
  }, [provinceId]);

  const nearest = facilities[0];
  const secondary = useMemo(() => facilities.slice(1, 3), [facilities]);

  return (
    <>
      <TopNav />
      <main className="page-shell locator-page">
        <div className="container locator-inner">
          <div className="mobile-center">
            <header className="locator-top">
              <h1 className="locator-title">Community Locator</h1>
              <Link className="btn-secondary" to="/dashboard">
                Dashboard
              </Link>
            </header>
            <p className="helper-box">{statusText}</p>
            {offline ? <p className="helper-box">Offline mode active. Cached facility data will be used when needed.</p> : null}

            <label className="label">
              Province
            </label>
            <select className="locator-select" value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
              {provinceOptions.map((option) => (
                <option key={option.province_id} value={option.province_id}>
                  {option.province_name}
                </option>
              ))}
            </select>

            <section className="card locator-card">
              <h2 className="locator-section-title">
                Nearest CSPS
              </h2>
              {nearest ? (
                <>
                  <h3>{nearest.name}</h3>
                  <p className="radio-small">{nearest.distance_km} km away</p>
                  <span className={`status-pill ${nearest.is_open ? "status-low" : "status-high"}`}>
                    {nearest.is_open ? "Open today" : "Temporarily closed"}
                  </span>
                  <p>Services: {nearest.services.join(", ")}</p>
                  <a className="btn-primary" href={`tel:${nearest.chw_contact.replace(/\s+/g, "")}`}>
                    Call CHW Contact
                  </a>
                </>
              ) : (
                <p>No facility data available.</p>
              )}
            </section>

            <section className="locator-other-section">
              <h3 className="label locator-other-label">
                Other Facilities
              </h3>
              <div className="locator-other-grid">
                {secondary.map((item) => (
                  <article className="card locator-other-card" key={item.facility_id}>
                    <strong>{item.name}</strong>
                    <p className="radio-small">{item.distance_km} km away</p>
                    <span className={`status-pill ${item.is_open ? "status-low" : "status-high"}`}>
                      {item.is_open ? "Open" : "Closed"}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
