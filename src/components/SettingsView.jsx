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
  return (
    <section className="panel settings-layout">
      <div>
        <p className="section-kicker">Operator preferences</p>
        <h2 className="settings-title">Settings</h2>
        <p className="settings-copy">Keep the parts workspace stable between sessions and reduce repeat operator setup.</p>
      </div>

      <div className="settings-grid">
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
          <div className="settings-grid">
            <label className="field">
              <span>RouteDesk URL</span>
              <input
                value={workspaceLinks?.routeDeskUrl || ""}
                onChange={(event) => onWorkspaceLinksChange?.({ ...workspaceLinks, routeDeskUrl: event.target.value })}
                placeholder="https://route.example.com"
              />
            </label>
            <label className="field">
              <span>PartsApp URL</span>
              <input
                value={workspaceLinks?.partsAppUrl || ""}
                onChange={(event) => onWorkspaceLinksChange?.({ ...workspaceLinks, partsAppUrl: event.target.value })}
                placeholder="https://parts.example.com"
              />
            </label>
            <label className="field">
              <span>FieldDesk URL</span>
              <input
                value={workspaceLinks?.fieldDeskUrl || ""}
                onChange={(event) => onWorkspaceLinksChange?.({ ...workspaceLinks, fieldDeskUrl: event.target.value })}
                placeholder="https://field.example.com"
              />
            </label>
          </div>
        </article>
      </div>
    </section>
  );
}
