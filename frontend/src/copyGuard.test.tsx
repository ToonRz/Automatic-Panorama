import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, checkHealth: vi.fn().mockResolvedValue(undefined) };
});

import App from "./App";
import { StatusPill, type BackendStatus } from "./components/StatusPill";
import indexHtml from "../index.html?raw";

const GUARDED_COPY = /CP461|semester|report asks|render\b|docs\//i;

describe("user-facing copy guard", () => {
  it("keeps every screen state free of course, host, and repository copy", async () => {
    vi.stubEnv("VITE_MOCK_API", "true");
    const user = userEvent.setup();
    render(<App />);
    const renderedStates: string[] = [];
    for (const label of [
      "Empty",
      "Frames loaded",
      "Stitching",
      "Stitching (cold start)",
      "Complete",
      "Rejected",
    ]) {
      await user.click(screen.getByRole("button", { name: label }));
      renderedStates.push(document.body.textContent ?? "");
    }
    expect(renderedStates.join("\n")).not.toMatch(GUARDED_COPY);
  });

  it("guards every status-pill label", () => {
    for (const status of ["checking", "waking", "online", "offline"] as BackendStatus[]) {
      const { unmount } = render(<StatusPill status={status} />);
      expect(document.body.textContent).not.toMatch(GUARDED_COPY);
      unmount();
    }
  });

  it("guards the document title and index metadata", () => {
    document.title = "Automatic Panorama Stitcher";
    expect(document.title).not.toMatch(GUARDED_COPY);
    expect(indexHtml).not.toMatch(GUARDED_COPY);
  });
});
