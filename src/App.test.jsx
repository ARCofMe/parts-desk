import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { partsApiMock } = vi.hoisted(() => ({
  partsApiMock: {
    getBoard: vi.fn(),
    getCases: vi.fn(),
    getRequests: vi.fn(),
    getCase: vi.fn(),
    getCaseTimeline: vi.fn(),
    sync: vi.fn(),
  },
}));

vi.mock("./api/client", () => ({
  partsApi: partsApiMock,
  getPartsUserId: () => window.localStorage.getItem("partsdesk-parts-user-id") || "",
  setPartsUserId: (value) => {
    const cleaned = `${value || ""}`.trim();
    if (cleaned) {
      window.localStorage.setItem("partsdesk-parts-user-id", cleaned);
    } else {
      window.localStorage.removeItem("partsdesk-parts-user-id");
    }
    return cleaned;
  },
}));

describe("Parts App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    partsApiMock.getBoard.mockReset();
    partsApiMock.getCases.mockReset();
    partsApiMock.getRequests.mockReset();
    partsApiMock.getCase.mockReset();
    partsApiMock.getCaseTimeline.mockReset();
    partsApiMock.sync.mockReset();
    partsApiMock.getCases.mockResolvedValue({ items: [] });
    partsApiMock.getRequests.mockResolvedValue({ items: [] });
    partsApiMock.getCase.mockResolvedValue({ case: { reference: "SR-100" }, trackedRequests: [] });
    partsApiMock.getCaseTimeline.mockResolvedValue({ entries: [] });
    partsApiMock.sync.mockResolvedValue({ message: "Sync complete." });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the hardened parts auth error on initial board load", async () => {
    partsApiMock.getBoard.mockRejectedValue(
      new Error("Parts or admin identity could not be resolved. Check the OpsHub parts/admin operator allowlist."),
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText("Parts or admin identity could not be resolved. Check the OpsHub parts/admin operator allowlist."),
      ).toBeInTheDocument();
    });
  });

  it("reloads board, cases, and requests after sync", async () => {
    partsApiMock.getBoard
      .mockResolvedValueOnce({
        queueSummary: {
          totalRequests: 1,
          openRequests: 1,
          assignedRequests: 0,
          unassignedRequests: 1,
          syncedRequests: 0,
          resolvedCount: 0,
        },
        caseMetrics: { stageCounts: {}, assignedCases: 0, unassignedCases: 0 },
        openCases: [],
        openTrackedRequests: [],
      })
      .mockResolvedValueOnce({
        queueSummary: {
          totalRequests: 2,
          openRequests: 2,
          assignedRequests: 1,
          unassignedRequests: 1,
          syncedRequests: 2,
          resolvedCount: 0,
        },
        caseMetrics: { stageCounts: {}, assignedCases: 1, unassignedCases: 0 },
        openCases: [],
        openTrackedRequests: [],
      });
    partsApiMock.getCases
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });
    partsApiMock.getRequests
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sync" })).toBeInTheDocument();
      expect(partsApiMock.getBoard).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    await waitFor(() => {
      expect(screen.getByText("Sync complete.")).toBeInTheDocument();
      expect(partsApiMock.getBoard).toHaveBeenCalledTimes(2);
      expect(partsApiMock.getCases).toHaveBeenCalledTimes(2);
      expect(partsApiMock.getRequests).toHaveBeenCalledTimes(2);
    });
  });

  it("reports partial refresh failures after sync without dropping successful reloads", async () => {
    partsApiMock.getBoard
      .mockResolvedValueOnce({ queueSummary: {}, caseMetrics: {}, openCases: [], openTrackedRequests: [] })
      .mockRejectedValueOnce(new Error("Board refresh failed."));
    partsApiMock.getCases
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });
    partsApiMock.getRequests
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sync" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    await waitFor(() => {
      expect(screen.getByText(/Sync complete\./)).toBeInTheDocument();
      expect(screen.getByText(/Board refresh failed\./)).toBeInTheDocument();
    });
  });

  it("clears stale case detail when a later case load fails", async () => {
    partsApiMock.getBoard.mockResolvedValue({
      queueSummary: {},
      caseMetrics: {},
      openCases: [],
      openTrackedRequests: [],
    });
    partsApiMock.getCases.mockResolvedValue({
      items: [
        { caseId: "parts:SR-100", reference: "SR-100", stage: "part_ordered", status: "open" },
        { caseId: "parts:SR-101", reference: "SR-101", stage: "part_received", status: "open" },
      ],
    });
    partsApiMock.getCase
      .mockResolvedValueOnce({ case: { reference: "SR-100", stage: "part_ordered", status: "open" }, trackedRequests: [] })
      .mockRejectedValueOnce(new Error("Could not load parts case detail."));
    partsApiMock.getCaseTimeline
      .mockResolvedValueOnce({ entries: [] })
      .mockResolvedValueOnce({ entries: [] });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Cases" }));
    fireEvent.click(await screen.findByRole("button", { name: /SR-100/i }));
    expect(await screen.findByRole("heading", { name: "SR-100" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /SR-101/i }));

    await waitFor(() => {
      expect(screen.getByText("Could not load parts case detail.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "SR-100" })).not.toBeInTheDocument();
    expect(screen.getByText("Select a parts case to inspect tracked requests and timeline.")).toBeInTheDocument();
  });

  it("keeps case detail visible when only the timeline request fails", async () => {
    partsApiMock.getBoard.mockResolvedValue({
      queueSummary: {},
      caseMetrics: {},
      openCases: [],
      openTrackedRequests: [],
    });
    partsApiMock.getCases.mockResolvedValue({
      items: [{ caseId: "parts:SR-100", reference: "SR-100", stage: "part_ordered", status: "open" }],
    });
    partsApiMock.getCase.mockResolvedValue({
      case: { reference: "SR-100", stage: "part_ordered", status: "open" },
      trackedRequests: [],
    });
    partsApiMock.getCaseTimeline.mockRejectedValue(new Error("Timeline unavailable."));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Cases" }));
    fireEvent.click(await screen.findByRole("button", { name: /SR-100/i }));

    expect(await screen.findByRole("heading", { name: "SR-100" })).toBeInTheDocument();
    expect(screen.getByText("Timeline unavailable.")).toBeInTheDocument();
  });

  it("drops malformed stored preferences instead of crashing on boot", async () => {
    window.localStorage.setItem("parts-preferences", "{bad json");
    partsApiMock.getBoard.mockResolvedValue({ queueSummary: {}, caseMetrics: {}, openCases: [], openTrackedRequests: [] });

    render(<App />);

    await waitFor(() => {
      expect(partsApiMock.getBoard).toHaveBeenCalledTimes(1);
    });
    expect(() => JSON.parse(window.localStorage.getItem("parts-preferences") || "")).not.toThrow();
  });

  it("loads the cases tab from open cases only", async () => {
    partsApiMock.getBoard.mockResolvedValue({ queueSummary: {}, caseMetrics: {}, openCases: [], openTrackedRequests: [] });

    render(<App />);

    await waitFor(() => {
      expect(partsApiMock.getCases).toHaveBeenCalledWith({ status: "open" });
    });
  });

  it("clears the legacy app-name override and keeps the PartsDesk title fixed", async () => {
    window.localStorage.setItem("parts-app-name", "Custom Parts");
    partsApiMock.getBoard.mockResolvedValue({ queueSummary: {}, caseMetrics: {}, openCases: [], openTrackedRequests: [] });

    render(<App />);

    await waitFor(() => {
      expect(partsApiMock.getBoard).toHaveBeenCalledTimes(1);
    });
    expect(window.localStorage.getItem("parts-app-name")).toBeNull();
    expect(document.title).toBe("PartsDesk | OpsHub");
  });

  it("sanitizes stored ecosystem links before rendering header jumps", async () => {
    window.localStorage.setItem(
      "parts-workspace-links",
      JSON.stringify({
        routeDeskUrl: "https://route.example.com",
        partsAppUrl: "https://parts.example.com",
        fieldDeskUrl: "javascript:alert(1)",
      })
    );
    partsApiMock.getBoard.mockResolvedValue({ queueSummary: {}, caseMetrics: {}, openCases: [], openTrackedRequests: [] });

    render(<App />);

    expect(await screen.findByRole("link", { name: "Open RouteDesk" })).toHaveAttribute("href", "https://route.example.com/");
    expect(screen.queryByRole("link", { name: "Open FieldDesk" })).not.toBeInTheDocument();
  });

  it("clears stale case detail when refresh removes the selected case", async () => {
    partsApiMock.getBoard.mockResolvedValue({
      queueSummary: {},
      caseMetrics: {},
      openCases: [],
      openTrackedRequests: [],
    });
    partsApiMock.getCases
      .mockResolvedValueOnce({
        items: [{ caseId: "parts:SR-100", reference: "SR-100", stage: "part_ordered", status: "open" }],
      })
      .mockResolvedValueOnce({ items: [] });
    partsApiMock.getCase.mockResolvedValueOnce({
      case: { reference: "SR-100", stage: "part_ordered", status: "open" },
      trackedRequests: [],
    });
    partsApiMock.getCaseTimeline.mockResolvedValueOnce({ entries: [] });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Cases" }));
    fireEvent.click(await screen.findByRole("button", { name: /SR-100/i }));
    expect(await screen.findByRole("heading", { name: "SR-100" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByText("Select a parts case to inspect tracked requests and timeline.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "SR-100" })).not.toBeInTheDocument();
  });
});
