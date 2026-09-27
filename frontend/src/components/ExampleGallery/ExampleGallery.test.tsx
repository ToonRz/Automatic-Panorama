import { render, screen, waitFor, within } from "@testing-library/react";
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

function renderGallery(props: Partial<Parameters<typeof ExampleGallery>[0]> = {}) {
  const onLoadSample = vi.fn();
  render(
    <ExampleGallery onLoadSample={onLoadSample} currentFiles={[]} detector="SIFT" {...props} />,
  );
  return { onLoadSample, user: userEvent.setup() };
}

function sampleButton(name: RegExp) {
  return screen.getByRole("button", { name });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExampleGallery", () => {
  it("shows the samples without an expand step and loads one in a single click", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jpegResponse());
    const { onLoadSample, user } = renderGallery();

    await user.click(sampleButton(/Harbour boats/));

    await waitFor(() => expect(onLoadSample).toHaveBeenCalledTimes(1));
    const files: File[] = onLoadSample.mock.calls[0][0];
    expect(files.map((file) => file.name)).toEqual(["boat1.jpg", "boat2.jpg", "boat3.jpg"]);
    expect(files.every((file) => file.type === "image/jpeg")).toBe(true);
  });

  it("reports an actionable error instead of loading a missing asset, and retries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlFallbackResponse(404));
    const { onLoadSample, user } = renderGallery();

    await user.click(sampleButton(/Harbour boats/));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Couldn’t load “Harbour boats”/);
    expect(onLoadSample).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValue(jpegResponse());
    await user.click(within(alert).getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(onLoadSample).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects a 200 response that is not an image", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlFallbackResponse(200));
    const { onLoadSample, user } = renderGallery();

    await user.click(sampleButton(/Harbour boats/));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onLoadSample).not.toHaveBeenCalled();
  });

  it("names the error each failure set produces for the selected detector", async () => {
    const { user } = renderGallery({ detector: "SIFT" });

    await user.click(screen.getByRole("button", { name: /Known failures/ }));

    expect(screen.queryByText("Harbour boats")).not.toBeInTheDocument();
    expect(sampleButton(/Blank sky/)).toHaveTextContent("NO_DESCRIPTORS");
    expect(sampleButton(/Repeating pattern/)).toHaveTextContent("INSUFFICIENT_MATCHES");
  });

  it("switches the repeating-pattern code to the RANSAC rejection under ORB", async () => {
    const { user } = renderGallery({ detector: "ORB" });

    await user.click(screen.getByRole("button", { name: /Known failures/ }));

    expect(sampleButton(/Repeating pattern/)).toHaveTextContent("INSUFFICIENT_INLIERS");
  });

  it("marks the sample whose frames are the current selection", () => {
    const current = ["budapest1.jpg", "budapest2.jpg", "budapest3.jpg"].map(
      (name) => new File(["x"], name, { type: "image/jpeg" }),
    );
    renderGallery({ currentFiles: current });

    expect(sampleButton(/Budapest parliament/)).toHaveTextContent("Loaded into Source frames");
    expect(sampleButton(/Harbour boats/)).not.toHaveTextContent("Loaded");
  });
});
