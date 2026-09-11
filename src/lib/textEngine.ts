import { TextLayerNode, StyleRun } from '../types/schema';

export interface TextLine {
  text: string;
  width: number;
}

export interface RenderedTextRun {
  text: string;
  start: number;
  end: number;
  fill?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
}

export interface LineHeightConfig {
  value: number;
  unit: 'Auto' | 'px' | '%';
}

export interface LetterSpacingConfig {
  value: number;
  unit: 'px' | '%' | 'em';
}

// ----------------------------------------------------
// 1. Line Height Resolution
// ----------------------------------------------------
export function resolveLineHeightMultiplier(config?: LineHeightConfig | number, fontSize = 24): number {
  if (typeof config === 'number') {
    // If passed as flat number, evaluate unit heuristic: > 10 is px or %
    if (config > 10) return config / 100;
    return config;
  }

  if (!config || config.unit === 'Auto') {
    return 1.2; // Default ergonomic editorial line height
  }

  if (config.unit === 'px') {
    return fontSize > 0 ? config.value / fontSize : 1.2;
  }

  // Unit === '%'
  return config.value / 100;
}

// ----------------------------------------------------
// 2. Letter Spacing Resolution
// ----------------------------------------------------
export function resolveLetterSpacingPx(config?: LetterSpacingConfig | number, fontSize = 24): number {
  if (typeof config === 'number') {
    return config;
  }

  if (!config) return 0;

  if (config.unit === '%') {
    return (config.value / 100) * fontSize;
  }

  if (config.unit === 'em') {
    return config.value * fontSize;
  }

  return config.value; // 'px'
}

// ----------------------------------------------------
// 3. Text Case Transformation
// ----------------------------------------------------
export function transformTextCase(text: string, textCase?: 'original' | 'uppercase' | 'lowercase' | 'title'): string {
  if (!textCase || textCase === 'original') return text;

  if (textCase === 'uppercase') return text.toUpperCase();
  if (textCase === 'lowercase') return text.toLowerCase();

  if (textCase === 'title') {
    return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  return text;
}

// ----------------------------------------------------
// 4. Vertical Alignment Offset Calculation
// ----------------------------------------------------
export function calculateVerticalAlignOffset(
  totalBoxHeight: number,
  contentHeight: number,
  verticalAlign: 'top' | 'middle' | 'bottom' = 'top'
): number {
  if (verticalAlign === 'middle') {
    return Math.max(0, Math.round((totalBoxHeight - contentHeight) / 2));
  }
  if (verticalAlign === 'bottom') {
    return Math.max(0, Math.round(totalBoxHeight - contentHeight));
  }
  return 0; // 'top'
}

// ----------------------------------------------------
// 5. Rich Text Style Runs Segmenter
// ----------------------------------------------------
export function segmentTextRuns(fullText: string, styleRuns: StyleRun[] = []): RenderedTextRun[] {
  if (!fullText) return [];
  if (!styleRuns || styleRuns.length === 0) {
    return [{ text: fullText, start: 0, end: fullText.length }];
  }

  // Create boundary points
  const points = new Set<number>([0, fullText.length]);
  styleRuns.forEach((sr) => {
    if (sr.start >= 0 && sr.start <= fullText.length) points.add(sr.start);
    if (sr.end >= 0 && sr.end <= fullText.length) points.add(sr.end);
  });

  const sortedPoints = Array.from(points).sort((a, b) => a - b);
  const segments: RenderedTextRun[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i + 1];
    if (start === end) continue;

    const segmentText = fullText.slice(start, end);
    const activeRun = styleRuns.find((sr) => start >= sr.start && end <= sr.end);

    segments.push({
      text: segmentText,
      start,
      end,
      fill: activeRun?.fill,
      fontWeight: activeRun?.fontWeight,
      fontStyle: activeRun?.fontStyle
    });
  }

  return segments;
}

// ----------------------------------------------------
// 6. Auto-Fit Font Scaling Evaluator
// ----------------------------------------------------
export function computeAutoFitFontSize(
  text: string,
  targetWidth: number,
  targetHeight: number,
  initialFontSize: number,
  minFontSize = 14,
  maxLines?: number
): number {
  let currentSize = initialFontSize;
  const approxCharWidth = currentSize * 0.55;
  const linesCount = Math.ceil((text.length * approxCharWidth) / Math.max(1, targetWidth));

  if (maxLines && linesCount > maxLines) {
    const scaleFactor = maxLines / linesCount;
    currentSize = Math.max(minFontSize, Math.round(currentSize * scaleFactor));
  }

  return currentSize;
}

// ----------------------------------------------------
// 7. Authoritative Canvas 2D Text Measurement Utility
// ----------------------------------------------------
let sharedCanvasCtx: CanvasRenderingContext2D | null = null;

function getSharedCanvasCtx(): CanvasRenderingContext2D | null {
  if (typeof window === 'undefined') return null;
  if (!sharedCanvasCtx) {
    const canvas = document.createElement('canvas');
    sharedCanvasCtx = canvas.getContext('2d');
  }
  return sharedCanvasCtx;
}

export function measureTextDimensions(
  content: string,
  fontFamily: string,
  fontSize: number,
  fontWeight = 'normal',
  fontStyle = 'normal',
  lineHeightMult = 1.2,
  letterSpacingPx = 0,
  textCase = 'original',
  maxWidth?: number
): { width: number; height: number; lines: string[] } {
  const displayContent = transformTextCase(content || '', textCase as any);
  if (!displayContent) {
    const minHeight = Math.ceil(fontSize * lineHeightMult);
    return { width: Math.max(20, maxWidth || 100), height: Math.max(20, minHeight), lines: [''] };
  }

  const ctx = getSharedCanvasCtx();
  const fontStyleStr = fontStyle === 'italic' ? 'italic' : 'normal';
  const weightStr = (fontWeight === '700' || fontWeight === '800' || fontWeight === 'bold') ? 'bold' : 'normal';
  const fontCss = `${fontStyleStr} ${weightStr} ${fontSize}px "${fontFamily || 'sans-serif'}", sans-serif`.trim();

  let measureWord = (word: string) => word.length * fontSize * 0.55;

  if (ctx) {
    ctx.font = fontCss;
    measureWord = (word: string) => {
      const metrics = ctx.measureText(word);
      const extraSpacing = letterSpacingPx * Math.max(0, word.length - 1);
      return metrics.width + extraSpacing;
    };
  }

  const rawParagraphs = displayContent.split('\n');
  const lines: string[] = [];
  let maxMeasuredLineWidth = 0;

  rawParagraphs.forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }

    if (!maxWidth || maxWidth <= 0) {
      const w = measureWord(paragraph);
      maxMeasuredLineWidth = Math.max(maxMeasuredLineWidth, w);
      lines.push(paragraph);
      return;
    }

    const words = paragraph.split(' ');
    let currentLine = '';
    let currentLineWidth = 0;

    words.forEach((word, idx) => {
      const wordW = measureWord(word);
      const spaceW = idx > 0 ? measureWord(' ') : 0;

      if (!currentLine) {
        currentLine = word;
        currentLineWidth = wordW;
      } else if (currentLineWidth + spaceW + wordW <= maxWidth) {
        currentLine += ' ' + word;
        currentLineWidth += spaceW + wordW;
      } else {
        lines.push(currentLine);
        maxMeasuredLineWidth = Math.max(maxMeasuredLineWidth, currentLineWidth);
        currentLine = word;
        currentLineWidth = wordW;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
      maxMeasuredLineWidth = Math.max(maxMeasuredLineWidth, currentLineWidth);
    }
  });

  const computedLineHeight = Math.ceil(fontSize * lineHeightMult);
  const totalHeight = Math.max(20, lines.length * computedLineHeight);
  const totalWidth = Math.max(20, Math.ceil(maxWidth && maxWidth > 0 ? maxWidth : maxMeasuredLineWidth));

  return {
    width: totalWidth,
    height: totalHeight,
    lines
  };
}

// ----------------------------------------------------
// 8. Auto-sizing Text Layer Logic
// ----------------------------------------------------
export function autoSizeTextLayer(layer: TextLayerNode): void {
  const mode = layer.textResizeMode || 'AUTO_HEIGHT';
  if (mode === 'FIXED') return;

  const lineHeightMult = resolveLineHeightMultiplier(layer.lineHeightConfig || layer.lineHeight, layer.fontSize || 16);
  const letterSpacingPx = resolveLetterSpacingPx(layer.letterSpacingConfig || layer.letterSpacing, layer.fontSize || 16);

  const measured = measureTextDimensions(
    layer.content || '',
    layer.fontFamily || 'Inter',
    layer.fontSize || 16,
    layer.fontWeight || 'normal',
    layer.fontStyle || 'normal',
    lineHeightMult,
    letterSpacingPx,
    layer.textCase || 'original',
    mode === 'AUTO_WIDTH' ? undefined : layer.width
  );

  if (mode === 'AUTO_WIDTH') {
    layer.width = measured.width;
    layer.height = measured.height;
  } else if (mode === 'AUTO_HEIGHT') {
    layer.height = measured.height;
  }
}

