import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopNav from "../components/TopNav";

import { API_BASE } from "../lib/api";

const scriptOrder = [
  ["opening", "Opening Greeting"],
  ["district_update", "District Update"],
  ["nearest_facility", "Nearest Open CSPS"],
  ["services_available", "Available Services"],
  ["chw_contact", "CHW Contact"],
  ["srh_tip", "Weekly SRH Health Tip"],
  ["qr_announcement", "QR Code Announcement"],
  ["closing", "Closing"],
];

function TypewriterBlock({ text, speed = 16 }) {
  const [visible, setVisible] = useState("");
  const safeText = typeof text === "string" ? text : String(text ?? "");

  useEffect(() => {
    setVisible("");
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setVisible(safeText.slice(0, index));
      if (index >= safeText.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [safeText, speed]);

  return <p className="script-text">{visible}</p>;
}

function ScriptCard({ title, script }) {
  return (
    <section className="card script-card">
      <h2 className="script-title">
        {title}
      </h2>
      <div className="script-body">
        {scriptOrder.map(([key, label]) => (
          <div key={key} className="script-section">
            <h3 className="script-label">{label}</h3>
            <TypewriterBlock text={script?.[key] ?? "..."} />
          </div>
        ))}
      </div>
    </section>
  );
}

function BroadcastCalendar({ provinceName }) {
  const today = new Date();
  const slots = Array.from({ length: 4 }, (_, index) => {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + (index + 1) * 2);
    return {
      id: index + 1,
      label: nextDate.toLocaleDateString(),
      slot: index % 2 === 0 ? "07:30" : "18:00",
    };
  });

  return (
    <div>
      <h3 className="radio-bottom-title">
        Broadcast Schedule
      </h3>
      {slots.map((slot) => (
        <div key={slot.id} className="radio-schedule-row">
          <span>{slot.label}</span>
          <span>{slot.slot}</span>
          <span>{provinceName || "Province TBD"}</span>
        </div>
      ))}
    </div>
  );
}

export default function RadioPortal() {
  const { provinceId } = useParams();
  const [selectedProvince, setSelectedProvince] = useState(provinceId || "1");
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [scriptData, setScriptData] = useState(null);
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Generate a script to brief this week's broadcast team.");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/vulnerability/scores`)
      .then((res) => res.json())
      .then((json) => {
        const options = json.features
          .map((feature) => feature.properties)
          .sort((a, b) => a.province_name.localeCompare(b.province_name));
        setProvinceOptions(options);
        setErrorText("");
      })
      .catch((error) => console.error("Failed to load province options", error));
  }, []);

  useEffect(() => {
    if (!provinceId) return;
    setSelectedProvince(provinceId);
  }, [provinceId]);

  const selectedProvinceName = useMemo(
    () => provinceOptions.find((p) => String(p.province_id) === String(selectedProvince))?.province_name,
    [provinceOptions, selectedProvince]
  );

  const handleGenerateScript = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/radio/script/${selectedProvince}`);
      if (!response.ok) throw new Error("Radio script request failed");
      const data = await response.json();
      const normalizedData = {
        ...data,
        english_script: data.english_script || null,
        french_script: data.french_script || null,
        moore_script: data.moore_script || null,
      };
      setScriptData(normalizedData);
      setArchive((prev) => [
        {
          id: `${data.province_id}-${data.generated_at}`,
          generatedAt: data.generated_at,
          provinceName: data.province_name,
          topRiskFactor: data.top_risk_factor,
        },
        ...prev.slice(0, 7),
      ]);
      setStatusText(
        `Script generated for ${data.province_name}. Use this as the production brief for radio coordinators and relay messaging.`
      );
      if (!data.english_script) {
        setErrorText(
          "English script is missing from the API response. Restart the backend to load the latest radio endpoint changes."
        );
      } else {
        setErrorText("");
      }
    } catch (error) {
      console.error("Script generation failed", error);
      setErrorText("We could not generate a script right now. Please verify backend availability and retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TopNav />
      <div className="page-shell radio-page">
        <div className="container radio-inner">
          <header className="card radio-header">
            <div>
              <h1 className="radio-title">
                Radio Intelligence Portal
              </h1>
              <p className="radio-subtitle">
                Generate detailed district scripts that translate vulnerability data into confident, broadcast-ready SRH
                guidance.
              </p>
            </div>
            <div className="radio-controls">
              <select
                value={selectedProvince}
                onChange={(event) => setSelectedProvince(event.target.value)}
                className="radio-select"
              >
                {provinceOptions.map((option) => (
                  <option key={option.province_id} value={option.province_id}>
                    {option.province_name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleGenerateScript} className="btn-primary" disabled={loading}>
                {loading ? "Generating..." : "Generate Script"}
              </button>
              <Link className="btn-secondary" to="/dashboard">
                Dashboard
              </Link>
            </div>
          </header>
          <p className="radio-small">{statusText}</p>
          {errorText ? <p className="alert alert-error">{errorText}</p> : null}

          <main className="radio-grid">
            <ScriptCard title="English Script" script={scriptData?.english_script} />
            <ScriptCard title="French Script" script={scriptData?.french_script} />
            <ScriptCard title="Mooré Script" script={scriptData?.moore_script} />
          </main>

          <section className="radio-bottom">
            <div className="card radio-bottom-card">
              <h3 className="radio-bottom-title">
                Production Actions
              </h3>
              <button type="button" className="btn-primary" onClick={() => window.print()}>
                Download as PDF
              </button>
              <p className="radio-small">
                District: <strong>{selectedProvinceName || "N/A"}</strong>
              </p>
            </div>

            <div className="card radio-bottom-card">
              <BroadcastCalendar provinceName={selectedProvinceName} />
            </div>

            <div className="card radio-bottom-card">
              <h3 className="radio-bottom-title">
                Script Archive
              </h3>
              <div className="archive-list">
                {archive.length === 0 && <p className="radio-small">No generated scripts yet.</p>}
                {archive.map((item) => (
                  <div key={item.id} className="archive-item">
                    <span>{item.provinceName}</span>
                    <span>{new Date(item.generatedAt).toLocaleString()}</span>
                    <span>{item.topRiskFactor.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
