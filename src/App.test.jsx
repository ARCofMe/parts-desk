import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { partsApiMock } = vi.hoisted(() => ({
  partsApiMock: {
    getBoard: vi.fn(),
    getCases: vi.fn(),
    getRequests: vi.fn(),
  },
}));

vi.mock("./api/client", () => ({
  partsApi: partsApiMock,
}));

describe("Parts App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    partsApiMock.getBoard.mockReset();
    partsApiMock.getCases.mockReset();
    partsApiMock.getRequests.mockReset();
    partsApiMock.getCases.mockResolvedValue({ items: [] });
    partsApiMock.getRequests.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the hardened parts auth error on initial board load", async () => {
    partsApiMock.getBoard.mockRejectedValue(
      new Error("Parts or admin identity could not be resolved. Check the parts/admin user ID allowlist."),
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText("Parts or admin identity could not be resolved. Check the parts/admin user ID allowlist."),
      ).toBeInTheDocument();
    });
  });
});
