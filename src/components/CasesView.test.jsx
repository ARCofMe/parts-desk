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
        }}
        detailLoading={false}
        actionState={null}
        onCaseAction={vi.fn()}
        onOpenRequests={vi.fn()}
        onOpenRequest={vi.fn()}
      />
    );

    expect(screen.getByText("Dispatch handoff brief")).toBeInTheDocument();
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
