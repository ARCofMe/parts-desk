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

  it("loads PartsCannon recommendation conversations for service requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ available: true })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await partsApi.getRecommendationConversation(100);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/parts/sr/100/recommendation_conversation");
  });

  it("posts complaint evidence feedback for service requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await partsApi.submitComplaintEvidenceFeedback(100, { outcome: "helpful", recommendedItem: "FAN-1" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/parts/sr/100/complaint_intelligence/feedback");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ outcome: "helpful", recommendedItem: "FAN-1" });
  });

  it("clears the per-browser parts user id when blanked", () => {
    setPartsUserId("parts-42");
    setPartsUserId("");

    expect(window.localStorage.getItem(PARTS_USER_ID_STORAGE_KEY)).toBeNull();
  });

  it("keeps parts identity helpers safe when browser storage is blocked", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(getPartsUserId()).toEqual(expect.any(String));
    expect(setPartsUserId("parts-42")).toBe("parts-42");
    expect(setPartsUserId("")).toBe("");
    expect(getItemSpy).toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalled();
    expect(removeItemSpy).toHaveBeenCalled();
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

    await expect(partsApi.getBoard()).rejects.toThrow("partsdesk-parts-user-id browser setting.");
  });

  it("includes the sent parts operator id in 403 responses", async () => {
    setPartsUserId("wrong-parts");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify({ success: false, message: "Parts or admin identity could not be resolved." })),
      }),
    );

    await expect(partsApi.getBoard()).rejects.toThrow('Sent operator ID "wrong-parts".');
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
