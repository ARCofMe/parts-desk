import { useEffect, useMemo, useState } from "react";

const DEFAULT_FILTERS = {
  status: "",
  assignedPartsLabel: "",
  reference: "",
  caseStageLabel: "",
};

export default function RequestsView({
  items,
  loading,
  error,
  initialFilters = DEFAULT_FILTERS,
  persistFilters = true,
  onPreferencesChange,
  onRefresh,
  onSelectRequest,
  selectedRequest,
  selectedRequestDetail,
  detailLoading,
  onRequestAction,
  requestActionState,
  onOpenCase,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [assignedPartsUserId, setAssignedPartsUserId] = useState("");

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    setAssignedPartsUserId("");
  }, [selectedRequestDetail?.request?.requestId]);

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
  const statusCounts = useMemo(() => {
    return (items || []).reduce((counts, item) => {
      const status = item?.status || "unknown";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
  }, [items]);
  const sortedStatusCounts = Object.entries(statusCounts).sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  const assignedPartsUserIdValue = assignedPartsUserId.trim();
  const canAssignEnteredOwner = /^\d+$/.test(assignedPartsUserIdValue);
  const requestActionBusy = Boolean(requestActionState?.loading);
  const requestSummary = buildRequestSummary(selectedRequestDetail?.request, selectedRequestDetail?.case);

  return (
    <section className="panel attention-layout">
      <div className="attention-column">
        <div className="workflow-strip compact">
          <span>Pick request</span>
          <span>Claim owner</span>
          <span>Update status</span>
          <span>Open case</span>
        </div>
        <div className="chip-list">
          {sortedStatusCounts.length ? (
            sortedStatusCounts.map(([status, count]) => (
              <span key={status} className="queue-chip">{status}: {count}</span>
            ))
          ) : (
            <span className="muted">No tracked request status counts yet.</span>
          )}
        </div>
        <div className="attention-toolbar">
          <details className="control-disclosure">
            <summary>Filters and request controls</summary>
            <div className="filter-grid">
              {Object.keys(DEFAULT_FILTERS).map((key) => (
                <label className="field" key={key}>
                  <span>{labelFor(key)}</span>
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
          </details>
        </div>

        {loading && <p>Loading tracked requests…</p>}
        {error && <p className="error-text">{error}</p>}
        {requestActionState && <p className={requestActionState.error ? "error-text" : "muted"}>{requestActionState.message}</p>}

        <div className="list-stack">
          {visibleItems.map((item) => (
            <button
              key={item.requestId}
              type="button"
              className={selectedRequest?.requestId === item.requestId ? "attention-card selected" : "attention-card"}
              onClick={() => onSelectRequest(item)}
            >
              <div className="attention-card-top">
                <strong>#{item.requestId} • {item.reference}</strong>
                <span>{item.status}</span>
              </div>
              <p>{item.description || "No request description yet."}</p>
              <div className="attention-card-meta">
                <span>Case: {item.caseStageLabel || item.caseStage}</span>
                <span>Assigned: {item.assignedPartsLabel || "unassigned"}</span>
                <span>Next: {item.nextAction || "n/a"}</span>
              </div>
            </button>
          ))}
          {!visibleItems.length && !loading && !error && <p className="muted">No tracked requests match the current filters.</p>}
        </div>
      </div>

      <aside className="detail-panel">
        {detailLoading && <p className="muted">Loading tracked request…</p>}
        {!detailLoading && !selectedRequestDetail?.request && (
          <p className="muted">Select a tracked request to inspect the linked case and work it directly.</p>
        )}
        {selectedRequestDetail?.request && (
          <>
            <div className="detail-head">
              <div>
                <p className="section-kicker">Tracked request</p>
                <h3>#{selectedRequestDetail.request.requestId}</h3>
              </div>
              <span className="status-pill">{selectedRequestDetail.request.status}</span>
            </div>

            <div className="detail-grid">
              <Detail label="Reference" value={selectedRequestDetail.request.reference} />
              <Detail label="Case stage" value={selectedRequestDetail.request.caseStageLabel || selectedRequestDetail.request.caseStage} />
              <Detail label="Assigned" value={selectedRequestDetail.request.assignedPartsLabel || "unassigned"} />
              <Detail label="Technician" value={selectedRequestDetail.request.technicianLabel || "n/a"} />
            </div>

            <div className="chip-list detail-block">
              <span className="queue-chip">Owner: {requestSummary.ownerLabel}</span>
              <span className="queue-chip">Case link: {requestSummary.caseLinkLabel}</span>
              <span className="queue-chip">Dispatch handoff: {requestSummary.dispatchHandoffLabel}</span>
            </div>

            <div className="detail-block">
              <strong>Description</strong>
              <p>{selectedRequestDetail.request.description || "No request description yet."}</p>
              {selectedRequestDetail.request.downstreamNote && <p className="muted">Downstream note: {selectedRequestDetail.request.downstreamNote}</p>}
              <p className="muted">Requested by {selectedRequestDetail.request.requestedByLabel || "unknown"}.</p>
            </div>

            <div className="detail-block">
              <strong>Request brief</strong>
              <p>{requestSummary.summary}</p>
            </div>

            <details className="detail-block disclosure-card">
              <summary>Request actions</summary>
              <div className="inline-form-row">
                <label className="field slim">
                  <span>Assign to Discord user id</span>
                  <input
                    value={assignedPartsUserId}
                    onChange={(event) => setAssignedPartsUserId(event.target.value)}
                    inputMode="numeric"
                    placeholder="1234567890"
                  />
                </label>
                <button
                  type="button"
                  disabled={!canAssignEnteredOwner || requestActionBusy}
                  onClick={() =>
                    onRequestAction(selectedRequestDetail.request.requestId, "claim", {
                      assignedPartsUserId: Number.parseInt(assignedPartsUserIdValue, 10),
                    })
                  }
                >
                  Assign
                </button>
                <button type="button" disabled={requestActionBusy} onClick={() => onRequestAction(selectedRequestDetail.request.requestId, "claim")}>Claim me</button>
                <button type="button" disabled={requestActionBusy} onClick={() => onRequestAction(selectedRequestDetail.request.requestId, "unclaim")}>Unclaim</button>
              </div>
              <div className="action-row">
                <button type="button" disabled={requestActionBusy} onClick={() => onRequestAction(selectedRequestDetail.request.requestId, "status", { status: "ordered" })}>Ordered</button>
                <button type="button" disabled={requestActionBusy} onClick={() => onRequestAction(selectedRequestDetail.request.requestId, "status", { status: "received" })}>Received</button>
                <button type="button" disabled={requestActionBusy} onClick={() => onRequestAction(selectedRequestDetail.request.requestId, "status", { status: "resolved" })}>Resolved</button>
              </div>
            </details>

            <div className="detail-block">
              <div className="section-head compact">
                <strong>Linked case</strong>
                <button
                  type="button"
                  disabled={!selectedRequestDetail.case?.reference}
                  onClick={() => onOpenCase?.(selectedRequestDetail.case.reference)}
                >
                  Open case
                </button>
              </div>
              {selectedRequestDetail.case?.reference ? (
                <div className="history-entry">
                  <p>{selectedRequestDetail.case.reference} • {selectedRequestDetail.case.stageLabel || selectedRequestDetail.case.stage}</p>
                  <span>
                    {selectedRequestDetail.case.nextAction || selectedRequestDetail.case.latestStatusText || "No next action yet."}
                  </span>
                </div>
              ) : (
                <p className="muted">No linked case detail is available for this tracked request yet.</p>
              )}
            </div>
          </>
        )}
      </aside>
    </section>
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

function labelFor(key) {
  switch (key) {
    case "assignedPartsLabel":
      return "Assigned";
    case "caseStageLabel":
      return "Case stage";
    default:
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
}

function buildRequestSummary(request, linkedCase) {
  const status = String(request?.status || "unknown").trim();
  const ownerLabel = request?.assignedPartsLabel || "unassigned";
  const caseLinkLabel = linkedCase?.reference ? "linked" : "missing";
  const normalizedStatus = status.toLowerCase();
  let dispatchHandoffLabel = "not ready";
  if (normalizedStatus === "received") dispatchHandoffLabel = "ready";
  else if (normalizedStatus === "resolved") dispatchHandoffLabel = "closed";
  else if (normalizedStatus === "ordered") dispatchHandoffLabel = "waiting eta";
  const summary = [
    `This request is ${status}.`,
    linkedCase?.reference
      ? `Linked case ${linkedCase.reference} is ${linkedCase.stageLabel || linkedCase.stage || "active"}.`
      : "No linked case detail is loaded yet.",
    ownerLabel === "unassigned"
      ? "Claim an owner before updating downstream status."
      : `${ownerLabel} currently owns the parts follow-up.`,
    request?.nextAction || linkedCase?.nextAction || "No explicit next action is loaded yet.",
  ].join(" ");
  return { ownerLabel, caseLinkLabel, dispatchHandoffLabel, summary };
}
