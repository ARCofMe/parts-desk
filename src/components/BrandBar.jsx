import { getWorkspaceLinkStatus } from "../workspaceLinks";
import BrandLogo from "../brand/BrandLogo";
import Icon from "./Icon";

const WORKSPACE_ICONS = {
  opsHub: "brain",
  routeDesk: "route",
  partsDesk: "parts",
  fieldDesk: "field",
};

export default function BrandBar({ appName = "PartsDesk", workspaceLinks = {}, currentApp = "partsDesk" }) {
  const workspaces = getWorkspaceLinkStatus(workspaceLinks, currentApp);

  return (
    <header className="brand-bar">
      <div className="brand-bar-top">
        <div className="brand-identity">
          <div className="brand-mark-card" aria-hidden="true">
            <BrandLogo product="partsDesk" />
          </div>
          <div>
            <p className="brand-kicker">OpsHub ecosystem</p>
            <h1 className="brand-wordmark">
              <span className="brand-wordmark-primary">Parts</span>
              <span className="brand-wordmark-accent">{appName.replace(/^Parts/, "") || "App"}</span>
            </h1>
          </div>
        </div>
        <div className="brand-context">
          <span className="status-pill">
            <Icon name="brain" className="pill-icon" />
            OpsHub brain
          </span>
          <span className="queue-chip">
            <Icon name="parts" className="pill-icon" />
            Inventory control
          </span>
        </div>
      </div>
      <p className="brand-copy">
        Parts control for requests, receipts, recommendations, and inventory handoffs.
      </p>
      <div className="brand-link-row">
        {workspaces.map(({ appKey, label, href, current }) =>
          current ? (
            <span key={appKey} className="queue-chip">
              <Icon name={WORKSPACE_ICONS[appKey] ?? "parts"} className="pill-icon" />
              {label}
            </span>
          ) : href ? (
            <a key={appKey} className="button-link secondary-button" href={href} target="_blank" rel="noreferrer">
              <Icon name={WORKSPACE_ICONS[appKey] ?? "external"} className="button-icon" />
              Open {label}
            </a>
          ) : null,
        )}
      </div>
    </header>
  );
}
