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
}) {
  if (loading) return <section className="panel">Loading parts board…</section>;
  if (error) return <section className="panel error-panel">{error}</section>;
  if (!board) return <section className="panel">Parts board is not loaded yet.</section>;

  const summary = board.queueSummary || {};
  const metrics = board.caseMetrics || {};

  return (
    <section className="panel board-layout">
      <div className="section-head">
        <div>
          <p className="section-kicker">Parts board</p>
          <h2>Queue status</h2>
        </div>
        <div className="action-row">
          <button type="button" onClick={onOpenCases}>Open cases</button>
          <button type="button" onClick={onSync}>Sync</button>
          <button type="button" onClick={onReconcile}>Reconcile</button>
        </div>
      </div>

      {syncState && <p className={syncState.error ? "error-text" : "muted"}>{syncState.message}</p>}

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
            {(board.openCases || []).slice(0, 8).map((item) => (
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
            {!(board.openCases || []).length && <p className="muted">No open parts cases right now.</p>}
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
            {(board.openTrackedRequests || []).slice(0, 8).map((item) => (
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
            {!(board.openTrackedRequests || []).length && <p className="muted">No tracked requests right now.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value ?? 0}</strong>
    </article>
  );
}
