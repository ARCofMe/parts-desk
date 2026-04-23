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
    expect(screen.getByText("Pick request")).toBeInTheDocument();
    expect(screen.getByText("requested: 1")).toBeInTheDocument();
    expect(screen.getByText("ordered: 1")).toBeInTheDocument();
    expect(screen.getByText("Dispatch handoff: waiting eta")).toBeInTheDocument();
    expect(screen.getByText("Request brief")).toBeInTheDocument();
    expect(screen.getByText(/Linked case SR-101 is Ordered/)).toBeInTheDocument();
    expect(screen.getByText("Linked case")).toBeInTheDocument();
    expect(screen.getByText("SR-101 • Ordered")).toBeInTheDocument();
  });

  it("requires a numeric assignee and handles missing linked case details", () => {
    const onRequestAction = vi.fn();
    const onOpenCase = vi.fn();

    render(
      <RequestsView
        items={[]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectRequest={vi.fn()}
        selectedRequest={{ requestId: 20 }}
        selectedRequestDetail={{
          request: {
            requestId: 20,
            reference: "SR-200",
            status: "requested",
            description: "Door switch",
            assignedPartsLabel: "",
            caseStageLabel: "Requested",
            requestedByLabel: "Dispatch 1",
          },
          case: null,
        }}
        detailLoading={false}
        onRequestAction={onRequestAction}
        requestActionState={null}
        onOpenCase={onOpenCase}
      />
    );

    expect(screen.getByText("No linked case detail is available for this tracked request yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open case" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Assign" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Assign to Discord user id"), { target: { value: "77" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));

    expect(onRequestAction).toHaveBeenCalledWith(20, "claim", { assignedPartsUserId: 77 });
    expect(onOpenCase).not.toHaveBeenCalled();
  });

  it("retries request loading via refresh after an error", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <RequestsView
        items={[]}
        loading={false}
        error="Could not load tracked requests."
        onRefresh={onRefresh}
        onSelectRequest={vi.fn()}
        selectedRequest={null}
        selectedRequestDetail={null}
        detailLoading={false}
        onRequestAction={vi.fn()}
        requestActionState={null}
        onOpenCase={vi.fn()}
      />
    );

    expect(screen.getByText("Could not load tracked requests.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(
      <RequestsView
        items={[
          {
            requestId: 12,
            reference: "SR-102",
            status: "received",
            description: "Control board",
            assignedPartsLabel: "Parts 3",
            caseStageLabel: "Received",
            nextAction: "Coordinate with dispatch",
          },
        ]}
        loading={false}
        error=""
        onRefresh={onRefresh}
        onSelectRequest={vi.fn()}
        selectedRequest={null}
        selectedRequestDetail={null}
        detailLoading={false}
        onRequestAction={vi.fn()}
        requestActionState={null}
        onOpenCase={vi.fn()}
      />
    );

    expect(screen.queryByText("Could not load tracked requests.")).not.toBeInTheDocument();
    expect(screen.getByText("#12 • SR-102")).toBeInTheDocument();
  });

  it("disables request actions while a request update is running", () => {
    render(
      <RequestsView
        items={[]}
        loading={false}
        error=""
        onRefresh={vi.fn()}
        onSelectRequest={vi.fn()}
        selectedRequest={{ requestId: 30 }}
        selectedRequestDetail={{
          request: {
            requestId: 30,
            reference: "SR-300",
            status: "requested",
            description: "",
            assignedPartsLabel: "",
            caseStageLabel: "Requested",
            requestedByLabel: "Dispatch 5",
          },
          case: null,
        }}
        detailLoading={false}
        onRequestAction={vi.fn()}
        requestActionState={{ loading: true, message: "Running request update..." }}
        onOpenCase={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Assign" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Claim me" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ordered" })).toBeDisabled();
    expect(screen.getByText("No request description yet.")).toBeInTheDocument();
  });
});
