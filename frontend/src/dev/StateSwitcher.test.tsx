import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEBUG_STATES } from "./debugStates";
import { StateSwitcher } from "./StateSwitcher";

describe("StateSwitcher", () => {
  it("renders a button for every state in section 4, plus the cold-start variant", () => {
    render(<StateSwitcher current={null} onSelect={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(DEBUG_STATES.length);
    for (const entry of DEBUG_STATES) {
      expect(screen.getByRole("button", { name: entry.label })).toBeInTheDocument();
    }
  });

  it("marks only the current state as pressed", () => {
    render(<StateSwitcher current="complete" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "Complete" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Rejected" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onSelect with the clicked state's key", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StateSwitcher current="empty" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Rejected" }));
    expect(onSelect).toHaveBeenCalledWith("failed");
  });
});
