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
  evidenceFeedbackState,
  onCaseAction,
  onCaseOwnerAction,
  onEvidenceFeedback,
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

  const stageCounts = useMemo(() => {
    return (items || []).reduce((counts, item) => {
      const key = item?.stageLabel || item?.stage || "unknown";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }, [items]);
  const boardSignals = useMemo(() => {
    const unowned = (items || []).filter((item) => !item?.assignedPartsLabel).length;
    const schedulingReady = (items || []).filter((item) => String(item?.stage || "").toLowerCase() === "part_received").length;
    return [
      `Unowned: ${unowned}`,
      `Scheduling ready: ${schedulingReady}`,
      `Visible cases: ${(items || []).length}`,
    ];
  }, [items]);
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
        <div className="workflow-strip compact">
          <span>Pick case</span>
          <span>Assign owner</span>
          <span>Update status</span>
          <span>Hand off</span>
        </div>
        <div className="chip-list">
          {boardSignals.map((item) => (
            <span key={item} className="queue-chip">{item}</span>
          ))}
          {Object.entries(stageCounts)
            .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
            .slice(0, 4)
            .map(([stage, count]) => (
              <span key={stage} className="queue-chip">{stage}: {count}</span>
            ))}
        </div>
        <div className="attention-toolbar">
          <details className="control-disclosure">
            <summary>Filters and queue controls</summary>
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
          </details>
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
                <span>Status: {item.status || "unknown"}</span>
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
        evidenceFeedbackState={evidenceFeedbackState}
        onCaseAction={onCaseAction}
        onCaseOwnerAction={onCaseOwnerAction}
        onEvidenceFeedback={onEvidenceFeedback}
        onOpenRequests={onOpenRequests}
        onOpenRequest={onOpenRequest}
      />
    </section>
  );
}

function CaseDetail({
  detail,
  loading,
  detailErrors,
  actionState,
  evidenceFeedbackState,
  onCaseAction,
  onCaseOwnerAction,
  onEvidenceFeedback,
  onOpenRequests,
  onOpenRequest,
}) {
  const [eta, setEta] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [orderedVendor, setOrderedVendor] = useState("");
  const [orderedEta, setOrderedEta] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [readyNote, setReadyNote] = useState("");
  const [assignedPartsUserId, setAssignedPartsUserId] = useState("");
  const [copyState, setCopyState] = useState("");
  const [evidenceFeedbackNote, setEvidenceFeedbackNote] = useState("");

  useEffect(() => {
    setEta("");
    setTrackingNumber("");
    setTrackingCarrier("");
    setOrderedVendor("");
    setOrderedEta("");
    setReceivedFrom("");
    setReadyNote("");
    setAssignedPartsUserId("");
    setCopyState("");
    setEvidenceFeedbackNote("");
  }, [detail?.case?.reference]);

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
  const recommendationConversation = detail.recommendationConversation?.conversation;
  const supportedRecommendations = Array.isArray(recommendationConversation?.supportedPartRecommendations)
    ? recommendationConversation.supportedPartRecommendations
    : [];
  const diagnosticQuestions = Array.isArray(recommendationConversation?.diagnosticQuestions)
    ? recommendationConversation.diagnosticQuestions
    : [];
  const evidenceSummary = recommendationConversation?.evidenceSummary || {};
  const feedbackCaptureEnabled = recommendationConversation?.feedbackCaptureEnabled !== false;
  const modelFamilyTrends = evidenceSummary?.modelFamilyTrends || null;
  const feedbackSummary = evidenceSummary?.feedbackSummary || { counts: {}, latest: null };
  const feedbackHealth = evidenceSummary?.feedbackHealth || null;
  const feedbackCounts = feedbackSummary?.counts || {};
  const topRecommendation = supportedRecommendations[0] || null;
  const assignedPartsUserIdValue = assignedPartsUserId.trim();
  const canAssignEnteredOwner = /^\d+$/.test(assignedPartsUserIdValue);
  const actionBusy = Boolean(actionState?.message?.startsWith("Running"));
  const detailSummary = buildCaseSummary(item, detail.trackedRequests || []);
  const sortedTrackedRequests = [...(detail.trackedRequests || [])].sort((left, right) =>
    String(left.status || "").localeCompare(String(right.status || "")) || Number(left.requestId || 0) - Number(right.requestId || 0)
  );

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
        <span className="queue-chip">Dispatch handoff: {detailSummary.dispatchHandoffLabel}</span>
        <span className="queue-chip">Owner: {detailSummary.ownerLabel}</span>
      </div>

      <div className="detail-block">
        <strong>Case brief</strong>
        <p>{detailSummary.summary}</p>
      </div>

      <div className="detail-block">
        <strong>Owner assignment</strong>
        <p className="muted">
          Assigning a case updates every open tracked request for this SR. BlueFolder-only cases need a tracked request before
          ownership can be stored.
        </p>
        <div className="inline-form-row">
          <label className="field slim">
            <span>Parts user ID</span>
            <input
              value={assignedPartsUserId}
              onChange={(event) => setAssignedPartsUserId(event.target.value)}
              inputMode="numeric"
              placeholder="1234567890"
            />
          </label>
          <button
            type="button"
            disabled={actionBusy || !canAssignEnteredOwner}
            onClick={() =>
              onCaseOwnerAction?.(
                item.reference,
                "claim",
                { assignedPartsUserId: Number.parseInt(assignedPartsUserIdValue, 10) }
              )
            }
          >
            Assign owner
          </button>
          <button type="button" disabled={actionBusy} onClick={() => onCaseOwnerAction?.(item.reference, "claim")}>Claim me</button>
          <button type="button" disabled={actionBusy} onClick={() => onCaseOwnerAction?.(item.reference, "unclaim")}>Unassign</button>
        </div>
      </div>

      <div className="detail-block">
        <strong>Next action</strong>
        <p>{item.nextAction || "No next action yet."}</p>
        <p className="muted">{describeStatusMeta(item.serviceRequestStatusMeta)}</p>
        {item.blocker && <p className="error-text">Blocker: {item.blocker}</p>}
        {item.latestIssueText && <p className="muted">Issue: {item.latestIssueText}</p>}
        {item.latestStatusText && <p className="muted">Latest status: {item.latestStatusText}</p>}
      </div>

      <div className="detail-block evidence-summary-card">
        <strong>Evidence summary</strong>
        <div className="detail-grid">
          <Detail label="Confidence" value={evidenceSummary.confidence || "n/a"} />
          <Detail label="Top part" value={topRecommendation?.item || "none"} />
        </div>
        {!!diagnosticQuestions.length && <p className="muted">Ask first: {diagnosticQuestions[0]}</p>}
        {!detail.recommendationConversation?.available && (
          <p className="muted">{detail.recommendationConversation?.message || "No PartsCannon evidence loaded for this case."}</p>
        )}
      </div>

      <details className="detail-block disclosure-card">
        <summary>PartsCannon evidence details</summary>
        {!!detailErrors?.recommendationConversation && <p className="error-text">{detailErrors.recommendationConversation}</p>}
        {detail.recommendationConversation?.available ? (
          <div className="history-list">
            <div className="detail-grid">
              <Detail label="Confidence" value={evidenceSummary.confidence || "n/a"} />
              <Detail label="Matched SRs" value={evidenceSummary.matchedHistoricalRequestCount ?? supportedRecommendations[0]?.matchingRequestCount ?? 0} />
              <Detail label="Model family" value={modelFamilyTrends?.modelFamily || "n/a"} />
              <Detail label="Top part" value={topRecommendation?.item || "none"} />
            </div>
            {modelFamilyTrends && (
              <div className="history-entry">
                <p>{modelFamilyTrends.modelFamily} trend</p>
                <small>
                  {modelFamilyTrends.requestCount || 0} similar model-family SRs. Top parts:{" "}
                  {formatTrendItems(modelFamilyTrends.topParts, "item") || "none yet"}. Top complaints:{" "}
                  {formatTrendItems(modelFamilyTrends.topComplaintTags, "tag") || "none yet"}.
                </small>
              </div>
            )}
            {supportedRecommendations.map((part) => (
              <div key={`${part.itemType}-${part.item}`} className="history-entry">
                <p>{part.item}</p>
                <span>
                  {[part.itemType, `${part.matchingRequestCount || 0} matching SRs`, formatScore(part.score)].filter(Boolean).join(" • ")}
                </span>
              </div>
            ))}
            {!supportedRecommendations.length && <p className="muted">No supported parts found in historical evidence.</p>}
            {!!diagnosticQuestions.length && (
              <div className="history-entry">
                <p>Ask before ordering</p>
                <small>{diagnosticQuestions.slice(0, 3).join(" ")}</small>
              </div>
            )}
            <p className="muted">{recommendationConversation?.unsupportedPartsPolicy}</p>
            <div className="history-entry">
              <p>Evidence feedback</p>
              {feedbackHealth?.label && <small>{feedbackHealth.label}</small>}
              <small>
                Helpful {feedbackCounts.helpful || 0} • Needs review {feedbackCounts.needs_review || 0} • Not useful{" "}
                {feedbackCounts.not_helpful || 0}
                {feedbackSummary.latest?.outcome ? ` • Latest ${formatFeedbackOutcome(feedbackSummary.latest.outcome)}` : ""}
              </small>
              {feedbackSummary.latest?.notes && <small>Latest note: {feedbackSummary.latest.notes}</small>}
              <label className="field slim">
                <span>Feedback note</span>
                <input
                  value={evidenceFeedbackNote}
                  onChange={(event) => setEvidenceFeedbackNote(event.target.value)}
                  maxLength={1000}
                  placeholder="Example: verified part, needs better complaint context"
                />
              </label>
              <div className="action-row">
                <button
                  type="button"
                  disabled={evidenceFeedbackState?.loading || !feedbackCaptureEnabled}
                  onClick={() => onEvidenceFeedback?.("helpful", topRecommendation?.item || "", evidenceFeedbackNote)}
                >
                  Evidence helped
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={evidenceFeedbackState?.loading || !feedbackCaptureEnabled}
                  onClick={() => onEvidenceFeedback?.("needs_review", topRecommendation?.item || "", evidenceFeedbackNote)}
                >
                  Needs review
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={evidenceFeedbackState?.loading || !feedbackCaptureEnabled}
                  onClick={() => onEvidenceFeedback?.("not_helpful", topRecommendation?.item || "", evidenceFeedbackNote)}
                >
                  Not useful
                </button>
              </div>
              {evidenceFeedbackState?.message && (
                <small className={evidenceFeedbackState.error ? "error-text" : "muted"}>{evidenceFeedbackState.message}</small>
              )}
              {!feedbackCaptureEnabled && <small>Feedback capture is not enabled for this evidence source.</small>}
            </div>
          </div>
        ) : (
          <p className="muted">{detail.recommendationConversation?.message || "No PartsCannon evidence loaded for this case."}</p>
        )}
      </details>

      <details className="detail-block disclosure-card">
        <summary>Dispatch and scheduling handoffs</summary>
        <div className="section-head compact">
          <strong>Dispatch handoff brief</strong>
          <button
            type="button"
            disabled={actionBusy}
            onClick={async () => {
              const brief = buildDispatchHandoffBrief(item, detail.trackedRequests || []);
              if (await copyText(brief)) {
                setCopyState("Copied dispatch handoff brief.");
              } else {
                setCopyState("Clipboard unavailable. Handoff brief is shown below.");
              }
            }}
          >
            Copy brief
          </button>
        </div>
        <p className="muted">{buildDispatchHandoffBrief(item, detail.trackedRequests || [])}</p>
        {copyState && <p className="muted">{copyState}</p>}
        <div className="section-head compact">
          <strong>Scheduling handoff</strong>
          <button
            type="button"
            disabled={actionBusy}
            onClick={async () => {
              const brief = buildSchedulingHandoffBrief(item, detail.trackedRequests || []);
              if (await copyText(brief)) {
                setCopyState("Copied scheduling handoff.");
              } else {
                setCopyState("Clipboard unavailable. Scheduling handoff is shown below.");
              }
            }}
          >
            Copy scheduling handoff
          </button>
        </div>
        <p className="muted">{buildSchedulingHandoffBrief(item, detail.trackedRequests || [])}</p>
      </details>

      <details className="detail-block disclosure-card">
        <summary>Parts status updates</summary>
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
            disabled={actionBusy}
            onClick={() => onCaseAction(item.srId, "ordered", { vendor: orderedVendor, eta: orderedEta, details: "Part order posted from parts app." })}
          >
            Mark ordered
          </button>
        </div>

      <div className="inline-form-row">
        <label className="field slim">
          <span>ETA</span>
          <input value={eta} onChange={(event) => setEta(event.target.value)} placeholder="2026-04-05" />
        </label>
        <button type="button" disabled={actionBusy} onClick={() => onCaseAction(item.srId, "eta", { eta, details: "ETA updated from parts app." })}>
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
          disabled={actionBusy}
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
        <button type="button" disabled={actionBusy} onClick={() => onCaseAction(item.srId, "received", { details: "Part received and ready for verification.", receivedFrom })}>
          Mark received
        </button>
      </div>

      <div className="inline-form-row">
        <label className="field slim">
          <span>Ready note</span>
          <input value={readyNote} onChange={(event) => setReadyNote(event.target.value)} placeholder="All parts confirmed on hand" />
        </label>
        <button type="button" disabled={actionBusy} onClick={() => onCaseAction(item.srId, "ready", { details: "Part ready for dispatch scheduling.", readyNote })}>
          Ready to schedule
        </button>
      </div>
      </details>

      {actionState && <p className={actionState.error ? "error-text" : "muted"}>{actionState.message}</p>}

      <div className="detail-block">
        <div className="section-head compact">
          <strong>Tracked requests</strong>
          <button type="button" onClick={onOpenRequests}>Open requests tab</button>
        </div>
        <div className="chip-list">
          {summarizeTrackedRequestStatuses(sortedTrackedRequests).map((item) => (
            <span key={item} className="queue-chip">{item}</span>
          ))}
        </div>
        <div className="history-list">
          {sortedTrackedRequests.map((request) => (
            <button key={request.requestId} type="button" className="history-entry history-button" onClick={() => onOpenRequest?.(request.requestId)}>
              <p>#{request.requestId} • {request.status || "unknown"}</p>
              <span>{request.description || "No request description yet."}</span>
            </button>
          ))}
          {!sortedTrackedRequests.length && <p className="muted">No tracked requests on this case.</p>}
        </div>
      </div>

      <details className="detail-block disclosure-card">
        <summary>Timeline</summary>
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
      </details>
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
  if (meta.actionRequired) return meta.actionRequired;
  if (meta.isClosed) return "This case should drop out once tracked parts work is cleared, because the SR is already closed or completed.";
  if (meta.isActiveParts) return "This SR is still in a tenant status that clearly reflects active parts work.";
  if (meta.isQuoteNeeded) return "This SR is blocked on quote approval, so parts may not be the only blocker.";
  if (meta.isWaitingCustomer) return "This SR is waiting on customer-side follow-up rather than a pure parts step.";
  if (meta.isScheduling) return "This SR is in a scheduling state, so confirm the parts loop is really still active.";
  if (meta.isReview) return "This SR is in a review or triage state, so office follow-up may be the real blocker.";
  return "This SR status does not currently map to a stronger parts-specific rule.";
}

function formatScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return `${Math.round(numeric * 100)}% match`;
}

function formatTrendItems(items, key) {
  if (!Array.isArray(items) || !items.length) return "";
  return items
    .slice(0, 3)
    .map((item) => `${item?.[key] || "unknown"} (${item?.count || 0})`)
    .join(", ");
}

function formatFeedbackOutcome(value) {
  return String(value || "").replaceAll("_", " ");
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

async function copyText(value) {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function summarizeTrackedRequestStatuses(items) {
  if (!Array.isArray(items) || !items.length) return ["No tracked requests"];
  const counts = items.reduce((result, item) => {
    const status = item?.status || "unknown";
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
  return Object.entries(counts)
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
    .map(([status, count]) => `${status}: ${count}`);
}

function buildCaseSummary(item, trackedRequests) {
  const ownerLabel = item?.assignedPartsLabel || "unassigned";
  const stageLabel = item?.stageLabel || item?.stage || "unknown";
  const receivedCount = (trackedRequests || []).filter((request) => String(request?.status || "").toLowerCase() === "received").length;
  const dispatchHandoffLabel = receivedCount > 0 || String(item?.stage || "").toLowerCase() === "part_received" ? "ready" : "hold";
  const summary = [
    `${item?.reference || "This case"} is in ${stageLabel}.`,
    ownerLabel === "unassigned" ? "An owner still needs to claim parts follow-up." : `${ownerLabel} owns the case.`,
    item?.nextAction || "No explicit next action is loaded yet.",
    receivedCount > 0
      ? `${receivedCount} tracked request line${receivedCount === 1 ? "" : "s"} already show received and can move back toward scheduling.`
      : "No tracked request lines are marked received yet.",
  ].join(" ");
  return { ownerLabel, dispatchHandoffLabel, summary };
}
