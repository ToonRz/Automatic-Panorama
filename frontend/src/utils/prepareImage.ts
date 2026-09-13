import {
  BACKEND_ACCEPTED_TYPES,
  PREPARED_JPEG_QUALITY,
} from "../constants/preparation";

export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
}

export interface ImagePreparationDependencies {
  decode: (file: File) => Promise<DecodedImage>;
  encode: (
    image: DecodedImage,
    width: number,
    height: number,
    quality: number,
  ) => Promise<Blob>;
}

export interface PreparedImage {
  original: File;
  upload: File;
  uploadName: string;
  originalWidth: number;
  originalHeight: number;
  uploadWidth: number;
  uploadHeight: number;
  resized: boolean;
}

async function decodeInBrowser(file: File): Promise<DecodedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    const isHeic = /\.(heic|heif)$/i.test(file.name)
      || /^image\/hei[cf](?:-sequence)?$/i.test(file.type);
    if (!isHeic) throw error;
    // Load the software decoder only on browsers without native HEIC support.
    const { heicTo } = await import("heic-to");
    bitmap = await heicTo({ blob: file, type: "bitmap" });
  }
  return {
    width: bitmap.width,
    height: bitmap.height,
    source: bitmap,
    close: () => bitmap.close(),
  };
}

async function encodeInBrowser(
  image: DecodedImage,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.drawImage(image.source, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.drawImage(image.source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      quality,
    );
  });
}

const BROWSER_DEPENDENCIES: ImagePreparationDependencies = {
  decode: decodeInBrowser,
  encode: encodeInBrowser,
};

function jpegName(name: string): string {
  const separator = name.lastIndexOf(".");
  const stem = separator > 0 ? name.slice(0, separator) : name;
  return `${stem}.jpg`;
}

export async function prepareImage(
  file: File,
  budget: number,
  dependencies: ImagePreparationDependencies = BROWSER_DEPENDENCIES,
): Promise<PreparedImage> {
  const image = await dependencies.decode(file);
  try {
    const longEdge = Math.max(image.width, image.height);
    const scale = Math.min(1, budget / longEdge);
    const uploadWidth = Math.round(image.width * scale);
    const uploadHeight = Math.round(image.height * scale);
    const resized = scale < 1;
    if (!resized && BACKEND_ACCEPTED_TYPES.has(file.type)) {
      return {
        original: file,
        upload: file,
        uploadName: file.name,
        originalWidth: image.width,
        originalHeight: image.height,
        uploadWidth,
        uploadHeight,
        resized,
      };
    }

    const blob = await dependencies.encode(
      image,
      uploadWidth,
      uploadHeight,
      PREPARED_JPEG_QUALITY,
    );
    const uploadName = jpegName(file.name);
    return {
      original: file,
      upload: new File([blob], uploadName, { type: "image/jpeg", lastModified: file.lastModified }),
      uploadName,
      originalWidth: image.width,
      originalHeight: image.height,
      uploadWidth,
      uploadHeight,
      resized,
    };
  } finally {
    image.close();
  }
}
