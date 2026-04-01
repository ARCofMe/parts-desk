import { useEffect, useState } from "react";
import { partsApi } from "./api/client";
import BrandBar from "./components/BrandBar";
import TabNav from "./components/TabNav";
import BoardView from "./components/BoardView";
import CasesView from "./components/CasesView";
import RequestsView from "./components/RequestsView";

export default function App() {
  const [activeTab, setActiveTab] = useState("board");
  const [board, setBoard] = useState(null);
  const [boardError, setBoardError] = useState("");
  const [boardLoading, setBoardLoading] = useState(true);
  const [syncState, setSyncState] = useState(null);

  const [cases, setCases] = useState([]);
  const [casesError, setCasesError] = useState("");
  const [casesLoading, setCasesLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState(null);
  const [caseActionState, setCaseActionState] = useState(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);

  const [requests, setRequests] = useState([]);
  const [requestsError, setRequestsError] = useState("");
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestActionState, setRequestActionState] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);

  useEffect(() => {
    loadBoard();
    loadCases();
    loadRequests();
  }, []);

  async function loadBoard() {
    setBoardLoading(true);
    setBoardError("");
    try {
      setBoard(await partsApi.getBoard());
    } catch (error) {
      setBoardError(formatError(error));
    } finally {
      setBoardLoading(false);
    }
  }

  async function loadCases() {
    setCasesLoading(true);
    setCasesError("");
    try {
      const payload = await partsApi.getCases();
      setCases(payload.items || []);
    } catch (error) {
      setCasesError(formatError(error));
    } finally {
      setCasesLoading(false);
    }
  }

  async function loadCaseDetail(reference) {
    setCaseDetailLoading(true);
    try {
      const [casePayload, timelinePayload] = await Promise.all([
        partsApi.getCase(reference),
        partsApi.getCaseTimeline(reference),
      ]);
      setSelectedCaseDetail({ ...casePayload, timeline: timelinePayload });
    } catch (error) {
      setCaseActionState({ error: true, message: formatError(error) });
    } finally {
      setCaseDetailLoading(false);
    }
  }

  async function loadRequests() {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const payload = await partsApi.getRequests();
      setRequests(payload.items || []);
    } catch (error) {
      setRequestsError(formatError(error));
    } finally {
      setRequestsLoading(false);
    }
  }

  async function handleSync() {
    setSyncState({ error: false, message: "Sync running…" });
    try {
      const payload = await partsApi.sync();
      setSyncState({ error: false, message: payload.message || "Sync complete" });
      await Promise.all([loadBoard(), loadRequests(), loadCases()]);
    } catch (error) {
      setSyncState({ error: true, message: formatError(error) });
    }
  }

  async function handleReconcile() {
    setSyncState({ error: false, message: "Reconcile running…" });
    try {
      const payload = await partsApi.reconcile();
      setSyncState({ error: false, message: payload.message || "Reconcile complete" });
      await Promise.all([loadBoard(), loadRequests(), loadCases()]);
    } catch (error) {
      setSyncState({ error: true, message: formatError(error) });
    }
  }

  async function handleCaseSelect(item) {
    setSelectedCase(item);
    setCaseActionState(null);
    await loadCaseDetail(item.reference);
  }

  async function loadRequestDetail(requestId) {
    setRequestDetailLoading(true);
    try {
      const payload = await partsApi.getRequest(requestId);
      setSelectedRequestDetail(payload);
    } catch (error) {
      setRequestActionState({ error: true, message: formatError(error) });
    } finally {
      setRequestDetailLoading(false);
    }
  }

  async function handleRequestSelect(item) {
    setSelectedRequest(item);
    setRequestActionState(null);
    await loadRequestDetail(item.requestId);
  }

  async function handleCaseAction(srId, action, body) {
    if (!srId) {
      setCaseActionState({ error: true, message: "This case is not linked to an SR yet." });
      return;
    }
    setCaseActionState({ error: false, message: `Running ${action}…` });
    try {
      const payload = await partsApi.postCaseAction(srId, action, body);
      setCaseActionState({ error: false, message: payload.message || `${action} complete` });
      await Promise.all([loadBoard(), loadCases(), loadRequests()]);
      if (selectedCase?.reference) {
        await loadCaseDetail(selectedCase.reference);
      }
      if (selectedRequest?.requestId) {
        await loadRequestDetail(selectedRequest.requestId);
      }
    } catch (error) {
      setCaseActionState({ error: true, message: formatError(error) });
    }
  }

  async function handleRequestAction(requestId, action, body = {}) {
    setRequestActionState({ error: false, message: `Running ${action}…` });
    try {
      const payload = await partsApi.postRequestAction(requestId, action, body);
      setRequestActionState({ error: false, message: payload.message || `${action} complete` });
      await Promise.all([loadBoard(), loadRequests(), loadCases()]);
      if (selectedCase?.reference) {
        await loadCaseDetail(selectedCase.reference);
      }
      if (selectedRequest?.requestId) {
        await loadRequestDetail(selectedRequest.requestId);
      }
    } catch (error) {
      setRequestActionState({ error: true, message: formatError(error) });
    }
  }

  async function openCaseReference(reference) {
    if (!reference) return;
    const match = cases.find((item) => item.reference === reference) || { reference };
    setActiveTab("cases");
    await handleCaseSelect(match);
  }

  async function openRequestId(requestId) {
    if (!requestId) return;
    const match = requests.find((item) => item.requestId === requestId) || { requestId };
    setActiveTab("requests");
    await handleRequestSelect(match);
  }

  return (
    <div className="app-shell">
      <BrandBar />
      <TabNav activeTab={activeTab} onSelect={setActiveTab} />

      {activeTab === "board" && (
        <BoardView
          board={board}
          loading={boardLoading}
          error={boardError}
          onOpenCases={() => setActiveTab("cases")}
          onSync={handleSync}
          onReconcile={handleReconcile}
          syncState={syncState}
          onOpenCase={openCaseReference}
          onOpenRequest={openRequestId}
        />
      )}
      {activeTab === "cases" && (
        <CasesView
          items={cases}
          loading={casesLoading}
          error={casesError}
          onRefresh={loadCases}
          onSelectCase={handleCaseSelect}
          selectedCase={selectedCase}
          selectedCaseDetail={selectedCaseDetail}
          detailLoading={caseDetailLoading}
          actionState={caseActionState}
          onCaseAction={handleCaseAction}
          onOpenRequests={() => setActiveTab("requests")}
          onOpenRequest={openRequestId}
        />
      )}
      {activeTab === "requests" && (
        <RequestsView
          items={requests}
          loading={requestsLoading}
          error={requestsError}
          onRefresh={loadRequests}
          onSelectRequest={handleRequestSelect}
          selectedRequest={selectedRequest}
          selectedRequestDetail={selectedRequestDetail}
          detailLoading={requestDetailLoading}
          onRequestAction={handleRequestAction}
          requestActionState={requestActionState}
          onOpenCase={openCaseReference}
        />
      )}
    </div>
  );
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
}
