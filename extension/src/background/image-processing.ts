import type { ThumbnailMeta } from "../lib/library/types";

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;
const BACKDROP_WORK_WIDTH = 64;
const BACKDROP_BLUR_FILTER = "blur(12px)";
const BACKDROP_JPEG_QUALITY = 0.6;
const COLOR_SAMPLE_SIZE = 16;

export async function processComponentThumbnail(screenshotDataUrl: string): Promise<ThumbnailMeta | null> {
  try {
    const { width, height } = await getImageDimensions(screenshotDataUrl);
    const [blurredBackdropDataUrl, dominantColor] = await Promise.all([
      generateBlurredBackdrop(screenshotDataUrl, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT),
      extractDominantColor(screenshotDataUrl)
    ]);

    return {
      originalWidth: width,
      originalHeight: height,
      aspectRatio: width / height,
      dominantColor,
      blurredBackdropDataUrl
    };
  } catch {
    return null;
  }
}

export async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  const bitmap = await decodeBitmap(dataUrl);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

export async function generateBlurredBackdrop(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const sourceBitmap = await decodeBitmap(dataUrl);

  const workWidth = Math.min(BACKDROP_WORK_WIDTH, sourceBitmap.width);
  const workHeight = Math.max(1, Math.round((sourceBitmap.height / sourceBitmap.width) * workWidth));

  const workCanvas = new OffscreenCanvas(workWidth, workHeight);
  const workContext = workCanvas.getContext("2d");
  if (!workContext) {
    sourceBitmap.close();
    throw new Error("Unable to initialize backdrop canvas.");
  }

  workContext.drawImage(sourceBitmap, 0, 0, workWidth, workHeight);
  sourceBitmap.close();

  const outputCanvas = new OffscreenCanvas(targetWidth, targetHeight);
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) {
    throw new Error("Unable to initialize output canvas.");
  }

  const cover = calculateCoverRect(workWidth, workHeight, targetWidth, targetHeight);
  outputContext.filter = BACKDROP_BLUR_FILTER;
  outputContext.drawImage(workCanvas, cover.x, cover.y, cover.width, cover.height);
  outputContext.filter = "none";

  const backdropBlob = await outputCanvas.convertToBlob({
    type: "image/jpeg",
    quality: BACKDROP_JPEG_QUALITY
  });

  return blobToDataUrl(backdropBlob);
}

export async function extractDominantColor(dataUrl: string): Promise<string> {
  const sourceBitmap = await decodeBitmap(dataUrl, {
    resizeWidth: COLOR_SAMPLE_SIZE,
    resizeHeight: COLOR_SAMPLE_SIZE,
    resizeQuality: "high"
  });

  const canvas = new OffscreenCanvas(sourceBitmap.width, sourceBitmap.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    sourceBitmap.close();
    throw new Error("Unable to initialize color extraction canvas.");
  }

  context.drawImage(sourceBitmap, 0, 0);
  sourceBitmap.close();

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let alphaTotal = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    if (alpha <= 0) {
      continue;
    }
    redTotal += data[index] * alpha;
    greenTotal += data[index + 1] * alpha;
    blueTotal += data[index + 2] * alpha;
    alphaTotal += alpha;
  }

  if (alphaTotal <= 0) {
    return "#8aa8c7";
  }

  const averageRed = Math.round(redTotal / alphaTotal);
  const averageGreen = Math.round(greenTotal / alphaTotal);
  const averageBlue = Math.round(blueTotal / alphaTotal);

  return normalizeDominantColor(averageRed, averageGreen, averageBlue);
}

function calculateCoverRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { x: number; y: number; width: number; height: number } {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    const drawHeight = targetHeight;
    const drawWidth = drawHeight * sourceAspect;
    const x = (targetWidth - drawWidth) / 2;
    return { x, y: 0, width: drawWidth, height: drawHeight };
  }

  const drawWidth = targetWidth;
  const drawHeight = drawWidth / sourceAspect;
  const y = (targetHeight - drawHeight) / 2;
  return { x: 0, y, width: drawWidth, height: drawHeight };
}

function normalizeDominantColor(red: number, green: number, blue: number): string {
  const { h, s, l } = rgbToHsl(red, green, blue);

  const tonedSaturation = clamp(s * 0.78, 0.14, 0.58);
  const tonedLightness = clamp(l < 0.36 ? l + 0.14 : l, 0.28, 0.7);
  const normalizedRgb = hslToRgb(h, tonedSaturation, tonedLightness);

  return toHex(normalizedRgb.r, normalizedRgb.g, normalizedRgb.b);
}

function rgbToHsl(red: number, green: number, blue: number): { h: number; s: number; l: number } {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

function hslToRgb(hue: number, saturation: number, lightness: number): { r: number; g: number; b: number } {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (huePrime >= 0 && huePrime < 1) {
    rPrime = chroma;
    gPrime = x;
  } else if (huePrime >= 1 && huePrime < 2) {
    rPrime = x;
    gPrime = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    gPrime = chroma;
    bPrime = x;
  } else if (huePrime >= 3 && huePrime < 4) {
    gPrime = x;
    bPrime = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    rPrime = x;
    bPrime = chroma;
  } else {
    rPrime = chroma;
    bPrime = x;
  }

  const matchLightness = lightness - chroma / 2;
  return {
    r: Math.round((rPrime + matchLightness) * 255),
    g: Math.round((gPrime + matchLightness) * 255),
    b: Math.round((bPrime + matchLightness) * 255)
  };
}

function toHex(red: number, green: number, blue: number): string {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
}

function toHexChannel(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

async function decodeBitmap(
  dataUrl: string,
  options?: ImageBitmapOptions & {
    resizeWidth?: number;
    resizeHeight?: number;
    resizeQuality?: ResizeQuality;
  }
): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  const imageBlob = await response.blob();
  return createImageBitmap(imageBlob, options);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to convert image to data URL."));
    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Image conversion produced invalid data."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}
