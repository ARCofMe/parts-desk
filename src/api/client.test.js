import { afterEach, describe, expect, it, vi } from "vitest";
import { PARTS_USER_ID_STORAGE_KEY, getPartsUserId, partsApi, setPartsUserId } from "./client";

describe("partsApi client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.removeItem(PARTS_USER_ID_STORAGE_KEY);
  });

  it("omits json content-type on GET requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ openCases: 2 })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await partsApi.getBoard();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.headers["X-Parts-Subject"]).toBeTypeOf("string");
  });

  it("uses the per-browser parts user id for parts requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ openCases: 2 })),
    });
    vi.stubGlobal("fetch", fetchMock);

    setPartsUserId("parts-42");
    await partsApi.getBoard();

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["X-Parts-Subject"]).toBe("parts-42");
    expect(getPartsUserId()).toBe("parts-42");
  });

  it("clears the per-browser parts user id when blanked", () => {
    setPartsUserId("parts-42");
    setPartsUserId("");

    expect(window.localStorage.getItem(PARTS_USER_ID_STORAGE_KEY)).toBeNull();
  });

  it("adds a clearer parts message for 403 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify({ success: false, message: "Parts or admin identity could not be resolved." })),
      }),
    );

    await expect(partsApi.getBoard()).rejects.toThrow(
      "Parts or admin identity could not be resolved. Check the OpsHub parts/admin operator allowlist.",
    );
  });

  it("uses the extended read timeout for parts board requests", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              text: () => Promise.resolve(JSON.stringify({ openCases: [] })),
            });
          }, 16_000);
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const requestPromise = partsApi.getBoard();
    await vi.advanceTimersByTimeAsync(16_000);

    await expect(requestPromise).resolves.toEqual({ openCases: [] });
    vi.useRealTimers();
  });

  it("keeps the shorter default timeout for write requests", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_, options) =>
        new Promise((_, reject) => {
          options.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
      ),
    );

    const requestPromise = partsApi.sync();
    const rejection = expect(requestPromise).rejects.toThrow("Ops Hub request timed out after 15s.");
    await vi.advanceTimersByTimeAsync(15_000);

    await rejection;
    vi.useRealTimers();
  });
});
