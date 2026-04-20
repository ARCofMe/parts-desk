const PRODUCT_LABELS = {
  opsHub: "Ops Hub",
  routeDesk: "RouteDesk",
  fieldDesk: "FieldDesk",
  partsDesk: "PartsDesk",
};

const MARKS = {
  opsHub: (
    <>
      <circle className="brand-logo-node accent" cx="32" cy="16" r="6" />
      <circle className="brand-logo-node signal" cx="17" cy="43" r="6" />
      <circle className="brand-logo-node signal" cx="47" cy="43" r="6" />
      <path className="brand-logo-line" d="M32 22v12M22 40l8-5M42 40l-8-5" />
      <path className="brand-logo-stroke" d="M32 25 17 34v17l15 9 15-9V34z" />
      <circle className="brand-logo-stroke" cx="32" cy="43" r="7" />
    </>
  ),
  routeDesk: (
    <>
      <circle className="brand-logo-node signal" cx="17" cy="18" r="7" />
      <circle className="brand-logo-node accent" cx="47" cy="18" r="7" />
      <circle className="brand-logo-node accent" cx="25" cy="46" r="7" />
      <path className="brand-logo-line" d="M22 20h15M42 23 30 39M22 43H9" />
      <path className="brand-logo-stroke" d="M9 50c7 4 20 4 29 0M10 39c8-5 19-5 28 0" />
      <path className="brand-logo-stroke" d="M47 27v15h8" />
    </>
  ),
  fieldDesk: (
    <>
      <path className="brand-logo-fill-soft" d="M32 5 52 13v18c0 14-8 23-20 28-12-5-20-14-20-28V13z" />
      <path className="brand-logo-stroke" d="M32 5 52 13v18c0 14-8 23-20 28-12-5-20-14-20-28V13z" />
      <path className="brand-logo-stroke" d="M20 39c7-5 17-5 24 0M22 46c6-3 14-3 20 0" />
      <path className="brand-logo-fill" d="M32 15c-6 0-11 5-11 11 0 8 11 18 11 18s11-10 11-18c0-6-5-11-11-11z" />
      <circle className="brand-logo-cutout" cx="32" cy="26" r="4" />
      <circle className="brand-logo-node accent" cx="18" cy="22" r="4" />
      <circle className="brand-logo-node accent" cx="46" cy="22" r="4" />
    </>
  ),
  partsDesk: (
    <>
      <path className="brand-logo-stroke" d="M13 31 32 22l19 9v18l-19 9-19-9z" />
      <path className="brand-logo-line" d="m13 31 19 9 19-9M32 40v18" />
      <path className="brand-logo-fill" d="M24 12 32 9l8 3v9l-8 4-8-4z" />
      <path className="brand-logo-fill-soft" d="M13 27 24 22l8 4v11l-11-5-8 4z" />
      <path className="brand-logo-fill-soft" d="M51 27 40 22l-8 4v11l11-5 8 4z" />
      <circle className="brand-logo-node accent" cx="15" cy="20" r="3" />
      <circle className="brand-logo-node signal" cx="49" cy="20" r="3" />
    </>
  ),
};

export default function BrandLogo({ product = "opsHub", lockup = false, className = "" }) {
  const label = PRODUCT_LABELS[product] ?? PRODUCT_LABELS.opsHub;
  const classes = ["brand-logo", lockup ? "brand-logo-lockup" : "", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-label={label}>
      <svg className="brand-logo-mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
        {MARKS[product] ?? MARKS.opsHub}
      </svg>
      {lockup ? <span className="brand-logo-word">{label}</span> : null}
    </span>
  );
}
