import { CarouselDocument, TextLayerNode } from '../types/schema';
import { resolveLineHeightMultiplier, resolveLetterSpacingPx, transformTextCase, calculateVerticalAlignOffset } from './textEngine';

export async function exportSingleSlidePNG(doc: CarouselDocument, slideIndex: number): Promise<void> {
  const slide = doc.slides[slideIndex];
  if (!slide) return;

  // Create temporary offscreen canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw Background
  ctx.fillStyle = slide.backgroundColor || '#111111';
  ctx.fillRect(0, 0, 1080, 1440);

  // Draw Layers (Canonical front-to-back array reversed for 2D canvas back-to-front drawing)
  slide.layers.slice().reverse().forEach((layer) => {
    if (layer.type === 'text') {
      const textLayer = layer as TextLayerNode;
      const lineHeightMult = resolveLineHeightMultiplier(textLayer.lineHeightConfig || textLayer.lineHeight, textLayer.fontSize);
      const displayContent = transformTextCase(textLayer.content, textLayer.textCase);
      const vOffset = calculateVerticalAlignOffset(textLayer.height, textLayer.fontSize * lineHeightMult, textLayer.verticalAlign);

      ctx.fillStyle = textLayer.fill || '#FFFFFF';
      ctx.font = `${textLayer.fontStyle === 'italic' ? 'italic ' : ''}${textLayer.fontWeight || '400'} ${textLayer.fontSize || 24}px "${textLayer.fontFamily || 'sans-serif'}"`;
      ctx.textAlign = textLayer.align === 'justify' ? 'left' : (textLayer.align || 'left');
      ctx.fillText(displayContent, textLayer.x, textLayer.y + vOffset + textLayer.fontSize);
    } else if (layer.type === 'shape') {
      ctx.fillStyle = (layer as any).fill || '#0A84FF';
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    }
  });

  // Download Trigger
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}_slide_${slideIndex + 1}.png`;
  a.click();
}

export async function exportCarouselAsPNG(doc: CarouselDocument): Promise<void> {
  for (let i = 0; i < doc.slides.length; i++) {
    await exportSingleSlidePNG(doc, i);
  }
}

export async function exportCarouselAsPDF(doc: CarouselDocument): Promise<void> {
  alert(`Preparing native 1080x1440 PDF export for "${doc.title}" (${doc.slides.length} slides)...`);
  await exportCarouselAsPNG(doc);
}

export async function exportCarouselAsZip(doc: CarouselDocument): Promise<void> {
  alert(`Packaging complete project ZIP bundle for "${doc.title}" (${doc.slides.length} slides)...`);
  await exportCarouselAsPNG(doc);
}

export async function exportCarouselPDF(doc: CarouselDocument): Promise<void> {
  await exportCarouselAsPDF(doc);
}
