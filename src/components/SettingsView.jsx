import { getWorkspaceLinkStatus } from "../workspaceLinks";

const CASES_FILTER_KEY = "cases";
const REQUESTS_FILTER_KEY = "requests";

export default function SettingsView({
  themeMode,
  onThemeModeChange,
  preferences,
  onPreferencesChange,
  onClearSavedState,
  workspaceLinks,
  onWorkspaceLinksChange,
}) {
  const ecosystemStatus = getWorkspaceLinkStatus(workspaceLinks, "partsDesk");
  const configuredCount = ecosystemStatus.filter((item) => item.configured).length;
  const siblingStatus = ecosystemStatus.filter((item) => !item.current);
  const configuredSiblingCount = siblingStatus.filter((item) => item.configured).length;
  const preflightChecks = [
    { label: "RouteDesk launcher ready", ready: Boolean(ecosystemStatus.find((item) => item.appKey === "routeDesk")?.configured) },
    { label: "FieldDesk launcher ready", ready: Boolean(ecosystemStatus.find((item) => item.appKey === "fieldDesk")?.configured) },
    { label: "Remember last case", ready: Boolean(preferences.rememberLastCase) },
    { label: "Restore last case on launch", ready: Boolean(preferences.restoreLastCaseOnLaunch) },
    { label: "Persist case filters", ready: Boolean(preferences.persistFilters[CASES_FILTER_KEY]) },
    { label: "Persist request filters", ready: Boolean(preferences.persistFilters[REQUESTS_FILTER_KEY]) },
  ];
  const criticalChecks = preflightChecks.filter((item) => item.label !== "Remember last case");
  const readyCount = preflightChecks.filter((item) => item.ready).length;
  const isPresentationReady = criticalChecks.every((item) => item.ready);
  const missingChecks = preflightChecks.filter((item) => !item.ready);

  return (
    <section className="panel settings-layout">
      <div>
        <p className="section-kicker">Operator preferences</p>
        <h2 className="settings-title">Settings</h2>
        <p className="settings-copy">Keep the parts workspace stable between sessions and reduce repeat operator setup.</p>
      </div>

      <div className="settings-grid">
        <article className="metric-card wide">
          <p className="section-kicker">Presentation preflight</p>
          <h2 className="settings-title">Readiness</h2>
          <p className="settings-copy">
            Check the parts workspace before you present it. This surfaces missing sibling launchers and unstable
            session-memory settings before they turn into live demo friction.
          </p>
          <div className="settings-grid">
            <div className="detail-value">
              <span>Overall status</span>
              <strong>{isPresentationReady ? "Ready for presentation" : "Needs attention"}</strong>
            </div>
            <div className="detail-value">
              <span>Checks passed</span>
              <strong>{readyCount} / {preflightChecks.length}</strong>
            </div>
            <div className="detail-value">
              <span>Sibling apps</span>
              <strong>{configuredSiblingCount} / {siblingStatus.length} linked</strong>
            </div>
            <div className="detail-value">
              <span>Case restore</span>
              <strong>{preferences.restoreLastCaseOnLaunch ? "Enabled" : "Disabled"}</strong>
            </div>
          </div>
          <div className="settings-grid">
            {preflightChecks.map((item) => (
              <div key={item.label} className="detail-value">
                <span>{item.label}</span>
                <strong>{item.ready ? "Ready" : "Missing"}</strong>
              </div>
            ))}
          </div>
          <p className="muted">
            Next fixes: {missingChecks.length > 0 ? missingChecks.map((item) => item.label).join(", ") : "none"}
          </p>
        </article>

        <article className="metric-card wide">
          <p>Appearance</p>
          <div className="theme-toggle-row">
            {[
              ["system", "System"],
              ["light", "Light"],
              ["dark", "Dark"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={themeMode === value ? "tab-button active" : "tab-button"}
                onClick={() => onThemeModeChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </article>

        <article className="metric-card wide">
          <p>Workspace memory</p>
          <div className="list-stack compact">
            <label className="check-field">
              <input
                type="checkbox"
                checked={preferences.rememberLastCase}
                onChange={(event) => onPreferencesChange({ ...preferences, rememberLastCase: event.target.checked })}
              />
              <span>Remember last selected case</span>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={preferences.restoreLastCaseOnLaunch}
                onChange={(event) => onPreferencesChange({ ...preferences, restoreLastCaseOnLaunch: event.target.checked })}
              />
              <span>Restore last case on launch</span>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={preferences.rememberLastRequest}
                onChange={(event) => onPreferencesChange({ ...preferences, rememberLastRequest: event.target.checked })}
              />
              <span>Remember last tracked request</span>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={preferences.restoreLastRequestOnLaunch}
                onChange={(event) => onPreferencesChange({ ...preferences, restoreLastRequestOnLaunch: event.target.checked })}
              />
              <span>Restore last tracked request on launch</span>
            </label>
          </div>
        </article>

        <article className="metric-card wide">
          <p>Saved filters</p>
          <div className="list-stack compact">
            <label className="check-field">
              <input
                type="checkbox"
                checked={preferences.persistFilters[CASES_FILTER_KEY]}
                onChange={(event) =>
                  onPreferencesChange({
                    ...preferences,
                    persistFilters: { ...preferences.persistFilters, [CASES_FILTER_KEY]: event.target.checked },
                  })
                }
              />
              <span>Persist case filters</span>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={preferences.persistFilters[REQUESTS_FILTER_KEY]}
                onChange={(event) =>
                  onPreferencesChange({
                    ...preferences,
                    persistFilters: { ...preferences.persistFilters, [REQUESTS_FILTER_KEY]: event.target.checked },
                  })
                }
              />
              <span>Persist request filters</span>
            </label>
          </div>
        </article>

        <article className="metric-card wide">
          <p>Reset</p>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={onClearSavedState}>
              Clear saved filters and selections
            </button>
          </div>
        </article>

        <article className="metric-card wide">
          <p>Ecosystem links</p>
          <p className="muted">
            {configuredCount} of {ecosystemStatus.length} workspaces configured.
          </p>
          <div className="settings-grid">
            <label className="field">
              <span>RouteDesk URL</span>
              <input
                value={workspaceLinks?.routeDeskUrl || ""}
                onChange={(event) => onWorkspaceLinksChange?.({ ...workspaceLinks, routeDeskUrl: event.target.value })}
                placeholder="route.example.com"
              />
            </label>
            <label className="field">
              <span>PartsDesk URL</span>
              <input
                value={workspaceLinks?.partsAppUrl || ""}
                onChange={(event) => onWorkspaceLinksChange?.({ ...workspaceLinks, partsAppUrl: event.target.value })}
                placeholder="parts.example.com"
              />
            </label>
            <label className="field">
              <span>FieldDesk URL</span>
              <input
                value={workspaceLinks?.fieldDeskUrl || ""}
                onChange={(event) => onWorkspaceLinksChange?.({ ...workspaceLinks, fieldDeskUrl: event.target.value })}
                placeholder="field.example.com"
              />
            </label>
          </div>
          <p className="muted">
            Bare domains are normalized to `https://`. Invalid or unsafe URLs stay hidden. Saved values override the
            launcher defaults seeded from your env file.
          </p>
          <div className="settings-grid">
            {ecosystemStatus.map((item) => (
              <div key={item.appKey} className="detail-value">
                <span>{item.label}</span>
                <strong>{item.current ? "Current app" : item.configured ? "Ready" : "Missing"}</strong>
                {item.href && !item.current ? (
                  <a className="button-link secondary-button" href={item.href} target="_blank" rel="noreferrer">
                    Open {item.label}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
