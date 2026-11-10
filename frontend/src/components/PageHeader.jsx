/** Framed, patterned-brown page header shared by inner pages. */
export default function PageHeader({ refLeft, refRight, title, subtitle, audience, children }) {
  return (
    <section className="dm-outer dm-page-header">
      <div className="dm-frame dm-patterned">
        <span className="dm-cross tl" />
        <span className="dm-cross tr" />
        <span className="dm-cross bl" />
        <span className="dm-cross br" />
        <div className="dm-meta">
          <span className="dm-ref">{refLeft}</span>
          {refRight ? <span className="dm-ref">{refRight}</span> : null}
        </div>
        <div className="dm-page-header-body">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
          {audience ? (
            <span className="dm-audience">
              <b>For</b>
              {audience}
            </span>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}
