export default function PageHero({ eyebrow, line1, line2, intro }) {
  return (
    <section className="container page-hero">
      <div className="fade f1">
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <h1 className="h1" style={{ maxWidth: 1100 }}>
        <span className="line d1">
          <span>{line1}</span>
        </span>
        <span className="line d2">
          <span className="blue">{line2}</span>
        </span>
      </h1>
      {intro ? <p className="lead fade f2">{intro}</p> : null}
    </section>
  );
}
