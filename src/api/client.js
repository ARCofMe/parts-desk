const API_BASE = (import.meta.env.VITE_OPS_HUB_API_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
const API_TOKEN = import.meta.env.VITE_OPS_HUB_API_TOKEN || "";
const PARTS_USER_ID = import.meta.env.VITE_PARTS_USER_ID || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      "X-Parts-Subject": PARTS_USER_ID,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    throw new Error((await response.text()) || `HTTP ${response.status}`);
  }
  return response.json();
}

export const partsApi = {
  getBoard() {
    return request("/parts/board");
  },
  getCases(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== "") params.set(key, value);
    });
    const suffix = params.size ? `?${params.toString()}` : "";
    return request(`/parts/cases${suffix}`);
  },
  getCase(reference) {
    return request(`/parts/cases/${encodeURIComponent(reference)}`);
  },
  getCaseTimeline(reference) {
    return request(`/parts/cases/${encodeURIComponent(reference)}/timeline`);
  },
  getRequests(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== "") params.set(key, value);
    });
    const suffix = params.size ? `?${params.toString()}` : "";
    return request(`/parts/requests${suffix}`);
  },
  getRequest(requestId) {
    return request(`/parts/requests/${requestId}`);
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
