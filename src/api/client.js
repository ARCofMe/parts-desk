const API_BASE = (import.meta.env.VITE_OPS_HUB_API_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
const API_TOKEN = import.meta.env.VITE_OPS_HUB_API_TOKEN || "";
export const PARTS_USER_ID_STORAGE_KEY = "partsdesk-parts-user-id";
const DEFAULT_PARTS_USER_ID = import.meta.env.VITE_PARTS_USER_ID || "";
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_OPS_HUB_API_TIMEOUT_MS || 15000);
const PARTS_READ_TIMEOUT_MS = Number(import.meta.env.VITE_OPS_HUB_PARTS_READ_TIMEOUT_MS || 90000);

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const hasBody = options.body !== undefined;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        "X-Parts-Subject": getPartsUserId(),
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    const payload = parsePayload(text);
    if (!response.ok) {
      throw new Error(buildErrorMessage(response.status, payload, text));
    }
    return payload;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw new Error(`Ops Hub request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    if (error instanceof TypeError) {
      throw new Error("Could not reach Ops Hub. Check that ops-hub is running and the API base URL is correct.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const partsApi = {
  getBoard() {
    return request("/parts/board", { timeoutMs: PARTS_READ_TIMEOUT_MS });
  },
  getCases(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== "") params.set(key, value);
    });
    const suffix = params.size ? `?${params.toString()}` : "";
    return request(`/parts/cases${suffix}`, { timeoutMs: PARTS_READ_TIMEOUT_MS });
  },
  getCase(reference) {
    return request(`/parts/cases/${encodeURIComponent(reference)}`, { timeoutMs: PARTS_READ_TIMEOUT_MS });
  },
  getCaseTimeline(reference) {
    return request(`/parts/cases/${encodeURIComponent(reference)}/timeline`, { timeoutMs: PARTS_READ_TIMEOUT_MS });
  },
  getRecommendationConversation(srId) {
    return request(`/parts/sr/${srId}/recommendation_conversation`, { timeoutMs: PARTS_READ_TIMEOUT_MS });
  },
  submitComplaintEvidenceFeedback(srId, body = {}) {
    return request(`/parts/sr/${srId}/complaint_intelligence/feedback`, { method: "POST", body });
  },
  getRequests(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== "") params.set(key, value);
    });
    const suffix = params.size ? `?${params.toString()}` : "";
    return request(`/parts/requests${suffix}`, { timeoutMs: PARTS_READ_TIMEOUT_MS });
  },
  getRequest(requestId) {
    return request(`/parts/requests/${requestId}`, { timeoutMs: PARTS_READ_TIMEOUT_MS });
  },
  postRequestAction(requestId, action, body = {}) {
    return request(`/parts/requests/${requestId}/${action}`, { method: "POST", body });
  },
  postCaseAction(srId, action, body = {}) {
    return request(`/parts/sr/${srId}/${action}`, { method: "POST", body });
  },
  sync() {
    return request("/parts/requests/sync", { method: "POST" });
  },
  reconcile() {
    return request("/parts/requests/reconcile", { method: "POST" });
  },
};

export function getPartsUserId() {
  const stored = readLocalStorage(PARTS_USER_ID_STORAGE_KEY);
  return (stored || DEFAULT_PARTS_USER_ID || "").trim();
}

export function setPartsUserId(value) {
  const cleaned = `${value || ""}`.trim();
  if (cleaned) {
    writeLocalStorage(PARTS_USER_ID_STORAGE_KEY, cleaned);
  } else {
    removeLocalStorage(PARTS_USER_ID_STORAGE_KEY);
  }
  return cleaned;
}

function readLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return "";
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Browser storage can be blocked; keep the UI usable with env/default identity.
  }
}

function removeLocalStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Browser storage can be blocked; clearing should not crash the app.
  }
}

function parsePayload(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildErrorMessage(status, payload, text) {
  const message =
    (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string" && payload.message) ||
    (typeof payload === "string" ? payload : "") ||
    text ||
    `HTTP ${status}`;

  if (status === 401) return `${message} Check the Ops Hub API token.`;
  if (status === 403) return `${message} ${buildPartsIdentityHint()}`;
  return message;
}

function buildPartsIdentityHint() {
  const current = getPartsUserId();
  const identity = current ? `Sent operator ID "${current}".` : "No PartsDesk operator ID is set in this browser.";
  return `${identity} Check the OpsHub parts/admin operator allowlist and the ${PARTS_USER_ID_STORAGE_KEY} browser setting.`;
}
