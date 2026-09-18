'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Text, Image as KonvaImage, Transformer, Group, Circle } from 'react-konva';
import { useCarouselStore } from '../store/useCarouselStore';
import { LayerNode, TextLayerNode, ImageLayerNode, ImageSlotLayerNode, ShapeLayerNode, ShapeFill, Point2D } from '../types/schema';
import {
  resolveLineHeightMultiplier, resolveLetterSpacingPx, transformTextCase,
  calculateVerticalAlignOffset
} from '../lib/textEngine';
import { hexOrColorToRgba } from '../lib/colorUtils';
import { resolveCssFontFamily, loadFont } from '../lib/fontLoader';

function ImageNode({ layer, onSelect, onDragMove, onDragEnd, onTransformEnd }: {
  layer: ImageLayerNode;
  onSelect: () => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
}) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const src = layer.localPreviewUrl || layer.url;
    if (!src) return;

    setLoadFailed(false);
    const img = new window.Image();
    // Only set crossOrigin for external URLs — data URLs don't need it
    // and setting it can actually block data URL loading in some browsers
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => setImageObj(img);
    img.onerror = () => {
      setImageObj(null);
      setLoadFailed(true);
    };
    img.src = src;
  }, [layer.url, layer.localPreviewUrl]);

  // Show visible placeholder when image fails — makes broken images obvious
  if (loadFailed || (!imageObj && !(layer.localPreviewUrl || layer.url))) {
    return (
      <Group
        id={'node-' + layer.id}
        x={layer.x}
        y={layer.y}
        rotation={layer.rotation}
        opacity={layer.opacity}
        draggable={!layer.isLocked}
        visible={layer.isVisible}
        onClick={(e) => { e.cancelBubble = true; onSelect(); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(); }}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        <Rect
          width={layer.width}
          height={layer.height}
          fill="#1A1D24"
          stroke="#EF4444"
          strokeWidth={2}
          dash={[8, 6]}
          cornerRadius={8}
        />
        <Text
          text="⚠️ Image failed to load"
          fontSize={18}
          fontFamily="sans-serif"
          fill="#EF4444"
          align="center"
          width={layer.width}
          y={layer.height / 2 - 10}
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      id={'node-' + layer.id}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      image={imageObj || undefined}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable={!layer.isLocked}
      visible={layer.isVisible}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}


function ImageSlotNode({ layer, onSelect, onDragMove, onDragEnd, onTransformEnd }: {
  layer: ImageSlotLayerNode;
  onSelect: () => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
}) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const mediaUrl = layer.assignedMediaUrl || layer.url || layer.fallbackUrl || (layer as any).sampleMediaUrl;

  useEffect(() => {
    if (!mediaUrl) {
      setImageObj(null);
      return;
    }
    const img = new window.Image();
    if (!mediaUrl.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => setImageObj(img);
    img.onerror = () => {
      console.warn('Failed to load image slot URL:', mediaUrl);
    };
    img.src = mediaUrl;
  }, [mediaUrl]);

  if (!mediaUrl || !imageObj) {
    return (
      <Group
        id={'node-' + layer.id}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        opacity={layer.opacity}
        draggable={!layer.isLocked}
        visible={layer.isVisible}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        <Rect
          width={layer.width}
          height={layer.height}
          fill="#1A1D24"
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[8, 6]}
          cornerRadius={8}
        />
        <Text
          text={`📷 ${layer.slotLabel || layer.semanticRole || 'Image Slot'}`}
          fontSize={20}
          fontFamily="sans-serif"
          fill="#94A3B8"
          align="center"
          width={layer.width}
          y={layer.height / 2 - 10}
        />
      </Group>
    );
  }

  let crop = undefined;
  if (imageObj && (layer.fit === 'cover' || layer.fit === 'crop' || !layer.fit)) {
    const containerRatio = layer.width / layer.height;
    const imageRatio = imageObj.width / imageObj.height;
    const focalX = layer.focalPoint?.x ?? 0.5;
    const focalY = layer.focalPoint?.y ?? 0.5;
    let cropW = imageObj.width;
    let cropH = imageObj.height;
    let cropX = 0;
    let cropY = 0;

    if (imageRatio > containerRatio) {
      cropW = imageObj.height * containerRatio;
      cropX = Math.max(0, Math.min(imageObj.width - cropW, (imageObj.width * focalX) - (cropW / 2)));
    } else {
      cropH = imageObj.width / containerRatio;
      cropY = Math.max(0, Math.min(imageObj.height - cropH, (imageObj.height * focalY) - (cropH / 2)));
    }
    crop = { x: cropX, y: cropY, width: cropW, height: cropH };
  }

  return (
    <KonvaImage
      id={'node-' + layer.id}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      image={imageObj}
      crop={crop}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable={!layer.isLocked}
      visible={layer.isVisible}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

// Helper to convert Linear & Radial gradient schemas to Konva fill props
export function getGradientFillProps(fill: ShapeFill | string, width: number, height: number) {
  if (typeof fill === 'string') {
    return { fill };
  }

  if (fill.type === 'solid') {
    return { fill: fill.color };
  }

  if (fill.type === 'linear-gradient') {
    const angle = fill.angle ?? 90;
    const angleRad = (angle * Math.PI) / 180;

    const startX = fill.start?.x ?? (0.5 - 0.5 * Math.cos(angleRad));
    const startY = fill.start?.y ?? (0.5 - 0.5 * Math.sin(angleRad));
    const endX = fill.end?.x ?? (0.5 + 0.5 * Math.cos(angleRad));
    const endY = fill.end?.y ?? (0.5 + 0.5 * Math.sin(angleRad));

    const colorStops: (number | string)[] = [];
    const sortedStops = [...fill.stops].sort((a, b) => a.offset - b.offset);
    sortedStops.forEach((s) => {
      colorStops.push(s.offset, hexOrColorToRgba(s.color, s.opacity ?? 1));
    });

    return {
      fillPriority: 'linear-gradient',
      fillLinearGradientStartPoint: { x: Math.round(startX * width), y: Math.round(startY * height) },
      fillLinearGradientEndPoint: { x: Math.round(endX * width), y: Math.round(endY * height) },
      fillLinearGradientColorStops: colorStops.length >= 4 ? colorStops : [0, 'rgba(255,0,0,1)', 1, 'rgba(0,0,255,1)']
    };
  }

  if (fill.type === 'radial-gradient') {
    const centerX = fill.center?.x ?? (fill as any).centerX ?? 0.5;
    const centerY = fill.center?.y ?? (fill as any).centerY ?? 0.5;
    const radX = fill.radius?.x ?? (fill as any).radius ?? 0.5;
    const radY = fill.radius?.y ?? radX;

    const endRadius = Math.round(Math.hypot(radX * width, radY * height));

    const colorStops: (number | string)[] = [];
    const sortedStops = [...fill.stops].sort((a, b) => a.offset - b.offset);
    sortedStops.forEach((s) => {
      colorStops.push(s.offset, hexOrColorToRgba(s.color, s.opacity ?? 1));
    });

    return {
      fillPriority: 'radial-gradient',
      fillRadialGradientStartPoint: { x: Math.round(centerX * width), y: Math.round(centerY * height) },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: Math.round(centerX * width), y: Math.round(centerY * height) },
      fillRadialGradientEndRadius: endRadius,
      fillRadialGradientColorStops: colorStops.length >= 4 ? colorStops : [0, 'rgba(255,0,0,1)', 1, 'rgba(0,0,255,1)']
    };
  }

  return { fill: '#0A84FF' };
}

export function KonvaCanvas() {
  const documents = useCarouselStore((state) => state.documents);
  const activeDocumentId = useCarouselStore((state) => state.activeDocumentId);
  const activeSlideId = useCarouselStore((state) => state.activeSlideId);
  const selectedLayerId = useCarouselStore((state) => state.selectedLayerId);
  const selectedLayerIds = useCarouselStore((state) => state.selectedLayerIds);
  const setSelectedLayerId = useCarouselStore((state) => state.setSelectedLayerId);
  const setSelectedLayerIds = useCarouselStore((state) => state.setSelectedLayerIds);
  const editingTextId = useCarouselStore((state) => state.editingTextId);
  const setEditingTextId = useCarouselStore((state) => state.setEditingTextId);
  const updateLayerNode = useCarouselStore((state) => state.updateLayerNode);
  const editorMode = useCarouselStore((state) => state.editorMode);
  const setEditorMode = useCarouselStore((state) => state.setEditorMode);
  const activeShapeType = useCarouselStore((state) => state.activeShapeType);
  const addShapeLayer = useCarouselStore((state) => state.addShapeLayer);

  const isTemplateEditorMode = useCarouselStore((state) => state.isTemplateEditorMode);
  const getActiveMasterLayout = useCarouselStore((state) => state.getActiveMasterLayout);

  const updateShapeFillLive = useCarouselStore((state) => state.updateShapeFillLive);
  const commitShapeFillSnapshot = useCarouselStore((state) => state.commitShapeFillSnapshot);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeSlide = activeDoc?.slides.find((s) => s.id === activeSlideId) || activeDoc?.slides[0];
  const activeLayout = getActiveMasterLayout();

  const currentLayers = isTemplateEditorMode ? (activeLayout?.layers || []) : (activeSlide?.layers || []);
  const currentBgColor = isTemplateEditorMode ? (activeLayout?.backgroundColor || '#111111') : (activeSlide?.backgroundColor || '#111111');

  const handleUpdateLayer = (layerId: string, patch: Partial<LayerNode>) => {
    updateLayerNode(layerId, patch);
  };

  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  // Interactive Shape Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Smart Guide States
  const [guideV, setGuideV] = useState<number | null>(null);
  const [guideH, setGuideH] = useState<number | null>(null);

  // Dynamic Scale Calculation with ResizeObserver for exact viewport fitting
  useEffect(() => {
    const parent = viewportRef.current || document.getElementById('canvas-viewport');
    if (!parent) return;

    const updateScale = () => {
      const rect = parent.getBoundingClientRect();
      const paddingX = rect.width < 600 ? 16 : rect.width < 1024 ? 32 : 48;
      const paddingY = rect.height < 600 ? 16 : rect.height < 900 ? 32 : 48;
      const availableW = Math.max(100, rect.width - paddingX);
      const availableH = Math.max(100, rect.height - paddingY);
      const s = Math.min(availableW / 1080, availableH / 1440);
      setScale(Math.max(0.08, Math.min(1.5, Number(s.toFixed(3)))));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(parent);

    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);


  // Update Transformer selection for single & multi-select
  useEffect(() => {
    if (selectedLayerIds.length > 0 && trRef.current && stageRef.current) {
      const selectedNodes: any[] = [];
      selectedLayerIds.forEach((id) => {
        const node = stageRef.current.findOne('#node-' + id);
        if (node) selectedNodes.push(node);
      });
      trRef.current.nodes(selectedNodes);
      trRef.current.getLayer()?.batchDraw();
    } else if (trRef.current) {
      trRef.current.nodes([]);
    }
  }, [selectedLayerIds, activeSlide, activeLayout, isTemplateEditorMode]);

  if (!isTemplateEditorMode && !activeSlide) return null;
  if (isTemplateEditorMode && !activeLayout) return null;

  const editingLayer = currentLayers.find((l) => l.id === editingTextId) as TextLayerNode | undefined;

  // Helper to extract Konva shadow props
  const getShadowProps = (layer: LayerNode) => {
    if (!layer.dropShadow || layer.dropShadow.opacity === 0) return {};
    return {
      shadowColor: layer.dropShadow.color || '#000000',
      shadowBlur: layer.dropShadow.blur ?? 12,
      shadowOffsetX: layer.dropShadow.x ?? 0,
      shadowOffsetY: layer.dropShadow.y ?? 4,
      shadowOpacity: layer.dropShadow.opacity ?? 0.4
    };
  };

  // Marquee Selection State
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  const handleDragMove = (e: any, layer: LayerNode) => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    if (layer.type === 'text') {
      // Cmd/Ctrl bypasses snapping
      if (e.evt?.metaKey || e.evt?.ctrlKey) {
        setGuideV(null);
        setGuideH(null);
        return;
      }

      const centerX = 540;
      const centerY = 720;
      const tolerance = 6 / (scale || 1);

      let snappedV: number | null = null;
      let snappedH: number | null = null;

      // Text snapping is strictly Canvas Horizontal & Vertical Center
      if (Math.abs(newX + layer.width / 2 - centerX) < tolerance) {
        node.x(centerX - layer.width / 2);
        snappedV = centerX;
      }
      if (Math.abs(newY + layer.height / 2 - centerY) < tolerance) {
        node.y(centerY - layer.height / 2);
        snappedH = centerY;
      }

      setGuideV(snappedV);
      setGuideH(snappedH);
      return;
    }

    const centerX = 540;
    const centerY = 720;
    const marginX1 = 60;
    const marginX2 = 1020;
    const marginY1 = 60;
    const marginY2 = 1380;
    const tolerance = 6;

    let snappedV: number | null = null;
    let snappedH: number | null = null;

    // Center snapping
    if (Math.abs(newX + layer.width / 2 - centerX) < tolerance) {
      node.x(centerX - layer.width / 2);
      snappedV = centerX;
    } else if (Math.abs(newX - marginX1) < tolerance) {
      node.x(marginX1);
      snappedV = marginX1;
    } else if (Math.abs(newX + layer.width - marginX2) < tolerance) {
      node.x(marginX2 - layer.width);
      snappedV = marginX2;
    }

    if (Math.abs(newY + layer.height / 2 - centerY) < tolerance) {
      node.y(centerY - layer.height / 2);
      snappedH = centerY;
    } else if (Math.abs(newY - marginY1) < tolerance) {
      node.y(marginY1);
      snappedH = marginY1;
    } else if (Math.abs(newY + layer.height - marginY2) < tolerance) {
      node.y(marginY2 - layer.height);
      snappedH = marginY2;
    }

    // Sibling snapping
    currentLayers.forEach((other) => {
      if (other.id === layer.id) return;
      if (Math.abs(newX - other.x) < tolerance) {
        node.x(other.x);
        snappedV = other.x;
      }
      if (Math.abs(newY - other.y) < tolerance) {
        node.y(other.y);
        snappedH = other.y;
      }
    });

    setGuideV(snappedV);
    setGuideH(snappedH);
  };

  const handleDragEnd = (e: any, layer: LayerNode) => {
    setGuideV(null);
    setGuideH(null);
    const node = e.target;
    if (layer.type === 'text') {
      handleUpdateLayer(layer.id, {
        x: Number(node.x().toFixed(2)),
        y: Number(node.y().toFixed(2))
      });
    } else {
      handleUpdateLayer(layer.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y())
      });
    }
  };

  const handleTransformEnd = (e: any, layer: LayerNode) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    if (layer.type === 'text') {
      const textLayer = layer as TextLayerNode;
      const mode = textLayer.textResizeMode || 'AUTO_HEIGHT';
      const newWidth = Math.max(20, Math.round(layer.width * scaleX));
      const updates: Partial<TextLayerNode> = {
        x: Number(node.x().toFixed(2)),
        y: Number(node.y().toFixed(2)),
        width: newWidth,
        rotation: Math.round(node.rotation())
      };
      if (mode === 'FIXED') {
        updates.height = Math.max(20, Math.round(layer.height * scaleY));
      }
      handleUpdateLayer(layer.id, updates);
    } else {
      handleUpdateLayer(layer.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: Math.max(20, Math.round(layer.width * scaleX)),
        height: Math.max(20, Math.round(layer.height * scaleY)),
        rotation: Math.round(node.rotation())
      });
    }
  };


  // Shape drawing & marquee interactions
  const handleStageMouseDown = (e: any) => {
    if (editorMode === 'draw-shape') {
      const stage = stageRef.current;
      const pointer = stage.getPointerPosition();
      if (pointer) {
        setIsDrawing(true);
        setDrawStart({ x: pointer.x, y: pointer.y });
        setDrawCurrent({ x: pointer.x, y: pointer.y });
      }
      return;
    }

    if (e.target === stageRef.current) {
      const stage = stageRef.current;
      const pointer = stage.getPointerPosition();
      if (pointer) {
        setMarquee({ startX: pointer.x, startY: pointer.y, currentX: pointer.x, currentY: pointer.y });
      }
      setSelectedLayerId(null);
      setSelectedLayerIds([]);
      setEditingTextId(null);
    }
  };

  const handleStageMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (isDrawing && editorMode === 'draw-shape') {
      setDrawCurrent({ x: pointer.x, y: pointer.y });
      return;
    }

    if (marquee) {
      setMarquee((prev) => prev ? { ...prev, currentX: pointer.x, currentY: pointer.y } : null);
      const mX = Math.min(marquee.startX, pointer.x);
      const mY = Math.min(marquee.startY, pointer.y);
      const mW = Math.abs(pointer.x - marquee.startX);
      const mH = Math.abs(pointer.y - marquee.startY);

      if (mW > 5 || mH > 5) {
        const selected = currentLayers.filter((l) => (
          l.x < mX + mW && l.x + l.width > mX && l.y < mY + mH && l.y + l.height > mY
        )).map((l) => l.id);
        setSelectedLayerIds(selected);
      }
    }
  };

  const handleStageMouseUp = () => {
    if (marquee) {
      setMarquee(null);
    }

    if (isDrawing && drawStart && drawCurrent && editorMode === 'draw-shape') {
      const minX = Math.min(drawStart.x, drawCurrent.x);
      const minY = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);

      if (w < 10 && h < 10) {
        addShapeLayer(activeShapeType, '#0A84FF', Math.round(drawStart.x - 120), Math.round(drawStart.y - 80), 240, 160);
      } else {
        addShapeLayer(activeShapeType, '#0A84FF', Math.round(minX), Math.round(minY), Math.max(20, Math.round(w)), Math.max(20, Math.round(h)));
      }

      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      setEditorMode('select');
    }
  };

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.max(0.15, Math.min(1.8, Number((prev + delta).toFixed(2)))));
  };

  const handleResetZoom = () => {
    const parent = viewportRef.current || document.getElementById('canvas-viewport');
    if (parent) {
      const rect = parent.getBoundingClientRect();
      const paddingX = rect.width < 600 ? 16 : rect.width < 1024 ? 32 : 48;
      const paddingY = rect.height < 600 ? 16 : rect.height < 900 ? 32 : 48;
      const availableW = Math.max(100, rect.width - paddingX);
      const availableH = Math.max(100, rect.height - paddingY);
      const s = Math.min(availableW / 1080, availableH / 1440);
      setScale(Math.max(0.08, Math.min(1.5, Number(s.toFixed(3)))));
    }
  };

  return (
    <div 
      id="canvas-viewport"
      ref={viewportRef}
      className={`flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-hidden relative bg-workspace select-none ${
        editorMode === 'draw-shape' ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Floating Canvas Zoom Bar */}
      <div className="absolute bottom-3 right-3 z-40 bg-surface-elevated/90 backdrop-blur-md border border-border-default rounded-lg px-2 py-1 flex items-center gap-1.5 shadow-2xl text-xs font-semibold text-white">
        <button
          className="p-1 hover:bg-surface rounded text-text-secondary hover:text-white text-xs"
          onClick={() => handleZoom(-0.05)}
          title="Zoom Out"
        >
          -
        </button>
        <span className="text-[10px] font-mono text-accent-blue font-bold min-w-[32px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          className="p-1 hover:bg-surface rounded text-text-secondary hover:text-white text-xs"
          onClick={() => handleZoom(0.05)}
          title="Zoom In"
        >
          +
        </button>
        <button
          className="px-2 py-0.5 bg-surface hover:bg-surface-hover rounded text-[10px] text-text-secondary hover:text-white border border-border-subtle"
          onClick={handleResetZoom}
          title="Fit Canvas"
        >
          Fit
        </button>
      </div>

      <div 
        className="w-[1080px] h-[1440px] shadow-2xl relative transition-transform duration-75 origin-center shrink-0"
        style={{
          transform: `scale(${scale})`,
          backgroundColor: currentBgColor
        }}
      >
        <Stage
          ref={stageRef}

          width={1080}
          height={1440}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
        >
          <Layer>
            {/* Background Render */}
            <Rect
              width={1080}
              height={1440}
              fill={currentBgColor}
            />

            {/* Render Canvas Layers (Canonical front-to-back array reversed for Konva back-to-front stage drawing) */}
            {currentLayers.slice().reverse().map((layer) => {
              // TEXT LAYER
              if (layer.type === 'text') {
                const textLayer = layer as TextLayerNode;
                const isEditing = editingTextId === layer.id;

                const lineHeightMult = resolveLineHeightMultiplier(textLayer.lineHeightConfig || textLayer.lineHeight, textLayer.fontSize);
                const letterSpacingPx = resolveLetterSpacingPx(textLayer.letterSpacingConfig || textLayer.letterSpacing, textLayer.fontSize);
                const displayContent = transformTextCase(textLayer.content, textLayer.textCase);
                const vOffset = calculateVerticalAlignOffset(
                  textLayer.height,
                  textLayer.fontSize * lineHeightMult,
                  textLayer.verticalAlign
                );

                const isItalic = textLayer.fontStyle === 'italic';
                const weight = textLayer.fontWeight || '400';
                const fontStyleStr = isItalic
                  ? (weight === '400' || weight === 'normal' ? 'italic' : `italic ${weight}`)
                  : (weight === 'normal' ? 'normal' : weight);

                const resolvedFont = resolveCssFontFamily(textLayer.fontFamily);

                const shadowProps = getShadowProps(textLayer);
                const textShadowProps = textLayer.textShadow?.enabled ? {
                  shadowColor: textLayer.textShadow.color || '#000000',
                  shadowBlur: textLayer.textShadow.blur ?? 8,
                  shadowOffsetX: textLayer.textShadow.x ?? 0,
                  shadowOffsetY: textLayer.textShadow.y ?? 2,
                  shadowOpacity: textLayer.textShadow.opacity ?? 0.5
                } : shadowProps;

                return (
                  <Text
                    key={layer.id}
                    id={'node-' + layer.id}
                    x={layer.x}
                    y={layer.y + vOffset}
                    width={layer.width}
                    height={layer.height - vOffset}
                    text={displayContent}
                    fontSize={textLayer.fontSize}
                    fontFamily={resolvedFont}
                    fontStyle={fontStyleStr}
                    lineHeight={lineHeightMult}
                    letterSpacing={letterSpacingPx}
                    fill={textLayer.fill}
                    align={textLayer.align === 'justify' ? 'left' : textLayer.align}
                    textDecoration={textLayer.textDecoration && textLayer.textDecoration !== 'none' ? textLayer.textDecoration : undefined}
                    stroke={textLayer.textStroke?.color}
                    strokeWidth={textLayer.textStroke?.width || 0}
                    {...textShadowProps}
                    draggable={!layer.isLocked && !isEditing}
                    visible={layer.isVisible && !isEditing}

                    onClick={(e) => {
                      e.cancelBubble = true;
                      setSelectedLayerId(layer.id);
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      setEditingTextId(layer.id);
                    }}
                    onDragMove={(e) => handleDragMove(e, layer)}
                    onDragEnd={(e) => handleDragEnd(e, layer)}
                    onTransformEnd={(e) => handleTransformEnd(e, layer)}
                  />
                );
              }

              // IMAGE LAYER
              if (layer.type === 'image') {
                return (
                  <ImageNode
                    key={layer.id}
                    layer={layer as ImageLayerNode}
                    onSelect={() => setSelectedLayerId(layer.id)}
                    onDragMove={(e) => handleDragMove(e, layer)}
                    onDragEnd={(e) => handleDragEnd(e, layer)}
                    onTransformEnd={(e) => handleTransformEnd(e, layer)}
                  />
                );
              }

              // IMAGE SLOT LAYER
              if (layer.type === 'image-slot') {
                return (
                  <ImageSlotNode
                    key={layer.id}
                    layer={layer as ImageSlotLayerNode}
                    onSelect={() => setSelectedLayerId(layer.id)}
                    onDragMove={(e) => handleDragMove(e, layer)}
                    onDragEnd={(e) => handleDragEnd(e, layer)}
                    onTransformEnd={(e) => handleTransformEnd(e, layer)}
                  />
                );
              }

              // SHAPE LAYER
              if (layer.type === 'shape') {
                const shapeLayer = layer as ShapeLayerNode;
                const fillProps = getGradientFillProps(shapeLayer.fill, shapeLayer.width, shapeLayer.height);

                if (shapeLayer.shapeType === 'ellipse') {
                  return (
                    <Ellipse
                      key={layer.id}
                      id={'node-' + layer.id}
                      x={layer.x + layer.width / 2}
                      y={layer.y + layer.height / 2}
                      radiusX={layer.width / 2}
                      radiusY={layer.height / 2}
                      {...fillProps}
                      stroke={shapeLayer.stroke?.enabled ? shapeLayer.stroke.color : undefined}
                      strokeWidth={shapeLayer.stroke?.enabled ? shapeLayer.stroke.width : 0}
                      draggable={!layer.isLocked}
                      visible={layer.isVisible}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedLayerId(layer.id);
                      }}
                      onDragMove={(e) => handleDragMove(e, layer)}
                      onDragEnd={(e) => handleDragEnd(e, layer)}
                      onTransformEnd={(e) => handleTransformEnd(e, layer)}
                    />
                  );
                }

                if (shapeLayer.shapeType === 'line') {
                  return (
                    <Line
                      key={layer.id}
                      id={'node-' + layer.id}
                      x={layer.x}
                      y={layer.y}
                      points={[0, layer.height / 2, layer.width, layer.height / 2]}
                      stroke={typeof shapeLayer.fill === 'string' ? shapeLayer.fill : '#0A84FF'}
                      strokeWidth={shapeLayer.stroke?.width || 8}
                      draggable={!layer.isLocked}
                      visible={layer.isVisible}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedLayerId(layer.id);
                      }}
                      onDragMove={(e) => handleDragMove(e, layer)}
                      onDragEnd={(e) => handleDragEnd(e, layer)}
                      onTransformEnd={(e) => handleTransformEnd(e, layer)}
                    />
                  );
                }

                // Default Rectangle / Rounded Rectangle
                return (
                  <Rect
                    key={layer.id}
                    id={'node-' + layer.id}
                    x={layer.x}
                    y={layer.y}
                    width={layer.width}
                    height={layer.height}
                    cornerRadius={shapeLayer.borderRadius || (shapeLayer.shapeType === 'rounded-rectangle' ? 16 : 0)}
                    {...fillProps}
                    stroke={shapeLayer.stroke?.enabled ? shapeLayer.stroke.color : undefined}
                    strokeWidth={shapeLayer.stroke?.enabled ? shapeLayer.stroke.width : 0}
                    draggable={!layer.isLocked}
                    visible={layer.isVisible}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setSelectedLayerId(layer.id);
                    }}
                    onDragMove={(e) => handleDragMove(e, layer)}
                    onDragEnd={(e) => handleDragEnd(e, layer)}
                    onTransformEnd={(e) => handleTransformEnd(e, layer)}
                  />
                );
              }

              return null;
            })}

            {/* Live Interactive Shape Drawing Preview */}
            {isDrawing && drawStart && drawCurrent && (
              <Rect
                x={Math.min(drawStart.x, drawCurrent.x)}
                y={Math.min(drawStart.y, drawCurrent.y)}
                width={Math.abs(drawCurrent.x - drawStart.x)}
                height={Math.abs(drawCurrent.y - drawStart.y)}
                fill="rgba(10, 132, 255, 0.25)"
                stroke="#0A84FF"
                strokeWidth={2}
                dash={[4, 4]}
              />
            )}

            {/* Marquee Selection Rectangle Overlay */}
            {marquee && Math.abs(marquee.currentX - marquee.startX) > 4 && (
              <Rect
                x={Math.min(marquee.startX, marquee.currentX)}
                y={Math.min(marquee.startY, marquee.currentY)}
                width={Math.abs(marquee.currentX - marquee.startX)}
                height={Math.abs(marquee.currentY - marquee.startY)}
                fill="rgba(59, 130, 246, 0.12)"
                stroke="#3B82F6"
                strokeWidth={1.5}
                dash={[4, 4]}
              />
            )}

            {/* Smart Alignment Magenta Guides */}
            {guideV !== null && (
              <Line points={[guideV, 0, guideV, 1440]} stroke="#FF007A" strokeWidth={2} dash={[6, 4]} />
            )}
            {guideH !== null && (
              <Line points={[0, guideH, 1080, guideH]} stroke="#FF007A" strokeWidth={2} dash={[6, 4]} />
            )}

            {/* Template Mode Safe Area Overlay */}
            {isTemplateEditorMode && (
              <Rect
                x={40}
                y={40}
                width={1000}
                height={1360}
                stroke="#3B82F6"
                strokeWidth={1.5}
                dash={[6, 6]}
                opacity={0.4}
                listening={false}
              />
            )}

            {/* ON-CANVAS FIGMA-LIKE GRADIENT HANDLES */}
            {(() => {
              if (!selectedLayerId) return null;
              const selectedLayer = currentLayers.find((l) => l.id === selectedLayerId);
              if (!selectedLayer || selectedLayer.type !== 'shape') return null;

              const shapeLayer = selectedLayer as ShapeLayerNode;
              const fill = shapeLayer.fill;
              if (typeof fill === 'string' || fill.type === 'solid') return null;

              if (fill.type === 'linear-gradient') {
                const angle = fill.angle ?? 90;
                const angleRad = (angle * Math.PI) / 180;
                const start = fill.start ?? { x: 0.5 - 0.5 * Math.cos(angleRad), y: 0.5 - 0.5 * Math.sin(angleRad) };
                const end = fill.end ?? { x: 0.5 + 0.5 * Math.cos(angleRad), y: 0.5 + 0.5 * Math.sin(angleRad) };

                const pStartX = shapeLayer.x + start.x * shapeLayer.width;
                const pStartY = shapeLayer.y + start.y * shapeLayer.height;
                const pEndX = shapeLayer.x + end.x * shapeLayer.width;
                const pEndY = shapeLayer.y + end.y * shapeLayer.height;

                return (
                  <Group key="gradient-handles">
                    {/* Vector Connecting Line */}
                    <Line
                      points={[pStartX, pStartY, pEndX, pEndY]}
                      stroke="#0A84FF"
                      strokeWidth={3}
                      dash={[6, 4]}
                      shadowColor="#000000"
                      shadowBlur={4}
                    />

                    {/* Intermediate Stop Markers along Vector */}
                    {fill.stops.map((stop) => {
                      const stopX = pStartX + (pEndX - pStartX) * stop.offset;
                      const stopY = pStartY + (pEndY - pStartY) * stop.offset;
                      return (
                        <Circle
                          key={`stop-handle-${stop.id}`}
                          x={stopX}
                          y={stopY}
                          radius={8}
                          fill={stop.color}
                          stroke="#FFFFFF"
                          strokeWidth={2.5}
                          shadowColor="#000000"
                          shadowBlur={6}
                          draggable
                          onDragMove={(e) => {
                            const node = e.target;
                            const curX = node.x();
                            const curY = node.y();

                            const dx = pEndX - pStartX;
                            const dy = pEndY - pStartY;
                            const lenSq = dx * dx + dy * dy;
                            let t = 0;
                            if (lenSq > 0) {
                              t = ((curX - pStartX) * dx + (curY - pStartY) * dy) / lenSq;
                            }
                            const newOffset = Number(Math.max(0, Math.min(1, t)).toFixed(2));

                            const updatedStops = fill.stops.map((s) => (s.id === stop.id ? { ...s, offset: newOffset } : s));
                            updateShapeFillLive(shapeLayer.id, { ...fill, stops: updatedStops });
                          }}
                          onDragEnd={() => {
                            commitShapeFillSnapshot('MOVE_GRADIENT_STOP_HANDLE');
                          }}
                        />
                      );
                    })}

                    {/* Start Point Handle (Circle) */}
                    <Circle
                      x={pStartX}
                      y={pStartY}
                      radius={11}
                      fill="#0A84FF"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      shadowColor="#000000"
                      shadowBlur={8}
                      draggable
                      onDragMove={(e) => {
                        const node = e.target;
                        const newNormX = Number(((node.x() - shapeLayer.x) / shapeLayer.width).toFixed(3));
                        const newNormY = Number(((node.y() - shapeLayer.y) / shapeLayer.height).toFixed(3));
                        const newStart: Point2D = { x: newNormX, y: newNormY };

                        const dx = end.x - newNormX;
                        const dy = end.y - newNormY;
                        const derivedAngle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

                        updateShapeFillLive(shapeLayer.id, {
                          ...fill,
                          start: newStart,
                          angle: derivedAngle
                        });
                      }}
                      onDragEnd={() => {
                        commitShapeFillSnapshot('MOVE_GRADIENT_START_HANDLE');
                      }}
                    />

                    {/* End Point Handle (Circle) */}
                    <Circle
                      x={pEndX}
                      y={pEndY}
                      radius={11}
                      fill="#A65EFE"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      shadowColor="#000000"
                      shadowBlur={8}
                      draggable
                      onDragMove={(e) => {
                        const node = e.target;
                        const newNormX = Number(((node.x() - shapeLayer.x) / shapeLayer.width).toFixed(3));
                        const newNormY = Number(((node.y() - shapeLayer.y) / shapeLayer.height).toFixed(3));
                        const newEnd: Point2D = { x: newNormX, y: newNormY };

                        const dx = newNormX - (fill.start?.x ?? 0);
                        const dy = newNormY - (fill.start?.y ?? 0);
                        const derivedAngle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

                        updateShapeFillLive(shapeLayer.id, {
                          ...fill,
                          end: newEnd,
                          angle: derivedAngle
                        });
                      }}
                      onDragEnd={() => {
                        commitShapeFillSnapshot('MOVE_GRADIENT_END_HANDLE');
                      }}
                    />
                  </Group>
                );
              }

              if (fill.type === 'radial-gradient') {
                const center = fill.center ?? { x: 0.5, y: 0.5 };
                const radius = fill.radius ?? { x: 0.5, y: 0.5 };

                const pCenterX = shapeLayer.x + center.x * shapeLayer.width;
                const pCenterY = shapeLayer.y + center.y * shapeLayer.height;
                const pRadX = pCenterX + radius.x * shapeLayer.width;
                const pRadY = pCenterY + radius.y * shapeLayer.height;

                return (
                  <Group key="radial-gradient-handles">
                    {/* Vector Line */}
                    <Line
                      points={[pCenterX, pCenterY, pRadX, pRadY]}
                      stroke="#2ECA71"
                      strokeWidth={3}
                      dash={[6, 4]}
                      shadowColor="#000000"
                      shadowBlur={4}
                    />

                    {/* Center Handle */}
                    <Circle
                      x={pCenterX}
                      y={pCenterY}
                      radius={11}
                      fill="#0A84FF"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      shadowColor="#000000"
                      shadowBlur={8}
                      draggable
                      onDragMove={(e) => {
                        const node = e.target;
                        const newNormX = Number(((node.x() - shapeLayer.x) / shapeLayer.width).toFixed(3));
                        const newNormY = Number(((node.y() - shapeLayer.y) / shapeLayer.height).toFixed(3));
                        updateShapeFillLive(shapeLayer.id, {
                          ...fill,
                          center: { x: newNormX, y: newNormY }
                        });
                      }}
                      onDragEnd={() => {
                        commitShapeFillSnapshot('MOVE_RADIAL_CENTER');
                      }}
                    />

                    {/* Radius Handle */}
                    <Circle
                      x={pRadX}
                      y={pRadY}
                      radius={10}
                      fill="#2ECA71"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      shadowColor="#000000"
                      shadowBlur={8}
                      draggable
                      onDragMove={(e) => {
                        const node = e.target;
                        const radX = Number((Math.abs(node.x() - pCenterX) / shapeLayer.width).toFixed(3));
                        const radY = Number((Math.abs(node.y() - pCenterY) / shapeLayer.height).toFixed(3));
                        updateShapeFillLive(shapeLayer.id, {
                          ...fill,
                          radius: { x: Math.max(0.05, radX), y: Math.max(0.05, radY) }
                        });
                      }}
                      onDragEnd={() => {
                        commitShapeFillSnapshot('RESIZE_RADIAL_RADIUS');
                      }}
                    />
                  </Group>
                );
              }

              return null;
            })()}

            {/* Transformer Selection Handles */}
            <Transformer
              ref={trRef}
              enabledAnchors={(() => {
                if (selectedLayerIds.length === 1) {
                  const singleLayer = currentLayers.find(l => l.id === selectedLayerIds[0]);
                  if (singleLayer && singleLayer.type === 'text') {
                    const mode = (singleLayer as TextLayerNode).textResizeMode || 'AUTO_HEIGHT';
                    if (mode === 'AUTO_HEIGHT') return ['middle-left', 'middle-right'];
                    if (mode === 'AUTO_WIDTH') return [];
                    if (mode === 'FIXED') return ['top-left', 'top-center', 'top-right', 'middle-right', 'bottom-right', 'bottom-center', 'bottom-left', 'middle-left'];
                  }
                }
                return undefined;
              })()}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
              anchorSize={12}
              anchorCornerRadius={2}
              borderStroke="#0A84FF"
              anchorStroke="#0A84FF"
              anchorFill="#FFFFFF"
            />

          </Layer>
        </Stage>

        {/* HTML INLINE TEXT EDITING OVERLAY */}
        {editingLayer && (
          <textarea
            autoFocus
            className="absolute bg-transparent text-white outline-none resize-none border-2 border-accent-blue p-0 font-sans z-50 overflow-hidden"
            style={{
              left: `${editingLayer.x}px`,
              top: `${editingLayer.y}px`,
              width: `${editingLayer.width}px`,
              height: `${editingLayer.height}px`,
              fontSize: `${editingLayer.fontSize}px`,
              fontFamily: resolveCssFontFamily(editingLayer.fontFamily),
              fontWeight: editingLayer.fontWeight,
              color: editingLayer.fill,
              textAlign: editingLayer.align,
              lineHeight: editingLayer.lineHeight
            }}
            value={editingLayer.content}
            onChange={(e) => handleUpdateLayer(editingLayer.id, { content: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setEditingTextId(null);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingTextId(null);
              }
            }}
            onBlur={() => setEditingTextId(null)}
          />
        )}
      </div>
    </div>
  );
}
