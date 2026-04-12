import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsView from "./SettingsView";

describe("SettingsView", () => {
  it("shows ecosystem readiness and quick links", () => {
    render(
      <SettingsView
        themeMode="dark"
        onThemeModeChange={vi.fn()}
        preferences={{
          rememberLastCase: true,
          restoreLastCaseOnLaunch: false,
          rememberLastRequest: true,
          restoreLastRequestOnLaunch: false,
          persistFilters: { cases: true, requests: true },
        }}
        onPreferencesChange={vi.fn()}
        partsUserId="42"
        onPartsUserIdChange={vi.fn()}
        onClearSavedState={vi.fn()}
        workspaceLinks={{
          routeDeskUrl: "route.example.com",
          partsAppUrl: "",
          fieldDeskUrl: "",
        }}
        onWorkspaceLinksChange={vi.fn()}
      />,
    );

    expect(screen.getByText("1 of 3 workspaces configured.")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 linked")).toBeInTheDocument();
    expect(screen.getByText("Current app")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open RouteDesk" })).toHaveAttribute("href", "https://route.example.com/");
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("4 / 6")).toBeInTheDocument();
    expect(screen.getByText("FieldDesk launcher ready")).toBeInTheDocument();
    expect(screen.getByText("Next fixes: FieldDesk launcher ready, Restore last case on launch")).toBeInTheDocument();
    expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);
  });

  it("edits the per-browser parts user id from settings", () => {
    const onPartsUserIdChange = vi.fn();
    render(
      <SettingsView
        themeMode="dark"
        onThemeModeChange={vi.fn()}
        preferences={{
          rememberLastCase: true,
          restoreLastCaseOnLaunch: false,
          rememberLastRequest: true,
          restoreLastRequestOnLaunch: false,
          persistFilters: { cases: true, requests: true },
        }}
        onPreferencesChange={vi.fn()}
        partsUserId=""
        onPartsUserIdChange={onPartsUserIdChange}
        onClearSavedState={vi.fn()}
        workspaceLinks={{ routeDeskUrl: "", partsAppUrl: "", fieldDeskUrl: "" }}
        onWorkspaceLinksChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("OpsHub operator ID"), { target: { value: "parts-42" } });

    expect(onPartsUserIdChange).toHaveBeenCalledWith("parts-42");
  });
});
