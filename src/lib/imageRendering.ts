import type { ImageLayerNode } from '../types/schema';

type ImageSource = HTMLImageElement | HTMLCanvasElement;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function imageCrop(layer: ImageLayerNode, image: ImageSource) {
  const imageWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const imageHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const frameRatio = layer.width / layer.height;
  let width = imageWidth;
  let height = imageHeight;

  if (imageWidth / imageHeight > frameRatio) width = imageHeight * frameRatio;
  else height = imageWidth / frameRatio;

  const scale = clamp(layer.crop?.scale || 1, 1, 3);
  width /= scale;
  height /= scale;
  const offsetX = clamp(layer.crop?.offsetX || 0, -1, 1);
  const offsetY = clamp(layer.crop?.offsetY || 0, -1, 1);

  return {
    x: (imageWidth - width) * (offsetX + 1) / 2,
    y: (imageHeight - height) * (offsetY + 1) / 2,
    width,
    height,
  };
}

export function roundedImagePath(
  context: Pick<CanvasRenderingContext2D, 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'closePath'>,
  width: number,
  height: number,
  radius: number,
) {
  const r = clamp(radius, 0, Math.min(width, height) / 2);
  context.moveTo(r, 0);
  context.lineTo(width - r, 0);
  context.quadraticCurveTo(width, 0, width, r);
  context.lineTo(width, height - r);
  context.quadraticCurveTo(width, height, width - r, height);
  context.lineTo(r, height);
  context.quadraticCurveTo(0, height, 0, height - r);
  context.lineTo(0, r);
  context.quadraticCurveTo(0, 0, r, 0);
  context.closePath();
}

export function adjustedImage(image: HTMLImageElement, adjustments: ImageLayerNode['adjustments']): ImageSource {
  if (!adjustments || Object.values(adjustments).every(value => !value)) return image;

  const ratio = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return image;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  try {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    const exposure = Math.pow(2, clamp(adjustments.exposure || 0, -2, 2));
    const contrast = Math.pow(1 + clamp(adjustments.contrast || 0, -100, 100) / 100, 2);
    const saturation = 1 + clamp(adjustments.saturation || 0, -100, 100) / 100;
    const temperature = clamp(adjustments.temperature || 0, -100, 100) * 0.45;
    const highlights = clamp(adjustments.highlights || 0, -100, 100) * 0.8;
    const shadows = clamp(adjustments.shadows || 0, -100, 100) * 0.8;

    for (let i = 0; i < data.length; i += 4) {
      const originalLuma = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
      const highlightWeight = Math.pow(clamp((originalLuma - 0.4) / 0.6, 0, 1), 2);
      const shadowWeight = Math.pow(clamp((0.6 - originalLuma) / 0.6, 0, 1), 2);
      const tonalShift = highlights * highlightWeight + shadows * shadowWeight;
      const red = (data[i] * exposure - 128) * contrast + 128 + tonalShift + temperature;
      const green = (data[i + 1] * exposure - 128) * contrast + 128 + tonalShift;
      const blue = (data[i + 2] * exposure - 128) * contrast + 128 + tonalShift - temperature;
      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      data[i] = clamp(luma + (red - luma) * saturation, 0, 255);
      data[i + 1] = clamp(luma + (green - luma) * saturation, 0, 255);
      data[i + 2] = clamp(luma + (blue - luma) * saturation, 0, 255);
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  } catch {
    return image;
  }
}
