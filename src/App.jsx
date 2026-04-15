import { useEffect, useRef, useState } from "react";
import { getPartsUserId, partsApi, setPartsUserId } from "./api/client";
import BrandBar from "./components/BrandBar";
import TabNav from "./components/TabNav";
import BoardView from "./components/BoardView";
import CasesView from "./components/CasesView";
import RequestsView from "./components/RequestsView";
import SettingsView from "./components/SettingsView";
import { normalizeWorkspaceLinks } from "./workspaceLinks";

const THEME_MODE_KEY = "parts-theme-mode";
const PARTS_PREFERENCES_KEY = "parts-preferences";
const LAST_CASE_KEY = "parts-last-case";
const LAST_REQUEST_KEY = "parts-last-request";
const APP_NAME_KEY = "parts-app-name";
const WORKSPACE_LINKS_KEY = "parts-workspace-links";
const DEFAULT_PREFERENCES = {
  caseFilters: { stage: "", age: "", status: "", reference: "" },
  requestFilters: { status: "", assignedPartsLabel: "", reference: "", caseStageLabel: "" },
  persistFilters: { cases: true, requests: true },
  rememberLastCase: true,
  restoreLastCaseOnLaunch: false,
  rememberLastRequest: true,
  restoreLastRequestOnLaunch: false,
};
const DEFAULT_WORKSPACE_LINKS = {
  opsHubUrl: import.meta.env.VITE_OPSHUB_URL || "",
  routeDeskUrl: import.meta.env.VITE_ROUTEDESK_URL || "",
  partsAppUrl: import.meta.env.VITE_PARTSAPP_URL || "",
  fieldDeskUrl: import.meta.env.VITE_FIELDDESK_URL || "",
};

function resolveThemeMode(themeMode) {
  if (themeMode === "dark") return "dark";
  if (themeMode === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function shallowEqual(left = {}, right = {}) {
  const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  for (const key of keys) {
    if ((left || {})[key] !== (right || {})[key]) return false;
  }
  return true;
}

export default function App() {
  const boardLoadIdRef = useRef(0);
  const casesLoadIdRef = useRef(0);
  const requestsLoadIdRef = useRef(0);
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
  const [caseSectionErrors, setCaseSectionErrors] = useState({});
  const [caseActionState, setCaseActionState] = useState(null);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);

  const [requests, setRequests] = useState([]);
  const [requestsError, setRequestsError] = useState("");
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestActionState, setRequestActionState] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [themeMode, setThemeMode] = useState(() => safeLocalStorageGet(THEME_MODE_KEY) || "dark");
  const [partsUserId, setPartsUserIdState] = useState(() => getPartsUserId());
  const [preferences, setPreferences] = useState(() => readStoredPreferences());
  const [workspaceLinks, setWorkspaceLinks] = useState(() => readStoredWorkspaceLinks());

  useEffect(() => {
    loadBoard();
    loadCases();
    loadRequests();
  }, []);

  useEffect(() => {
    safeLocalStorageSet(THEME_MODE_KEY, themeMode);
    document.documentElement.dataset.theme = resolveThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system") return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      document.documentElement.dataset.theme = mediaQuery.matches ? "dark" : "light";
    };
    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);
    return () => mediaQuery.removeEventListener("change", syncTheme);
  }, [themeMode]);

  useEffect(() => {
    safeLocalStorageRemove(APP_NAME_KEY);
    document.title = "PartsDesk | OpsHub";
  }, []);

  useEffect(() => {
    safeLocalStorageSet(PARTS_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    safeLocalStorageSet(WORKSPACE_LINKS_KEY, JSON.stringify(workspaceLinks));
  }, [workspaceLinks]);

  useEffect(() => {
    if (!preferences.restoreLastCaseOnLaunch) return;
    const lastReference = safeLocalStorageGet(LAST_CASE_KEY);
    if (!lastReference || !cases.length || selectedCase) return;
    const match = cases.find((item) => item.reference === lastReference);
    if (match) {
      handleCaseSelect(match);
    }
  }, [cases, preferences.restoreLastCaseOnLaunch, selectedCase]);

  useEffect(() => {
    if (!preferences.restoreLastRequestOnLaunch) return;
    const lastRequest = safeLocalStorageGet(LAST_REQUEST_KEY);
    if (!lastRequest || !requests.length || selectedRequest) return;
    const match = requests.find((item) => String(item.requestId) === lastRequest);
    if (match) {
      handleRequestSelect(match);
    }
  }, [preferences.restoreLastRequestOnLaunch, requests, selectedRequest]);

  async function loadBoard() {
    const requestId = boardLoadIdRef.current + 1;
    boardLoadIdRef.current = requestId;
    setBoardLoading(true);
    setBoardError("");
    try {
      const payload = await partsApi.getBoard();
      if (boardLoadIdRef.current !== requestId) return;
      setBoard(payload);
    } catch (error) {
      if (boardLoadIdRef.current !== requestId) return;
      setBoardError(formatError(error));
    } finally {
      if (boardLoadIdRef.current !== requestId) return;
      setBoardLoading(false);
    }
  }

  async function loadCases() {
    const requestId = casesLoadIdRef.current + 1;
    casesLoadIdRef.current = requestId;
    setCasesLoading(true);
    setCasesError("");
    try {
      const payload = await partsApi.getCases({ status: "open" });
      if (casesLoadIdRef.current !== requestId) return;
      const nextItems = payload.items || [];
      setCases(nextItems);
      setSelectedCase((current) => {
        if (!current?.reference) return current;
        const match = nextItems.find((item) => item.reference === current.reference);
        if (!match) {
          setSelectedCaseDetail(null);
          setCaseActionState(null);
          return null;
        }
        return match;
      });
    } catch (error) {
      if (casesLoadIdRef.current !== requestId) return;
      setCasesError(formatError(error));
    } finally {
      if (casesLoadIdRef.current !== requestId) return;
      setCasesLoading(false);
    }
  }

  async function loadCaseDetail(reference) {
    const requestId = caseDetailRequestIdRef.current + 1;
    caseDetailRequestIdRef.current = requestId;
    setCaseDetailLoading(true);
    setSelectedCaseDetail(null);
    setCaseSectionErrors({});
    try {
      const [caseResult, timelineResult] = await Promise.allSettled([
        partsApi.getCase(reference),
        partsApi.getCaseTimeline(reference),
      ]);
      if (caseDetailRequestIdRef.current !== requestId) return;
      const nextSectionErrors = {};
      const casePayload = caseResult.status === "fulfilled" ? caseResult.value : null;
      const timelinePayload = timelineResult.status === "fulfilled" ? timelineResult.value : { entries: [] };
      if (caseResult.status === "rejected") {
        nextSectionErrors.case = formatError(caseResult.reason);
      }
      if (timelineResult.status === "rejected") {
        nextSectionErrors.timeline = formatError(timelineResult.reason);
      }
      if (casePayload) {
        setSelectedCaseDetail({ ...casePayload, timeline: timelinePayload });
        setCaseSectionErrors(nextSectionErrors);
      } else {
        setSelectedCaseDetail(null);
        setCaseSectionErrors(nextSectionErrors);
        setCaseActionState({ error: true, message: nextSectionErrors.case || "Could not load parts case detail." });
        return;
      }
      setCaseActionState(null);
    } catch (error) {
      if (caseDetailRequestIdRef.current !== requestId) return;
      setSelectedCaseDetail(null);
      setCaseSectionErrors({});
      setCaseActionState({ error: true, message: formatError(error) });
    } finally {
      if (caseDetailRequestIdRef.current !== requestId) return;
      setCaseDetailLoading(false);
    }
  }

  async function loadRequests() {
    const requestId = requestsLoadIdRef.current + 1;
    requestsLoadIdRef.current = requestId;
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const payload = await partsApi.getRequests();
      if (requestsLoadIdRef.current !== requestId) return;
      const nextItems = payload.items || [];
      setRequests(nextItems);
      setSelectedRequest((current) => {
        if (!current?.requestId) return current;
        const match = nextItems.find((item) => item.requestId === current.requestId);
        if (!match) {
          setSelectedRequestDetail(null);
          setRequestActionState(null);
          return null;
        }
        return match;
      });
    } catch (error) {
      if (requestsLoadIdRef.current !== requestId) return;
      setRequestsError(formatError(error));
    } finally {
      if (requestsLoadIdRef.current !== requestId) return;
      setRequestsLoading(false);
    }
  }

  async function refreshDashboardSlices() {
    const [boardResult, requestsResult, casesResult] = await Promise.allSettled([loadBoard(), loadRequests(), loadCases()]);
    const failures = [boardResult, requestsResult, casesResult]
      .filter((result) => result.status === "rejected")
      .map((result) => formatError(result.reason));
    return failures;
  }

  async function handleSync() {
    setSyncState({ error: false, message: "Sync running…" });
    try {
      const payload = await partsApi.sync();
      const refreshFailures = await refreshDashboardSlices();
      setSyncState({
        error: refreshFailures.length > 0,
        message: [payload.message || "Sync complete", ...refreshFailures].join(" "),
      });
    } catch (error) {
      setSyncState({ error: true, message: formatError(error) });
    }
  }

  async function handleReconcile() {
    setSyncState({ error: false, message: "Reconcile running…" });
    try {
      const payload = await partsApi.reconcile();
      const refreshFailures = await refreshDashboardSlices();
      setSyncState({
        error: refreshFailures.length > 0,
        message: [payload.message || "Reconcile complete", ...refreshFailures].join(" "),
      });
    } catch (error) {
      setSyncState({ error: true, message: formatError(error) });
    }
  }

  async function handleCaseSelect(item) {
    setSelectedCase(item);
    setSelectedCaseDetail(null);
    setCaseSectionErrors({});
    setCaseActionState(null);
    if (preferences.rememberLastCase && item?.reference) {
      safeLocalStorageSet(LAST_CASE_KEY, item.reference);
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
      safeLocalStorageSet(LAST_REQUEST_KEY, String(item.requestId));
    }
    await loadRequestDetail(item.requestId);
  }

  function clearSavedState() {
    safeLocalStorageRemove(LAST_CASE_KEY);
    safeLocalStorageRemove(LAST_REQUEST_KEY);
    safeLocalStorageRemove(PARTS_PREFERENCES_KEY);
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

  function updateCaseFilters(filters) {
    setPreferences((current) => (shallowEqual(current.caseFilters, filters) ? current : { ...current, caseFilters: filters }));
  }

  function updateRequestFilters(filters) {
    setPreferences((current) => (shallowEqual(current.requestFilters, filters) ? current : { ...current, requestFilters: filters }));
  }

  return (
    <div className="app-shell">
      <BrandBar appName="PartsDesk" workspaceLinks={workspaceLinks} currentApp="partsDesk" />
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
          detailErrors={caseSectionErrors}
          initialFilters={preferences.caseFilters}
          persistFilters={preferences.persistFilters.cases}
          onPreferencesChange={updateCaseFilters}
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
          onPreferencesChange={updateRequestFilters}
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
          preferences={preferences}
          onPreferencesChange={setPreferences}
          partsUserId={partsUserId}
          onPartsUserIdChange={(value) => setPartsUserIdState(setPartsUserId(value))}
          onClearSavedState={clearSavedState}
          workspaceLinks={workspaceLinks}
          onWorkspaceLinksChange={(value) => setWorkspaceLinks(normalizeWorkspaceLinks(value))}
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

function readStoredWorkspaceLinks() {
  const parsed = readStoredJson(window.localStorage, WORKSPACE_LINKS_KEY);
  if (!parsed || typeof parsed !== "object") return normalizeWorkspaceLinks(DEFAULT_WORKSPACE_LINKS);
  return normalizeWorkspaceLinks(parsed, DEFAULT_WORKSPACE_LINKS);
}

function readStoredJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    safeLocalStorageRemove(key);
    return null;
  }
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return "";
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Browser storage can be disabled; app state should remain usable in memory.
  }
}

function safeLocalStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Browser storage can be disabled; clearing should not crash the app.
  }
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
}
