import { describe, expect, it, vi } from "vitest";

import { prepareImage, type ImagePreparationDependencies } from "./prepareImage";

function dependencies(width: number, height: number, encodedSize = 100) {
  const close = vi.fn();
  const encode = vi.fn().mockResolvedValue(new Blob([new Uint8Array(encodedSize)], { type: "image/jpeg" }));
  const deps: ImagePreparationDependencies = {
    decode: vi.fn().mockResolvedValue({ width, height, source: {} as CanvasImageSource, close }),
    encode,
  };
  return { deps, close, encode };
}

describe("prepareImage decision logic", () => {
  it("passes an accepted in-budget file through byte-identically", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    const { deps, close, encode } = dependencies(1200, 900);
    const prepared = await prepareImage(file, 1600, deps);
    expect(prepared.upload).toBe(file);
    expect(prepared.uploadName).toBe("photo.png");
    expect(encode).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it("shrinks a 4032x3024 frame to 1600x1200 and names the JPEG from its stem", async () => {
    const file = new File(["large"], "IMG.4412.jpeg", { type: "image/jpeg" });
    const { deps, encode } = dependencies(4032, 3024);
    const prepared = await prepareImage(file, 1600, deps);
    expect(encode).toHaveBeenCalledWith(expect.anything(), 1600, 1200, 0.92);
    expect(prepared).toMatchObject({
      uploadName: "IMG.4412.jpg",
      originalWidth: 4032,
      originalHeight: 3024,
      uploadWidth: 1600,
      uploadHeight: 1200,
      resized: true,
    });
  });

  it("re-encodes a decodable unsupported type without enlarging it", async () => {
    const file = new File(["heic"], "phone.heic", { type: "image/heic" });
    const { deps, encode } = dependencies(1000, 750);
    const prepared = await prepareImage(file, 1600, deps);
    expect(encode).toHaveBeenCalledWith(expect.anything(), 1000, 750, 0.92);
    expect(prepared.uploadName).toBe("phone.jpg");
    expect(prepared.resized).toBe(false);
  });
});

const heicToMock = vi.hoisted(() => vi.fn());
vi.mock("heic-to", () => ({ heicTo: heicToMock }));

describe("browser HEIC fallback", () => {
  it.each([
    ["phone.HEIC", ""],
    ["phone.heif", "application/octet-stream"],
    ["phone", "image/heic"],
  ])("decodes %s when the browser lacks HEIC support", async (name, type) => {
    const close = vi.fn();
    heicToMock.mockResolvedValue({ width: 100, height: 80, close });
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("Unsupported")));
    const convertToBlob = vi.fn().mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
    vi.stubGlobal("OffscreenCanvas", class {
      getContext() { return { fillRect() {}, drawImage() {} }; }
      convertToBlob = convertToBlob;
    });
    try {
      const file = new File(["heic"], name, { type });
      const result = await prepareImage(file, 1600);
      expect(heicToMock).toHaveBeenCalledWith({ blob: file, type: "bitmap" });
      expect(result.upload.type).toBe("image/jpeg");
      expect(close).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    }
  });
});
