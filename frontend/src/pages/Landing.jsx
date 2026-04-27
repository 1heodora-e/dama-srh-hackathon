import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";

export default function Landing() {
  return (
    <>
      <TopNav />
      <div className="page-shell landing-page">
        <section className="hero">
          <div className="hero-grain" />
          <div className="container hero-inner">
            <div className="hero-logo-mark" />
            <h1 className="hero-title">
              Enough care.
              <br />
              For every woman.
              <br />
              Everywhere.
            </h1>
            <p className="hero-subtitle">
              An SRH equity intelligence platform connecting Burkina Faso&apos;s health planners with the communities
              they serve.
            </p>
            <div className="hero-actions">
              <Link className="btn-primary" to="/dashboard">
                View Dashboard →
              </Link>
              <a className="btn-ghost" href="#problem">
                Learn More
              </a>
            </div>
            <span className="hero-scroll">Scroll to explore</span>
          </div>
        </section>

        <section id="problem" className="section-sand">
          <div className="container">
            <p className="label label-terracotta">
              The Challenge
            </p>
            <h2 className="section-title">
              Burkina Faso&apos;s SRH crisis isn&apos;t an awareness problem. It&apos;s a supply intelligence problem.
            </h2>
            <div className="stat-grid">
              <article className="card stat-card">
                <strong className="stat-value">
                  500+
                </strong>
                <p className="stat-text">Health facilities closed due to conflict</p>
              </article>
              <article className="card stat-card">
                <strong className="stat-value">
                  263.8
                </strong>
                <p className="stat-text">Maternal deaths per 100,000 live births</p>
              </article>
              <article className="card stat-card">
                <strong className="stat-value">
                  2M+
                </strong>
                <p className="stat-text">People urgently needing healthcare access</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-white">
          <div className="container">
            <p className="label label-terracotta">
              The System
            </p>
            <h2 className="section-title">
              Two layers. One feedback loop.
            </h2>
            <div className="feature-grid">
              {features.map((feature) => (
                <article key={feature.title} className="card feature-card">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3 className="feature-title">
                    {feature.title}
                  </h3>
                  <p className="feature-text">{feature.description}</p>
                </article>
              ))}
            </div>
            <div className="card loop-card">
              Equity Map → Radio Script → Community Access → Interaction Data → Updated Equity Map
            </div>
          </div>
        </section>

        <section className="section-dark">
          <div className="container">
            <h2 className="section-title section-title-light section-title-bottom-gap">
              Built for Burkina Faso. Not adapted for it.
            </h2>
            <div className="local-grid">
              <div>
                <h3 className="local-title">Speaks Mooré</h3>
                <p className="local-text">Multilingual intelligence built from the ground up.</p>
              </div>
              <div>
                <h3 className="local-title">Knows the CSPS</h3>
                <p className="local-text">Aligned with existing health infrastructure and district workflows.</p>
              </div>
              <div>
                <h3 className="local-title">Conflict-aware</h3>
                <p className="local-text">Maps service disruption and prioritizes vulnerable populations.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-cta">
          <div className="container cta-center">
            <h2 className="cta-headline">
              See Dama in action
            </h2>
            <Link className="btn-secondary btn-secondary-invert" to="/dashboard">
              Open Dashboard
            </Link>
          </div>
        </section>

        <footer className="footer">
          <div className="container footer-inner">
            <div>
              <h3 className="footer-wordmark">
                dama
              </h3>
              <p className="footer-tagline">Assez de soins. Pour chaque femme. Partout.</p>
              <p className="footer-meta">
                Built for CRA Public Sector Innovation Hackathon 2026
              </p>
            </div>
            <div className="footer-links">
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/radio">Radio</Link>
              <Link to="/locator">Locator</Link>
              <Link to="/relay">Relay</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const features = [
  {
    icon: "◉",
    title: "Equity Intelligence Engine",
    description: "ML vulnerability scoring that gives policymakers district-level clarity on service gaps.",
  },
  {
    icon: "◌",
    title: "Radio Intelligence System",
    description: "District-specific SRH broadcast scripts that translate intelligence into weekly messaging.",
  },
  {
    icon: "◎",
    title: "Community Facility Locator",
    description: "QR-powered locator that helps women find the nearest CSPS and services.",
  },
  {
    icon: "◍",
    title: "Relais Communautaire Portal",
    description: "Field capture interface for relay workers collecting anonymized demand signals.",
  },
];

