import { CarouselDocument, ImageSlotLayerNode, SlideSceneNode } from '../types/schema';
import { resolveLineHeightMultiplier, resolveLetterSpacingPx, transformTextCase, calculateVerticalAlignOffset } from './textEngine';
import { resolveCssFontFamily, loadFont } from './fontLoader';
import { adjustedImage, imageCrop as cropImageLayer, roundedImagePath } from './imageRendering';

export type ExportFormat = 'png' | 'zip' | 'pdf';

function fileStem(title: string) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dara-carousel';
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('An image could not be loaded for export. Replace it or remove the layer, then retry.'));
    image.src = src;
  });
}

function imageCrop(layer: ImageSlotLayerNode, image: HTMLImageElement) {
  if (layer.fit !== 'cover' && layer.fit !== 'crop') return undefined;
  const frameRatio = layer.width / layer.height;
  let width = image.width;
  let height = image.height;
  let x = 0;
  let y = 0;
  if (image.width / image.height > frameRatio) {
    width = image.height * frameRatio;
    x = Math.max(0, Math.min(image.width - width, image.width * (layer.focalPoint?.x ?? 0.5) - width / 2));
  } else {
    height = image.width / frameRatio;
    y = Math.max(0, Math.min(image.height - height, image.height * (layer.focalPoint?.y ?? 0.5) - height / 2));
  }
  return { x, y, width, height };
}

async function renderSlide(slide: SlideSceneNode, pixelRatio: number): Promise<Blob> {
  const { default: Konva } = await import('konva');
  const { getGradientFillProps } = await import('../components/KonvaCanvas');
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-10000px;top:0;width:1080px;height:1440px;';
  document.body.appendChild(container);
  const stage = new Konva.Stage({ container, width: 1080, height: 1440 });
  const scene = new Konva.Layer();
  stage.add(scene);
  try {
    scene.add(new Konva.Rect({ width: 1080, height: 1440, fill: slide.backgroundColor || '#111111', listening: false }));
    for (const layer of [...slide.layers].reverse()) {
      if (!layer.isVisible) continue;
      const common = { x: layer.x, y: layer.y, rotation: layer.rotation, opacity: layer.opacity, listening: false };
      if (layer.type === 'text') {
        await Promise.race([
          loadFont(layer.fontFamily, layer.fontWeight),
          new Promise(resolve => window.setTimeout(resolve, 2500)),
        ]);
        const lineHeight = resolveLineHeightMultiplier(layer.lineHeightConfig || layer.lineHeight, layer.fontSize);
        const offset = calculateVerticalAlignOffset(layer.height, layer.fontSize * lineHeight, layer.verticalAlign);
        scene.add(new Konva.Text({
          ...common, y: layer.y + offset, width: layer.width, height: layer.height - offset,
          text: transformTextCase(layer.content, layer.textCase), fontSize: layer.fontSize,
          fontFamily: resolveCssFontFamily(layer.fontFamily),
          fontStyle: layer.fontStyle === 'italic' ? `italic ${layer.fontWeight || '400'}` : layer.fontWeight || '400',
          lineHeight, letterSpacing: resolveLetterSpacingPx(layer.letterSpacingConfig || layer.letterSpacing, layer.fontSize),
          fill: layer.fill, align: layer.align === 'justify' ? 'left' : layer.align,
          textDecoration: layer.textDecoration === 'none' ? undefined : layer.textDecoration,
          stroke: layer.textStroke?.color, strokeWidth: layer.textStroke?.width || 0,
        }));
      } else if (layer.type === 'shape') {
        const fill = getGradientFillProps(layer.fill, layer.width, layer.height);
        const stroke = layer.stroke?.enabled ? layer.stroke.color : undefined;
        const strokeWidth = layer.stroke?.enabled ? layer.stroke.width : 0;
        if (layer.shapeType === 'ellipse') {
          scene.add(new Konva.Ellipse({ ...common, x: layer.x + layer.width / 2, y: layer.y + layer.height / 2,
            radiusX: layer.width / 2, radiusY: layer.height / 2, ...fill, stroke, strokeWidth }));
        } else if (layer.shapeType === 'line') {
          scene.add(new Konva.Line({ ...common, points: [0, layer.height / 2, layer.width, layer.height / 2],
            stroke: typeof layer.fill === 'string' ? layer.fill : '#0A84FF', strokeWidth: layer.stroke?.width || 8 }));
        } else {
          scene.add(new Konva.Rect({ ...common, width: layer.width, height: layer.height,
            cornerRadius: layer.borderRadius || (layer.shapeType === 'rounded-rectangle' ? 16 : 0),
            ...fill, stroke, strokeWidth }));
        }
      } else if (layer.type === 'image' || layer.type === 'image-slot' || layer.type === 'logo') {
        const source = layer.type === 'image' ? layer.localPreviewUrl || layer.url
          : layer.type === 'image-slot' ? layer.assignedMediaUrl || layer.url || layer.fallbackUrl : layer.url;
        if (!source) continue;
        const image = await loadImage(source);
        if (layer.type === 'image') {
          const rendered = adjustedImage(image, layer.adjustments);
          const group = new Konva.Group(common);
          const clipped = new Konva.Group({
            clipFunc: context => roundedImagePath(context, layer.width, layer.height, layer.borderRadius || 0),
          });
          clipped.add(new Konva.Image({
            width: layer.width,
            height: layer.height,
            image: rendered,
            crop: cropImageLayer(layer, rendered),
            listening: false,
          }));
          group.add(clipped);
          if (layer.stroke?.width) {
            group.add(new Konva.Rect({
              width: layer.width,
              height: layer.height,
              cornerRadius: layer.borderRadius || 0,
              stroke: layer.stroke.color || '#FFFFFF',
              strokeWidth: layer.stroke.width,
              listening: false,
            }));
          }
          scene.add(group);
        } else {
          scene.add(new Konva.Image({ ...common, width: layer.width, height: layer.height, image,
            crop: layer.type === 'image-slot' ? imageCrop(layer, image) : undefined }));
        }
      }
    }
    scene.draw();
    const canvas = stage.toCanvas({ pixelRatio });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not render this slide.')), 'image/png');
    });
  } finally {
    stage.destroy();
    container.remove();
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read rendered slide.'));
    reader.readAsDataURL(blob);
  });
}

export async function exportCarousel(doc: CarouselDocument, format: ExportFormat, pixelRatio: number,
  onProgress?: (completed: number, total: number) => void) {
  if (doc.slides.length === 0) throw new Error('This carousel has no slides to export.');
  const stem = fileStem(doc.title);
  const rendered: Blob[] = [];
  for (let index = 0; index < doc.slides.length; index++) {
    rendered.push(await renderSlide(doc.slides[index], pixelRatio));
    onProgress?.(index + 1, doc.slides.length);
  }
  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1440], compress: true, hotfixes: ['px_scaling'] });
    for (let index = 0; index < rendered.length; index++) {
      if (index > 0) pdf.addPage([1080, 1440], 'portrait');
      pdf.addImage(await blobToDataUrl(rendered[index]), 'PNG', 0, 0, 1080, 1440);
    }
    pdf.save(`${stem}.pdf`);
  } else if (format === 'zip') {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    rendered.forEach((blob, index) => zip.file(`${stem}-slide-${String(index + 1).padStart(2, '0')}.png`, blob));
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${stem}.zip`);
  } else {
    rendered.forEach((blob, index) => downloadBlob(blob, `${stem}-slide-${String(index + 1).padStart(2, '0')}.png`));
  }
}

export async function exportSingleSlidePNG(doc: CarouselDocument, slideIndex: number) {
  const slide = doc.slides[slideIndex];
  if (!slide) throw new Error('Slide not found.');
  downloadBlob(await renderSlide(slide, 1), `${fileStem(doc.title)}-slide-${slideIndex + 1}.png`);
}

export async function exportCarouselAsPNG(doc: CarouselDocument) { await exportCarousel(doc, 'png', 1); }
export async function exportCarouselAsZip(doc: CarouselDocument) { await exportCarousel(doc, 'zip', 1); }
export async function exportCarouselAsPDF(doc: CarouselDocument) { await exportCarousel(doc, 'pdf', 1); }
export const exportCarouselPDF = exportCarouselAsPDF;
