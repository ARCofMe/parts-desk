import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import CasesView from "./CasesView";

describe("CasesView", () => {
  it("filters visible parts cases by stage", () => {
    render(
      <CasesView
        items={[
          {
            caseId: "parts:SR-100",
            reference: "SR-100",
            stage: "part_ordered",
            stageLabel: "Ordered",
            nextAction: "Post ETA",
            status: "open",
            ageBucket: "warm",
            assignedPartsLabel: "Parts 1",
          },
          {
            caseId: "parts:SR-101",
            reference: "SR-101",
            stage: "part_received",
            stageLabel: "Received",
            nextAction: "Schedule with dispatch",
            status: "open",
            ageBucket: "fresh",
            assignedPartsLabel: "Parts 2",
          },
        ]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectCase={vi.fn()}
        selectedCase={null}
        selectedCaseDetail={null}
        actionState={null}
        onCaseAction={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Stage"), { target: { value: "received" } });

    expect(screen.getByText("SR-101")).toBeInTheDocument();
    expect(screen.queryByText("SR-100")).not.toBeInTheDocument();
  });

  it("calls refresh and clears the error state after rerender", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <CasesView
        items={[]}
        loading={false}
        error="Could not load parts cases."
        onRefresh={onRefresh}
        onSelectCase={vi.fn()}
        selectedCase={null}
        selectedCaseDetail={null}
        detailLoading={false}
        actionState={null}
        onCaseAction={vi.fn()}
        onOpenRequests={vi.fn()}
        onOpenRequest={vi.fn()}
      />
    );

    expect(screen.getByText("Could not load parts cases.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(
      <CasesView
        items={[
          {
            caseId: "parts:SR-102",
            reference: "SR-102",
            stage: "part_received",
            stageLabel: "Received",
            nextAction: "Verify and stage",
            status: "open",
            ageBucket: "fresh",
            assignedPartsLabel: "Parts 3",
          },
        ]}
        loading={false}
        error=""
        onRefresh={onRefresh}
        onSelectCase={vi.fn()}
        selectedCase={null}
        selectedCaseDetail={null}
        detailLoading={false}
        actionState={null}
        onCaseAction={vi.fn()}
        onOpenRequests={vi.fn()}
        onOpenRequest={vi.fn()}
      />
    );

    expect(screen.queryByText("Could not load parts cases.")).not.toBeInTheDocument();
    expect(screen.getByText("SR-102")).toBeInTheDocument();
  });

  it("builds a copyable dispatch handoff brief for selected cases", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <CasesView
        items={[]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectCase={vi.fn()}
        selectedCase={{ reference: "SR-200" }}
        selectedCaseDetail={{
          case: {
            caseId: "parts:SR-200",
            srId: 200,
            reference: "SR-200",
            stage: "part_received",
            stageLabel: "Received",
            status: "open",
            serviceRequestStatus: "Parts Received",
            nextAction: "Schedule return visit",
            blocker: "",
          },
          trackedRequests: [{ requestId: 5, status: "received", description: "Igniter kit" }],
          timeline: { entries: [] },
          recommendationConversation: {
            available: true,
            conversation: {
              supportedPartRecommendations: [
                { item: "IGN-1", itemType: "part", matchingRequestCount: 3, score: 0.75 },
              ],
              diagnosticQuestions: ["Does the igniter glow?"],
              unsupportedPartsPolicy: "Do not present unsupported parts as recommendations.",
              evidenceSummary: {
                confidence: "moderate",
                matchedHistoricalRequestCount: 4,
                modelFamilyTrends: {
                  modelFamily: "DG45",
                  requestCount: 6,
                  topParts: [{ item: "IGN-1", count: 4 }],
                  topComplaintTags: [{ tag: "no_heat", count: 5 }],
                },
                feedbackSummary: { counts: { helpful: 1 }, latest: { outcome: "helpful" } },
              },
            },
          },
        }}
        detailLoading={false}
        actionState={null}
        onCaseAction={vi.fn()}
        onOpenRequests={vi.fn()}
        onOpenRequest={vi.fn()}
      />
    );

    expect(screen.getByText("Dispatch handoff brief")).toBeInTheDocument();
    expect(screen.getByText("PartsCannon evidence")).toBeInTheDocument();
    expect(screen.getAllByText("IGN-1").length).toBeGreaterThan(0);
    expect(screen.getByText("DG45 trend")).toBeInTheDocument();
    expect(screen.getByText(/Helpful 1/)).toBeInTheDocument();
    expect(screen.getByText("Ask before ordering")).toBeInTheDocument();
    expect(screen.getByText("Does the igniter glow?")).toBeInTheDocument();
    expect(screen.getByText("Do not present unsupported parts as recommendations.")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy brief" }));
    });

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("SR-200: Received"));
    });
    await waitFor(() => {
      expect(screen.getByText("Copied dispatch handoff brief.")).toBeInTheDocument();
    });
  });

  it("records parts evidence feedback from the case detail", () => {
    const onEvidenceFeedback = vi.fn();

    render(
      <CasesView
        items={[]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectCase={vi.fn()}
        selectedCase={{ reference: "SR-203" }}
        selectedCaseDetail={{
          case: {
            caseId: "parts:SR-203",
            srId: 203,
            reference: "SR-203",
            stage: "part_ordered",
            stageLabel: "Ordered",
            status: "open",
          },
          trackedRequests: [],
          timeline: { entries: [] },
          recommendationConversation: {
            available: true,
            conversation: {
              supportedPartRecommendations: [{ item: "PUMP-1", itemType: "part", matchingRequestCount: 2, score: 0.5 }],
              diagnosticQuestions: [],
              evidenceSummary: { feedbackSummary: { counts: {}, latest: null } },
            },
          },
        }}
        detailLoading={false}
        actionState={null}
        evidenceFeedbackState={{ message: "Recorded evidence feedback as helpful." }}
        onCaseAction={vi.fn()}
        onEvidenceFeedback={onEvidenceFeedback}
        onOpenRequests={vi.fn()}
        onOpenRequest={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Evidence helped" }));

    expect(onEvidenceFeedback).toHaveBeenCalledWith("helpful", "PUMP-1");
    expect(screen.getByText("Recorded evidence feedback as helpful.")).toBeInTheDocument();
  });

  it("builds a scheduling handoff focused on received request lines", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <CasesView
        items={[]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectCase={vi.fn()}
        selectedCase={{ reference: "SR-201" }}
        selectedCaseDetail={{
          case: {
            caseId: "parts:SR-201",
            srId: 201,
            reference: "SR-201",
            stage: "part_received",
            stageLabel: "Received",
            status: "open",
            serviceRequestStatus: "Parts Received",
            nextAction: "Schedule return visit",
          },
          trackedRequests: [
            { requestId: 5, status: "ordered", description: "Drain pump" },
            { requestId: 6, status: "received", description: "Igniter kit" },
          ],
          timeline: { entries: [] },
        }}
        detailLoading={false}
        actionState={null}
        onCaseAction={vi.fn()}
        onOpenRequests={vi.fn()}
        onOpenRequest={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy scheduling handoff" }));
    });

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("#6 received: Igniter kit"));
    });
    expect(writeText.mock.calls[0][0]).not.toContain("Drain pump");
  });

  it("shows the handoff text when clipboard copy is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined });

    render(
      <CasesView
        items={[]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectCase={vi.fn()}
        selectedCase={{ reference: "SR-202" }}
        selectedCaseDetail={{
          case: {
            caseId: "parts:SR-202",
            srId: 202,
            reference: "SR-202",
            stage: "part_ordered",
            stageLabel: "Ordered",
            status: "open",
            nextAction: "Post ETA",
          },
          trackedRequests: [],
          timeline: { entries: [] },
        }}
        detailLoading={false}
        actionState={null}
        onCaseAction={vi.fn()}
        onOpenRequests={vi.fn()}
        onOpenRequest={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy brief" }));
    });

    expect(screen.getByText("Clipboard unavailable. Handoff brief is shown below.")).toBeInTheDocument();
  });
});
