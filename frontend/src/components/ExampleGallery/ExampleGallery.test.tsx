import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExampleGallery } from "./ExampleGallery";

function jpegResponse() {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob(["jpeg-bytes"], { type: "image/jpeg" }),
  } as unknown as Response;
}

/** The SPA fallback a dev server returns for a missing asset. */
function htmlFallbackResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    blob: async () => new Blob(["<!doctype html>"], { type: "text/html" }),
  } as unknown as Response;
}

async function openGallery() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Sample Datasets/ }));
  return user;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExampleGallery", () => {
  it("hands the fetched sample frames to onLoadSample", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jpegResponse());
    const onLoadSample = vi.fn();

    render(<ExampleGallery onLoadSample={onLoadSample} />);
    const user = await openGallery();
    await user.click(screen.getAllByRole("button", { name: "Try this sample" })[0]);

    await waitFor(() => expect(onLoadSample).toHaveBeenCalledTimes(1));
    const files: File[] = onLoadSample.mock.calls[0][0];
    expect(files.map((file) => file.name)).toEqual(["boat1.jpg", "boat2.jpg", "boat3.jpg"]);
    expect(files.every((file) => file.type === "image/jpeg")).toBe(true);
  });

  it("reports an actionable error instead of loading a missing asset", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlFallbackResponse(404));
    const onLoadSample = vi.fn();

    render(<ExampleGallery onLoadSample={onLoadSample} />);
    const user = await openGallery();
    await user.click(screen.getAllByRole("button", { name: "Try this sample" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Could not load the "Overlapping Landscape Sequence" sample/,
    );
    expect(onLoadSample).not.toHaveBeenCalled();
  });

  it("rejects a 200 response that is not an image", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlFallbackResponse(200));
    const onLoadSample = vi.fn();

    render(<ExampleGallery onLoadSample={onLoadSample} />);
    const user = await openGallery();
    await user.click(screen.getAllByRole("button", { name: "Try this sample" })[0]);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onLoadSample).not.toHaveBeenCalled();
  });

  it("switches to the pitfall datasets on the second tab", async () => {
    render(<ExampleGallery onLoadSample={vi.fn()} />);
    const user = await openGallery();

    expect(screen.getByText("Overlapping Landscape Sequence")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Common Pitfalls/ }));

    expect(screen.getByText("Blank Sky/Texture")).toBeInTheDocument();
    expect(screen.queryByText("Overlapping Landscape Sequence")).not.toBeInTheDocument();
  });
});
