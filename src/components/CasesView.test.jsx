import { fireEvent, render, screen } from "@testing-library/react";
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
});
