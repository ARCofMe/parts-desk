import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import RequestsView from "./RequestsView";

describe("RequestsView", () => {
  it("filters requests and renders linked case detail", () => {
    render(
      <RequestsView
        items={[
          {
            requestId: 10,
            reference: "SR-100",
            status: "requested",
            description: "Igniter",
            assignedPartsLabel: "Parts 1",
            caseStageLabel: "Requested",
            nextAction: "Claim and order",
          },
          {
            requestId: 11,
            reference: "SR-101",
            status: "ordered",
            description: "Blower wheel",
            assignedPartsLabel: "Parts 2",
            caseStageLabel: "Ordered",
            nextAction: "Track ETA",
          },
        ]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectRequest={vi.fn()}
        selectedRequest={{ requestId: 11 }}
        selectedRequestDetail={{
          request: {
            requestId: 11,
            reference: "SR-101",
            status: "ordered",
            description: "Blower wheel",
            assignedPartsLabel: "Parts 2",
            caseStageLabel: "Ordered",
            technicianLabel: "Tech 7",
            requestedByLabel: "Dispatch 1",
          },
          case: {
            reference: "SR-101",
            stageLabel: "Ordered",
            nextAction: "Post tracking",
          },
        }}
        detailLoading={false}
        onRequestAction={vi.fn()}
        requestActionState={null}
        onOpenCase={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "ordered" } });

    expect(screen.getByText("#11 • SR-101")).toBeInTheDocument();
    expect(screen.queryByText("#10 • SR-100")).not.toBeInTheDocument();
    expect(screen.getByText("Linked case")).toBeInTheDocument();
    expect(screen.getByText("SR-101 • Ordered")).toBeInTheDocument();
  });
});
