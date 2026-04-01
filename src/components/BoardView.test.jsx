import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import BoardView from "./BoardView";

describe("BoardView", () => {
  it("renders queue summary and case metrics", () => {
    render(
      <BoardView
        board={{
          queueSummary: {
            totalRequests: 9,
            openRequests: 5,
            assignedRequests: 3,
            unassignedRequests: 2,
            syncedRequests: 4,
            resolvedCount: 1,
          },
          caseMetrics: {
            stageCounts: { part_ordered: 2, part_received: 1 },
            assignedCases: 2,
            unassignedCases: 1,
          },
          openCases: [
            {
              caseId: "parts:SR-100",
              reference: "SR-100",
              stageLabel: "Ordered",
              nextAction: "Post ETA",
              ageBucket: "warm",
              assignedPartsLabel: "Parts 1",
            },
          ],
          openTrackedRequests: [
            {
              requestId: 12,
              reference: "SR-100",
              status: "ordered",
              description: "Drain pump",
              caseStageLabel: "Ordered",
              assignedPartsLabel: "Parts 1",
            },
          ],
        }}
        loading={false}
        error=""
        onOpenCases={vi.fn()}
        onOpenCase={vi.fn()}
        onOpenRequest={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        syncState={null}
      />
    );

    expect(screen.getByText("Total requests")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("part ordered: 2")).toBeInTheDocument();
    expect(screen.getByText("Assigned: 2")).toBeInTheDocument();
    expect(screen.getByText("Needs parts action")).toBeInTheDocument();
    expect(screen.getByText("Open queue")).toBeInTheDocument();
  });
});
