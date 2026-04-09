const WORKSPACES = [
  ["routeDesk", "RouteDesk", "routeDeskUrl"],
  ["partsApp", "PartsApp", "partsAppUrl"],
  ["fieldDesk", "FieldDesk", "fieldDeskUrl"],
];

function safeWorkspaceUrl(value) {
  const trimmed = String(value || "").trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

export default function BrandBar({ appName = "PartsApp", workspaceLinks = {}, currentApp = "partsApp" }) {
  return (
    <header className="brand-bar">
      <div className="brand-bar-top">
        <div>
          <p className="brand-kicker">OpsHub ecosystem</p>
          <h1 className="brand-wordmark">
            <span className="brand-wordmark-primary">Parts</span>
            <span className="brand-wordmark-accent">{appName.replace(/^Parts/, "") || "App"}</span>
          </h1>
        </div>
        <div className="brand-context">
          <span className="status-pill">OpsHub brain</span>
          <span className="queue-chip">Inventory control</span>
        </div>
      </div>
      <p className="brand-copy">
        Right part. Right time. Track requests, push receipts through, and keep dispatch from waiting on hidden parts state.
      </p>
      <div className="brand-link-row">
        {WORKSPACES.map(([key, label, linkKey]) =>
          key === currentApp ? (
            <span key={key} className="queue-chip">
              {label}
            </span>
          ) : safeWorkspaceUrl(workspaceLinks?.[linkKey]) ? (
            <a
              key={key}
              className="button-link secondary-button"
              href={safeWorkspaceUrl(workspaceLinks?.[linkKey])}
              target="_blank"
              rel="noreferrer"
            >
              Open {label}
            </a>
          ) : null
        )}
      </div>
    </header>
  );
}
