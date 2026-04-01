import { useMemo, useState } from "react";

const DEFAULT_FILTERS = {
  stage: "",
  age: "",
  status: "",
  reference: "",
};

export default function CasesView({
  items,
  loading,
  error,
  onRefresh,
  onSelectCase,
  selectedCase,
  selectedCaseDetail,
  detailLoading,
  actionState,
  onCaseAction,
  onOpenRequests,
  onOpenRequest,
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const visibleItems = useMemo(() => {
    return (items || []).filter((item) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const current = item?.[key] ?? "";
        return String(current).toLowerCase().includes(value.toLowerCase());
      })
    );
  }, [filters, items]);

  return (
    <section className="panel attention-layout">
      <div className="attention-column">
        <div className="attention-toolbar">
          <div className="filter-grid">
            {Object.keys(DEFAULT_FILTERS).map((key) => (
              <label className="field" key={key}>
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <input
                  value={filters[key]}
                  onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={key === "reference" ? "SR-1234" : ""}
                />
              </label>
            ))}
          </div>
          <div className="action-row">
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</button>
            <button type="button" onClick={onRefresh}>Refresh</button>
          </div>
        </div>

        {loading && <p>Loading parts cases…</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="list-stack">
          {visibleItems.map((item) => (
            <button
              key={item.caseId}
              type="button"
              className={selectedCase?.reference === item.reference ? "attention-card selected" : "attention-card"}
              onClick={() => onSelectCase(item)}
            >
              <div className="attention-card-top">
                <strong>{item.reference}</strong>
                <span>{item.stageLabel || item.stage}</span>
              </div>
              <p>{item.nextAction || item.latestStatusText || "No next action text yet."}</p>
              <div className="attention-card-meta">
                <span>Status: {item.status}</span>
                <span>Age: {item.ageBucket || "n/a"}</span>
                <span>Owner: {item.assignedPartsLabel || "unassigned"}</span>
              </div>
            </button>
          ))}
          {!visibleItems.length && !loading && !error && <p className="muted">No parts cases match the current filters.</p>}
        </div>
      </div>

      <CaseDetail
        detail={selectedCaseDetail}
        loading={detailLoading}
        actionState={actionState}
        onCaseAction={onCaseAction}
        onOpenRequests={onOpenRequests}
        onOpenRequest={onOpenRequest}
      />
    </section>
  );
}

function CaseDetail({ detail, loading, actionState, onCaseAction, onOpenRequests, onOpenRequest }) {
  const [eta, setEta] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [orderedVendor, setOrderedVendor] = useState("");
  const [orderedEta, setOrderedEta] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [readyNote, setReadyNote] = useState("");

  if (loading) {
    return <aside className="detail-panel"><p className="muted">Loading parts case…</p></aside>;
  }
  if (!detail?.case) {
    return <aside className="detail-panel"><p className="muted">Select a parts case to inspect tracked requests and timeline.</p></aside>;
  }

  const item = detail.case;

  return (
    <aside className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="section-kicker">Parts case</p>
          <h3>{item.reference}</h3>
        </div>
        <span className="status-pill">{item.stageLabel || item.stage}</span>
      </div>

      <div className="detail-grid">
        <Detail label="Status" value={item.status} />
        <Detail label="Assigned" value={item.assignedPartsLabel || "unassigned"} />
        <Detail label="Technician" value={item.technicianLabel || "n/a"} />
        <Detail label="Age" value={item.ageBucket || "n/a"} />
      </div>

      <div className="chip-list detail-block">
        <span className="queue-chip">Updated: {item.updatedAt || "unknown"}</span>
        <span className="queue-chip">Open requests: {(item.openRequestIds || []).length}</span>
      </div>

      <div className="detail-block">
        <strong>Next action</strong>
        <p>{item.nextAction || "No next action yet."}</p>
        {item.blocker && <p className="error-text">Blocker: {item.blocker}</p>}
        {item.latestIssueText && <p className="muted">Issue: {item.latestIssueText}</p>}
        {item.latestStatusText && <p className="muted">Latest status: {item.latestStatusText}</p>}
      </div>

      <div className="detail-block">
        <strong>Ordering update</strong>
        <div className="inline-form-row">
          <label className="field slim">
            <span>Vendor</span>
            <input value={orderedVendor} onChange={(event) => setOrderedVendor(event.target.value)} placeholder="Marcone" />
          </label>
          <label className="field slim">
            <span>ETA</span>
            <input value={orderedEta} onChange={(event) => setOrderedEta(event.target.value)} placeholder="2026-04-05" />
          </label>
          <button
            type="button"
            onClick={() => onCaseAction(item.srId, "ordered", { vendor: orderedVendor, eta: orderedEta, details: "Part order posted from parts app." })}
          >
            Mark ordered
          </button>
        </div>
      </div>

      <div className="inline-form-row">
        <label className="field slim">
          <span>ETA</span>
          <input value={eta} onChange={(event) => setEta(event.target.value)} placeholder="2026-04-05" />
        </label>
        <button type="button" onClick={() => onCaseAction(item.srId, "eta", { eta, details: "ETA updated from parts app." })}>
          Post ETA
        </button>
      </div>

      <div className="inline-form-row">
        <label className="field slim">
          <span>Tracking</span>
          <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="1Z..." />
        </label>
        <label className="field slim">
          <span>Carrier</span>
          <input value={trackingCarrier} onChange={(event) => setTrackingCarrier(event.target.value)} placeholder="UPS" />
        </label>
        <button
          type="button"
          onClick={() => onCaseAction(item.srId, "tracking", { trackingNumber, carrier: trackingCarrier, details: "Tracking updated from parts app." })}
        >
          Post tracking
        </button>
      </div>

      <div className="inline-form-row">
        <label className="field slim">
          <span>Received from</span>
          <input value={receivedFrom} onChange={(event) => setReceivedFrom(event.target.value)} placeholder="UPS dock" />
        </label>
        <button type="button" onClick={() => onCaseAction(item.srId, "received", { details: "Part received and ready for verification.", receivedFrom })}>
          Mark received
        </button>
      </div>

      <div className="inline-form-row">
        <label className="field slim">
          <span>Ready note</span>
          <input value={readyNote} onChange={(event) => setReadyNote(event.target.value)} placeholder="All parts confirmed on hand" />
        </label>
        <button type="button" onClick={() => onCaseAction(item.srId, "ready", { details: "Part ready for dispatch scheduling.", readyNote })}>
          Ready to schedule
        </button>
      </div>

      {actionState && <p className={actionState.error ? "error-text" : "muted"}>{actionState.message}</p>}

      <div className="detail-block">
        <div className="section-head compact">
          <strong>Tracked requests</strong>
          <button type="button" onClick={onOpenRequests}>Open requests tab</button>
        </div>
        <div className="history-list">
          {(detail.trackedRequests || []).map((request) => (
            <button key={request.requestId} type="button" className="history-entry history-button" onClick={() => onOpenRequest?.(request.requestId)}>
              <p>#{request.requestId} • {request.status}</p>
              <span>{request.description}</span>
            </button>
          ))}
          {!(detail.trackedRequests || []).length && <p className="muted">No tracked requests on this case.</p>}
        </div>
      </div>

      <div className="detail-block">
        <strong>Timeline</strong>
        <div className="history-list tall">
          {(detail.timeline?.entries || []).map((entry, index) => (
            <div key={`${entry.occurredAt}-${index}`} className="history-entry">
              <p>{entry.summary}</p>
              <span>{entry.occurredAt || "unknown"} • {entry.actorLabel || entry.source}</span>
            </div>
          ))}
          {!((detail.timeline?.entries || []).length) && <p className="muted">No timeline entries yet.</p>}
        </div>
      </div>
    </aside>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-value">
      <span>{label}</span>
      <strong>{value || "n/a"}</strong>
    </div>
  );
}
