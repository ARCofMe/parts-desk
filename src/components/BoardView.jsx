export default function BoardView({
  board,
  loading,
  error,
  onOpenCases,
  onSync,
  onReconcile,
  syncState,
  onOpenCase,
  onOpenRequest,
  onRefresh,
}) {
  if (loading) return <section className="panel">Loading parts board…</section>;
  if (error && !board) return <section className="panel error-panel">{error}</section>;
  if (!board) return <section className="panel">Parts board is not loaded yet.</section>;

  const summary = board.queueSummary || {};
  const metrics = board.caseMetrics || {};
  const briefItems = fulfillmentBrief(board);
  const openCases = asArray(board.openCases);
  const openTrackedRequests = asArray(board.openTrackedRequests);

  return (
    <section className="panel board-layout">
      <div className="section-head">
        <div>
          <p className="section-kicker">Parts board</p>
          <h2>Queue status</h2>
        </div>
        <div className="action-row">
          <button type="button" onClick={onRefresh}>Refresh</button>
          <button type="button" onClick={onOpenCases}>Open cases</button>
          <button type="button" onClick={onSync}>Sync</button>
          <button type="button" onClick={onReconcile}>Reconcile</button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {syncState && <p className={syncState.error ? "error-text" : "muted"}>{syncState.message}</p>}

      <div className="board-grid secondary">
        <article className="metric-card wide command-brief">
          <div className="section-head compact">
            <div>
              <p className="section-kicker">Parts fulfillment brief</p>
              <h2>Clear the blockers first</h2>
            </div>
            <button type="button" onClick={onOpenCases}>Open cases</button>
          </div>
          <div className="brief-grid">
            {briefItems.map((item) => (
              <div key={item.label} className="brief-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="board-grid">
        <Metric label="Total requests" value={summary.totalRequests} />
        <Metric label="Open requests" value={summary.openRequests} />
        <Metric label="Assigned requests" value={summary.assignedRequests} />
        <Metric label="Unassigned requests" value={summary.unassignedRequests} />
        <Metric label="Synced requests" value={summary.syncedRequests} />
        <Metric label="Resolved requests" value={summary.resolvedCount} />
      </div>

      <div className="board-grid secondary">
        <article className="metric-card wide">
          <p>Case stages</p>
          <div className="chip-list">
            {Object.entries(metrics.stageCounts || {}).map(([key, value]) => (
              <span className="queue-chip" key={key}>{key.replaceAll("_", " ")}: {value}</span>
            ))}
          </div>
        </article>
        <article className="metric-card wide">
          <p>Case ownership</p>
          <div className="chip-list">
            <span className="queue-chip">Assigned: {metrics.assignedCases ?? 0}</span>
            <span className="queue-chip">Unassigned: {metrics.unassignedCases ?? 0}</span>
          </div>
        </article>
      </div>

      <div className="board-columns">
        <article className="detail-panel">
          <div className="section-head compact">
            <div>
              <p className="section-kicker">Open cases</p>
              <h2>Needs parts action</h2>
            </div>
            <button type="button" onClick={onOpenCases}>View all</button>
          </div>
          <div className="list-stack">
            {openCases.slice(0, 8).map((item) => (
              <button key={item.caseId} type="button" className="attention-card" onClick={() => onOpenCase?.(item.reference)}>
                <div className="attention-card-top">
                  <strong>{item.reference}</strong>
                  <span>{item.stageLabel || item.stage}</span>
                </div>
                <p>{item.nextAction || item.latestStatusText || "No next action yet."}</p>
                <div className="attention-card-meta">
                  <span>Age: {item.ageBucket || "n/a"}</span>
                  <span>Owner: {item.assignedPartsLabel || "unassigned"}</span>
                </div>
              </button>
            ))}
            {!openCases.length && <p className="muted">No open parts cases right now.</p>}
          </div>
        </article>

        <article className="detail-panel">
          <div className="section-head compact">
            <div>
              <p className="section-kicker">Tracked requests</p>
              <h2>Open queue</h2>
            </div>
          </div>
          <div className="list-stack">
            {openTrackedRequests.slice(0, 8).map((item) => (
              <button key={item.requestId} type="button" className="attention-card" onClick={() => onOpenRequest?.(item.requestId)}>
                <div className="attention-card-top">
                  <strong>#{item.requestId} {item.reference}</strong>
                  <span>{item.status}</span>
                </div>
                <p>{item.description}</p>
                <div className="attention-card-meta">
                  <span>Case: {item.caseStageLabel || item.caseStage}</span>
                  <span>Assigned: {item.assignedPartsLabel || "unassigned"}</span>
                </div>
              </button>
            ))}
            {!openTrackedRequests.length && <p className="muted">No tracked requests right now.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function fulfillmentBrief(board) {
  const summary = board?.queueSummary || {};
  const metrics = board?.caseMetrics || {};
  const topCase = asArray(board?.openCases)[0];
  const topRequest = asArray(board?.openTrackedRequests)[0];
  const stageCounts = Object.entries(metrics.stageCounts || {}).sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
  const hotStage = stageCounts[0];
  const items = [];

  if (Number(summary.unassignedRequests || 0) > 0) {
    items.push({
      label: "Unassigned",
      value: String(summary.unassignedRequests),
      detail: "Claim or assign these before they disappear into the queue.",
    });
  }

  if (topCase) {
    items.push({
      label: "First case",
      value: topCase.reference,
      detail: topCase.nextAction || topCase.latestStatusText || topCase.stageLabel || "Open case",
    });
  }

  if (hotStage) {
    items.push({
      label: "Hot stage",
      value: hotStage[0].replaceAll("_", " "),
      detail: `${hotStage[1]} case${Number(hotStage[1]) === 1 ? "" : "s"} in this stage`,
    });
  }

  if (topRequest) {
    items.push({
      label: "Next request",
      value: `#${topRequest.requestId}`,
      detail: `${topRequest.reference || "No SR"} · ${topRequest.description || topRequest.status || "Open request"}`,
    });
  }

  if (!items.length) {
    items.push({
      label: "Queue state",
      value: "Clean",
      detail: "No open request or case blockers detected.",
    });
  }

  return items.slice(0, 4);
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value ?? 0}</strong>
    </article>
  );
}
