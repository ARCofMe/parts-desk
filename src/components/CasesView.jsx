import { useEffect, useMemo, useState } from "react";

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
  detailErrors = {},
  initialFilters = DEFAULT_FILTERS,
  persistFilters = true,
  onPreferencesChange,
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
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    if (!persistFilters) return;
    onPreferencesChange?.(filters);
  }, [filters, persistFilters]);

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
                <span>SR: {item.serviceRequestStatus || "unknown"}</span>
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
        detailErrors={detailErrors}
        actionState={actionState}
        onCaseAction={onCaseAction}
        onOpenRequests={onOpenRequests}
        onOpenRequest={onOpenRequest}
      />
    </section>
  );
}

function CaseDetail({ detail, loading, detailErrors, actionState, onCaseAction, onOpenRequests, onOpenRequest }) {
  const [eta, setEta] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [orderedVendor, setOrderedVendor] = useState("");
  const [orderedEta, setOrderedEta] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [readyNote, setReadyNote] = useState("");
  const [copyState, setCopyState] = useState("");

  if (loading) {
    return <aside className="detail-panel"><p className="muted">Loading parts case…</p></aside>;
  }
  if (!detail?.case) {
    return (
      <aside className="detail-panel">
        {actionState && <p className={actionState.error ? "error-text" : "muted"}>{actionState.message}</p>}
        <p className="muted">Select a parts case to inspect tracked requests and timeline.</p>
      </aside>
    );
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
        <Detail label="SR status" value={item.serviceRequestStatus || "unknown"} />
        <Detail label="SR category" value={item.serviceRequestStatusMeta?.categoryLabel || "Other"} />
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
        <p className="muted">{describeStatusMeta(item.serviceRequestStatusMeta)}</p>
        {item.blocker && <p className="error-text">Blocker: {item.blocker}</p>}
        {item.latestIssueText && <p className="muted">Issue: {item.latestIssueText}</p>}
        {item.latestStatusText && <p className="muted">Latest status: {item.latestStatusText}</p>}
      </div>

      <div className="detail-block">
        <div className="section-head compact">
          <strong>Dispatch handoff brief</strong>
          <button
            type="button"
            onClick={async () => {
              const brief = buildDispatchHandoffBrief(item, detail.trackedRequests || []);
              try {
                await navigator.clipboard.writeText(brief);
                setCopyState("Copied dispatch handoff brief.");
              } catch {
                setCopyState("Clipboard unavailable. Handoff brief is shown below.");
              }
            }}
          >
            Copy brief
          </button>
        </div>
        <p className="muted">{buildDispatchHandoffBrief(item, detail.trackedRequests || [])}</p>
        {copyState && <p className="muted">{copyState}</p>}
      </div>

      <div className="detail-block">
        <div className="section-head compact">
          <strong>Scheduling handoff</strong>
          <button
            type="button"
            onClick={async () => {
              const brief = buildSchedulingHandoffBrief(item, detail.trackedRequests || []);
              try {
                await navigator.clipboard.writeText(brief);
                setCopyState("Copied scheduling handoff.");
              } catch {
                setCopyState("Clipboard unavailable. Scheduling handoff is shown below.");
              }
            }}
          >
            Copy scheduling handoff
          </button>
        </div>
        <p className="muted">{buildSchedulingHandoffBrief(item, detail.trackedRequests || [])}</p>
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
        {!!detailErrors?.timeline && <p className="error-text">{detailErrors.timeline}</p>}
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

function describeStatusMeta(meta) {
  if (!meta || typeof meta !== "object") return "No BlueFolder SR status classification loaded.";
  if (meta.isClosed) return "This case should drop out once tracked parts work is cleared, because the SR is already closed or completed.";
  if (meta.isActiveParts) return "This SR is still in a tenant status that clearly reflects active parts work.";
  if (meta.isQuoteNeeded) return "This SR is blocked on quote approval, so parts may not be the only blocker.";
  if (meta.isWaitingCustomer) return "This SR is waiting on customer-side follow-up rather than a pure parts step.";
  if (meta.isScheduling) return "This SR is in a scheduling state, so confirm the parts loop is really still active.";
  if (meta.isReview) return "This SR is in a review or triage state, so office follow-up may be the real blocker.";
  return "This SR status does not currently map to a stronger parts-specific rule.";
}

function buildDispatchHandoffBrief(item, requests) {
  const requestSummary = requests.length
    ? requests.map((request) => `#${request.requestId} ${request.status}: ${request.description}`).join("; ")
    : "no tracked request lines";
  return [
    `${item.reference}: ${item.stageLabel || item.stage || "parts case"}`,
    `SR status: ${item.serviceRequestStatus || "unknown"}`,
    `Next: ${item.nextAction || item.latestStatusText || "confirm parts status"}`,
    `Blocker: ${item.blocker || "none listed"}`,
    `Requests: ${requestSummary}`,
  ].join(" | ");
}

function buildSchedulingHandoffBrief(item, requests) {
  const receivedRequests = requests.filter((request) => String(request.status || "").toLowerCase().includes("received"));
  const readyRequests = receivedRequests.length ? receivedRequests : requests;
  const requestSummary = readyRequests.length
    ? readyRequests.map((request) => `#${request.requestId} ${request.status}: ${request.description}`).join("; ")
    : "no tracked request lines";
  return [
    `${item.reference}: parts scheduling handoff`,
    `Stage: ${item.stageLabel || item.stage || "unknown"}`,
    `Ready lines: ${requestSummary}`,
    `Next: ${item.nextAction || item.latestStatusText || "schedule return visit when confirmed"}`,
  ].join(" | ");
}
