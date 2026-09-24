'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LayerNode, ShapeFill } from '../types/schema';
import { resolveCssFontFamily } from '../lib/fontLoader';
import { resolveLetterSpacingPx, resolveLineHeightMultiplier, transformTextCase } from '../lib/textEngine';
import { hexOrColorToRgba } from '../lib/colorUtils';

function fillStyle(fill: ShapeFill | string): string {
  if (typeof fill === 'string') return fill;
  if (fill.type === 'solid') return fill.color;
  const stops = fill.stops.map(stop => `${hexOrColorToRgba(stop.color, stop.opacity)} ${stop.offset * 100}%`).join(', ');
  return fill.type === 'linear-gradient' ? `linear-gradient(${fill.angle + 90}deg, ${stops})` : `radial-gradient(ellipse, ${stops})`;
}

interface SlidePreviewProps {
  slide: { layers: LayerNode[]; backgroundColor: string };
  className?: string;
}

export function SlidePreview({ slide, className = '' }: SlidePreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => setScale(entries[0].contentRect.width / 1080));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`slide-preview ${className}`} aria-hidden="true">
      <div className="slide-preview-scene" style={{ transform: `scale(${scale})`, background: slide.backgroundColor }}>
        {[...slide.layers].reverse().filter(layer => layer.isVisible).map(layer => {
          const style: React.CSSProperties = {
            position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height,
            opacity: layer.opacity, transform: `rotate(${layer.rotation}deg)`, transformOrigin: 'top left',
          };
          if (layer.type === 'text') {
            return <div key={layer.id} style={{ ...style, overflow: 'hidden', whiteSpace: 'pre-wrap',
              fontFamily: resolveCssFontFamily(layer.fontFamily), fontSize: layer.fontSize,
              fontWeight: layer.fontWeight as React.CSSProperties['fontWeight'], fontStyle: layer.fontStyle,
              lineHeight: resolveLineHeightMultiplier(layer.lineHeightConfig || layer.lineHeight, layer.fontSize),
              letterSpacing: resolveLetterSpacingPx(layer.letterSpacingConfig || layer.letterSpacing, layer.fontSize),
              color: layer.fill, textAlign: layer.align,
            }}>{transformTextCase(layer.content, layer.textCase)}</div>;
          }
          if (layer.type === 'shape') {
            return <div key={layer.id} style={{ ...style, background: fillStyle(layer.fill),
              borderRadius: layer.shapeType === 'ellipse' ? '50%' : layer.borderRadius || 0,
              border: layer.stroke?.enabled ? `${layer.stroke.width}px solid ${layer.stroke.color}` : undefined,
              ...(layer.shapeType === 'line' ? { height: layer.stroke?.width || 8, top: layer.y + layer.height / 2 } : {}),
            }} />;
          }
          if (layer.type === 'image' || layer.type === 'image-slot' || layer.type === 'logo') {
            const src = layer.type === 'image-slot' ? layer.assignedMediaUrl || layer.url || layer.fallbackUrl
              : layer.type === 'image' ? layer.localPreviewUrl || layer.url : layer.url;
            return src ? <img key={layer.id} src={src} alt="" draggable={false} style={{ ...style, objectFit: layer.type === 'image-slot' && layer.fit === 'contain' ? 'contain' : 'cover',
              objectPosition: layer.type === 'image-slot' ? `${(layer.focalPoint?.x ?? 0.5) * 100}% ${(layer.focalPoint?.y ?? 0.5) * 100}%` : 'center',
              borderRadius: 'borderRadius' in layer ? layer.borderRadius : 0,
            }} /> : null;
          }
          return null;
        })}
      </div>
    </div>
  );
}
