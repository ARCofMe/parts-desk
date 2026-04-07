import { useEffect, useRef, useState } from "react";
import { partsApi } from "./api/client";
import BrandBar from "./components/BrandBar";
import TabNav from "./components/TabNav";
import BoardView from "./components/BoardView";
import CasesView from "./components/CasesView";
import RequestsView from "./components/RequestsView";
import SettingsView from "./components/SettingsView";

const THEME_MODE_KEY = "parts-theme-mode";
const APP_NAME_KEY = "parts-app-name";
const PARTS_PREFERENCES_KEY = "parts-preferences";
const LAST_CASE_KEY = "parts-last-case";
const LAST_REQUEST_KEY = "parts-last-request";
const DEFAULT_APP_NAME = "PartsDesk";
const DEFAULT_PREFERENCES = {
  caseFilters: { stage: "", age: "", status: "", reference: "" },
  requestFilters: { status: "", assignedPartsLabel: "", reference: "", caseStageLabel: "" },
  persistFilters: { cases: true, requests: true },
  rememberLastCase: true,
  restoreLastCaseOnLaunch: false,
  rememberLastRequest: true,
  restoreLastRequestOnLaunch: false,
};

export default function App() {
  const caseDetailRequestIdRef = useRef(0);
  const requestDetailRequestIdRef = useRef(0);
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
  const [themeMode, setThemeMode] = useState(() => window.localStorage.getItem(THEME_MODE_KEY) || "light");
  const [appName, setAppName] = useState(() => window.localStorage.getItem(APP_NAME_KEY) || DEFAULT_APP_NAME);
  const [preferences, setPreferences] = useState(() => readStoredPreferences());

  useEffect(() => {
    loadBoard();
    loadCases();
    loadRequests();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_KEY, themeMode);
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    const nextName = appName.trim() || DEFAULT_APP_NAME;
    window.localStorage.setItem(APP_NAME_KEY, nextName);
    document.title = `${nextName} | ARCoM Ops Hub`;
  }, [appName]);

  useEffect(() => {
    window.localStorage.setItem(PARTS_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!preferences.restoreLastCaseOnLaunch) return;
    const lastReference = window.localStorage.getItem(LAST_CASE_KEY);
    if (!lastReference || !cases.length || selectedCase) return;
    const match = cases.find((item) => item.reference === lastReference);
    if (match) {
      handleCaseSelect(match);
    }
  }, [cases, preferences.restoreLastCaseOnLaunch, selectedCase]);

  useEffect(() => {
    if (!preferences.restoreLastRequestOnLaunch) return;
    const lastRequest = window.localStorage.getItem(LAST_REQUEST_KEY);
    if (!lastRequest || !requests.length || selectedRequest) return;
    const match = requests.find((item) => String(item.requestId) === lastRequest);
    if (match) {
      handleRequestSelect(match);
    }
  }, [preferences.restoreLastRequestOnLaunch, requests, selectedRequest]);

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
      const payload = await partsApi.getCases({ status: "open" });
      setCases(payload.items || []);
    } catch (error) {
      setCasesError(formatError(error));
    } finally {
      setCasesLoading(false);
    }
  }

  async function loadCaseDetail(reference) {
    const requestId = caseDetailRequestIdRef.current + 1;
    caseDetailRequestIdRef.current = requestId;
    setCaseDetailLoading(true);
    setSelectedCaseDetail(null);
    try {
      const [casePayload, timelinePayload] = await Promise.all([
        partsApi.getCase(reference),
        partsApi.getCaseTimeline(reference),
      ]);
      if (caseDetailRequestIdRef.current !== requestId) return;
      setSelectedCaseDetail({ ...casePayload, timeline: timelinePayload });
      setCaseActionState(null);
    } catch (error) {
      if (caseDetailRequestIdRef.current !== requestId) return;
      setSelectedCaseDetail(null);
      setCaseActionState({ error: true, message: formatError(error) });
    } finally {
      if (caseDetailRequestIdRef.current !== requestId) return;
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
    setSelectedCaseDetail(null);
    setCaseActionState(null);
    if (preferences.rememberLastCase && item?.reference) {
      window.localStorage.setItem(LAST_CASE_KEY, item.reference);
    }
    await loadCaseDetail(item.reference);
  }

  async function loadRequestDetail(requestId) {
    const detailRequestId = requestDetailRequestIdRef.current + 1;
    requestDetailRequestIdRef.current = detailRequestId;
    setRequestDetailLoading(true);
    setSelectedRequestDetail(null);
    try {
      const payload = await partsApi.getRequest(requestId);
      if (requestDetailRequestIdRef.current !== detailRequestId) return;
      setSelectedRequestDetail(payload);
      setRequestActionState(null);
    } catch (error) {
      if (requestDetailRequestIdRef.current !== detailRequestId) return;
      setSelectedRequestDetail(null);
      setRequestActionState({ error: true, message: formatError(error) });
    } finally {
      if (requestDetailRequestIdRef.current !== detailRequestId) return;
      setRequestDetailLoading(false);
    }
  }

  async function handleRequestSelect(item) {
    setSelectedRequest(item);
    setSelectedRequestDetail(null);
    setRequestActionState(null);
    if (preferences.rememberLastRequest && item?.requestId) {
      window.localStorage.setItem(LAST_REQUEST_KEY, String(item.requestId));
    }
    await loadRequestDetail(item.requestId);
  }

  function clearSavedState() {
    window.localStorage.removeItem(LAST_CASE_KEY);
    window.localStorage.removeItem(LAST_REQUEST_KEY);
    window.localStorage.removeItem(PARTS_PREFERENCES_KEY);
    setPreferences(DEFAULT_PREFERENCES);
    setSelectedCase(null);
    setSelectedCaseDetail(null);
    setSelectedRequest(null);
    setSelectedRequestDetail(null);
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
      <BrandBar appName={appName.trim() || DEFAULT_APP_NAME} />
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
          initialFilters={preferences.caseFilters}
          persistFilters={preferences.persistFilters.cases}
          onPreferencesChange={(filters) => setPreferences((current) => ({ ...current, caseFilters: filters }))}
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
          initialFilters={preferences.requestFilters}
          persistFilters={preferences.persistFilters.requests}
          onPreferencesChange={(filters) => setPreferences((current) => ({ ...current, requestFilters: filters }))}
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
      {activeTab === "settings" && (
        <SettingsView
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          appName={appName}
          onAppNameChange={setAppName}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onClearSavedState={clearSavedState}
        />
      )}
    </div>
  );
}

function readStoredPreferences() {
  const parsed = readStoredJson(window.localStorage, PARTS_PREFERENCES_KEY);
  if (!parsed || typeof parsed !== "object") return DEFAULT_PREFERENCES;
  return {
    ...DEFAULT_PREFERENCES,
    ...parsed,
    persistFilters: {
      ...DEFAULT_PREFERENCES.persistFilters,
      ...(parsed.persistFilters || {}),
    },
  };
}

function readStoredJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
}
