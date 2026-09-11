'use client';

import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import {
  LayerNode, TextLayerNode, ImageLayerNode, ShapeLayerNode, ShapeFill, LinearGradientFill,
  RadialGradientFill, GradientStop
} from '../types/schema';
import { hexOrColorToRgba } from '../lib/colorUtils';
import { exportCarouselAsPNG, exportCarouselAsPDF, exportCarouselAsZip } from '../lib/export';
import {
  Layers as LayersIcon, Palette, Sparkles, Download, Eye, EyeOff, ArrowUp, ArrowDown,
  Trash2, Copy, RefreshCw, Image as ImageIcon, Save, Send, Plus, Minus, RotateCw,
  ChevronRight, ChevronDown, Folder, Lock, Unlock, Square, Type, Search, MoreHorizontal,
  LayoutTemplate
} from 'lucide-react';
import { TextSlotConstraints, ImageSlotLayerNode } from '../types/schema';
import { FigmaTypographyControl } from './FigmaTypographyControl';

export function InspectorPanel() {
  const [activeTab, setActiveTab] = useState<'design' | 'slot' | 'ai' | 'layers' | 'export'>('design');

  // AI Chat & Prompt state
  const [promptText, setPromptText] = useState(
    "High contrast tech carousel slide with bold typography: '5 Figma Shortcuts That Saved Me 100+ Hours', dark background #0d0e12, modern neon blue subheader and sleek minimal visual layout"
  );
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'I updated the headline typography to 54px bold and optimized contrast for social feeds.',
      time: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  // Layers Tree Local State
  const [layerSearchQuery, setLayerSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; zone: 'before' | 'inside' | 'after' } | null>(null);

  const documents = useCarouselStore((state) => state.documents);
  const activeDocumentId = useCarouselStore((state) => state.activeDocumentId);
  const activeSlideId = useCarouselStore((state) => state.activeSlideId);
  const selectedLayerId = useCarouselStore((state) => state.selectedLayerId);
  const selectedLayerIds = useCarouselStore((state) => state.selectedLayerIds);
  const setSelectedLayerId = useCarouselStore((state) => state.setSelectedLayerId);
  const setSelectedLayerIds = useCarouselStore((state) => state.setSelectedLayerIds);
  const toggleLayerSelection = useCarouselStore((state) => state.toggleLayerSelection);

  const expandedGroupIds = useCarouselStore((state) => state.expandedGroupIds);
  const toggleGroupExpand = useCarouselStore((state) => state.toggleGroupExpand);
  const hoveredLayerId = useCarouselStore((state) => state.hoveredLayerId);
  const setHoveredLayerId = useCarouselStore((state) => state.setHoveredLayerId);
  const editingLayerNameId = useCarouselStore((state) => state.editingLayerNameId);
  const setEditingLayerNameId = useCarouselStore((state) => state.setEditingLayerNameId);

  const groupSelectedLayers = useCarouselStore((state) => state.groupSelectedLayers);
  const ungroupLayer = useCarouselStore((state) => state.ungroupLayer);
  const moveLayerNode = useCarouselStore((state) => state.moveLayerNode);
  const moveSelectedLayersZOrder = useCarouselStore((state) => state.moveSelectedLayersZOrder);

  const updateLayerNode = useCarouselStore((state) => state.updateLayerNode);
  const updateShapeFill = useCarouselStore((state) => state.updateShapeFill);
  const updateShapeFillLive = useCarouselStore((state) => state.updateShapeFillLive);
  const commitShapeFillSnapshot = useCarouselStore((state) => state.commitShapeFillSnapshot);

  const toggleLayerVisibility = useCarouselStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useCarouselStore((state) => state.toggleLayerLock);
  const renameLayer = useCarouselStore((state) => state.renameLayer);

  const duplicateSelectedLayers = useCarouselStore((state) => state.duplicateSelectedLayers);
  const removeLayerNode = useCarouselStore((state) => state.removeLayerNode);
  const removeSelectedLayers = useCarouselStore((state) => state.removeSelectedLayers);
  const copySelectedLayers = useCarouselStore((state) => state.copySelectedLayers);
  const pasteLayers = useCarouselStore((state) => state.pasteLayers);
  const reorderLayer = useCarouselStore((state) => state.reorderLayer);
  const updateSlideBg = useCarouselStore((state) => state.updateSlideBg);

  const isTemplateEditorMode = useCarouselStore((state) => state.isTemplateEditorMode);
  const getActiveMasterLayout = useCarouselStore((state) => state.getActiveMasterLayout);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeSlide = activeDoc?.slides.find((s) => s.id === activeSlideId) || activeDoc?.slides[0];
  const activeLayout = getActiveMasterLayout();

  const activeContainer = isTemplateEditorMode ? activeLayout : activeSlide;

  const selectedLayer = activeContainer?.layers.find((l) => l.id === selectedLayerId);


  // Gradient Stop Local State Selection
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const handleSendChatMessage = (textToSend?: string) => {
    const msg = textToSend || chatInput;
    if (!msg.trim()) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: msg, time: 'Just now' }]);
    if (!textToSend) setChatInput('');
    setIsAiLoading(true);

    setTimeout(() => {
      if (msg.toLowerCase().includes('bigger') && selectedLayer && selectedLayer.type === 'text') {
        const currentSize = (selectedLayer as TextLayerNode).fontSize || 40;
        updateLayerNode(selectedLayer.id, { fontSize: currentSize + 12 });
      } else if (msg.toLowerCase().includes('red') || msg.toLowerCase().includes('color')) {
        updateSlideBg('#990000');
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Applied visual refinement for: "${msg}". Canvas updated live.`,
          time: 'Just now'
        }
      ]);
      setIsAiLoading(false);
    }, 600);
  };

  const handleExport = async (format: 'png' | 'pdf' | 'zip') => {
    if (!activeDoc) return;
    setExportingFormat(format);
    try {
      if (format === 'png') await exportCarouselAsPNG(activeDoc);
      else if (format === 'pdf') await exportCarouselAsPDF(activeDoc);
      else if (format === 'zip') await exportCarouselAsZip(activeDoc);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  // GRADIENT HELPERS
  const getFillType = (fill: ShapeFill | string): 'solid' | 'linear-gradient' | 'radial-gradient' => {
    if (typeof fill === 'string') return 'solid';
    return fill.type;
  };

  const handleFillTypeChange = (type: 'solid' | 'linear-gradient' | 'radial-gradient') => {
    if (!selectedLayer || selectedLayer.type !== 'shape') return;
    if (type === 'solid') {
      updateShapeFill(selectedLayer.id, '#0A84FF');
    } else if (type === 'linear-gradient') {
      const defaultLinear: LinearGradientFill = {
        type: 'linear-gradient',
        angle: 90,
        start: { x: 0, y: 0.5 },
        end: { x: 1, y: 0.5 },
        stops: [
          { id: 'stop-1', offset: 0, color: '#FF0000', opacity: 1 },
          { id: 'stop-2', offset: 0.6, color: '#FF0000', opacity: 0.45 },
          { id: 'stop-3', offset: 1, color: '#FF0000', opacity: 0 }
        ]
      };
      updateShapeFill(selectedLayer.id, defaultLinear);
      setSelectedStopId('stop-1');
    } else if (type === 'radial-gradient') {
      const defaultRadial: RadialGradientFill = {
        type: 'radial-gradient',
        center: { x: 0.5, y: 0.5 },
        radius: { x: 0.5, y: 0.5 },
        stops: [
          { id: 'stop-1', offset: 0, color: '#0A84FF', opacity: 1 },
          { id: 'stop-2', offset: 1, color: '#121318', opacity: 0 }
        ]
      };
      updateShapeFill(selectedLayer.id, defaultRadial);
      setSelectedStopId('stop-1');
    }
  };

  const applyGradientPreset = (presetKey: string) => {
    if (!selectedLayer || selectedLayer.type !== 'shape') return;
    const currentFill = (selectedLayer as ShapeLayerNode).fill;
    let baseColor = '#FF0000';
    if (typeof currentFill !== 'string' && currentFill.type !== 'solid' && currentFill.stops.length > 0) {
      baseColor = currentFill.stops[0].color || '#FF0000';
    }

    let newFill: ShapeFill;
    switch (presetKey) {
      case 'color-to-trans':
        newFill = {
          type: 'linear-gradient',
          angle: 90,
          start: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 },
          stops: [
            { id: 's1', offset: 0, color: baseColor, opacity: 1 },
            { id: 's2', offset: 0.6, color: baseColor, opacity: 0.45 },
            { id: 's3', offset: 1, color: baseColor, opacity: 0 }
          ]
        };
        break;
      case 'trans-to-color':
        newFill = {
          type: 'linear-gradient',
          angle: 90,
          start: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 },
          stops: [
            { id: 's1', offset: 0, color: baseColor, opacity: 0 },
            { id: 's2', offset: 1, color: baseColor, opacity: 1 }
          ]
        };
        break;
      case 'black-to-trans':
        newFill = {
          type: 'linear-gradient',
          angle: 180,
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          stops: [
            { id: 's1', offset: 0, color: '#000000', opacity: 1 },
            { id: 's2', offset: 1, color: '#000000', opacity: 0 }
          ]
        };
        break;
      case 'trans-to-black':
        newFill = {
          type: 'linear-gradient',
          angle: 180,
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          stops: [
            { id: 's1', offset: 0, color: '#000000', opacity: 0 },
            { id: 's2', offset: 1, color: '#000000', opacity: 1 }
          ]
        };
        break;
      case 'top-fade':
        newFill = {
          type: 'linear-gradient',
          angle: 180,
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          stops: [
            { id: 's1', offset: 0, color: '#000000', opacity: 0.9 },
            { id: 's2', offset: 1, color: '#000000', opacity: 0 }
          ]
        };
        break;
      case 'bottom-fade':
        newFill = {
          type: 'linear-gradient',
          angle: 0,
          start: { x: 0.5, y: 1 },
          end: { x: 0.5, y: 0 },
          stops: [
            { id: 's1', offset: 0, color: '#000000', opacity: 0.9 },
            { id: 's2', offset: 1, color: '#000000', opacity: 0 }
          ]
        };
        break;
      case 'left-fade':
        newFill = {
          type: 'linear-gradient',
          angle: 90,
          start: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 },
          stops: [
            { id: 's1', offset: 0, color: '#000000', opacity: 0.9 },
            { id: 's2', offset: 1, color: '#000000', opacity: 0 }
          ]
        };
        break;
      case 'right-fade':
        newFill = {
          type: 'linear-gradient',
          angle: 270,
          start: { x: 1, y: 0.5 },
          end: { x: 0, y: 0.5 },
          stops: [
            { id: 's1', offset: 0, color: '#000000', opacity: 0.9 },
            { id: 's2', offset: 1, color: '#000000', opacity: 0 }
          ]
        };
        break;
      case 'soft-glow':
        newFill = {
          type: 'radial-gradient',
          center: { x: 0.5, y: 0.5 },
          radius: { x: 0.5, y: 0.5 },
          stops: [
            { id: 's1', offset: 0, color: '#2A84FF', opacity: 1 },
            { id: 's2', offset: 1, color: '#2A84FF', opacity: 0 }
          ]
        };
        break;
      case 'soft-edge-fade':
        newFill = {
          type: 'radial-gradient',
          center: { x: 0.5, y: 0.5 },
          radius: { x: 0.5, y: 0.5 },
          stops: [
            { id: 's1', offset: 0, color: '#000000', opacity: 0 },
            { id: 's2', offset: 1, color: '#000000', opacity: 1 }
          ]
        };
        break;
      default:
        return;
    }
    updateShapeFill(selectedLayer.id, newFill);
    setSelectedStopId(newFill.stops[0].id);
  };

  return (
    <div className="w-full lg:w-[340px] bg-surface border-t lg:border-t-0 lg:border-l border-border-default flex flex-col h-full overflow-hidden z-20">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-border-default bg-surface-elevated">
        <button
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border-b-2 ${
            activeTab === 'design'
              ? 'text-white border-accent-blue bg-surface'
              : 'text-text-secondary hover:text-white border-transparent'
          }`}
          onClick={() => setActiveTab('design')}
        >
          <Palette className="w-3.5 h-3.5" />
          Design
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border-b-2 ${
            activeTab === 'slot'
              ? 'text-white border-accent-blue bg-surface'
              : 'text-text-secondary hover:text-white border-transparent'
          }`}
          onClick={() => setActiveTab('slot')}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Slot
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border-b-2 ${
            activeTab === 'ai'
              ? 'text-white border-accent-blue bg-surface'
              : 'text-text-secondary hover:text-white border-transparent'
          }`}
          onClick={() => setActiveTab('ai')}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Creative AI
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border-b-2 ${
            activeTab === 'layers'
              ? 'text-white border-accent-blue bg-surface'
              : 'text-text-secondary hover:text-white border-transparent'
          }`}
          onClick={() => setActiveTab('layers')}
        >
          <LayersIcon className="w-3.5 h-3.5" />
          Layers
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border-b-2 ${
            activeTab === 'export'
              ? 'text-white border-accent-blue bg-surface'
              : 'text-text-secondary hover:text-white border-transparent'
          }`}
          onClick={() => setActiveTab('export')}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* SLOT TAB */}
        {activeTab === 'slot' && (
          <div className="space-y-4">
            {!selectedLayer ? (
              <div className="text-center py-8 text-text-tertiary text-xs">
                Select a layer on canvas or layers panel to configure template slot settings.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    Template Slot Configuration
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">{selectedLayer.type}</span>
                </div>

                {/* Semantic Role Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                    Semantic Role
                  </label>
                  <select
                    className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-border-focus"
                    value={selectedLayer.semanticRole || 'none'}
                    onChange={(e) => updateLayerNode(selectedLayer.id, { semanticRole: e.target.value as any })}
                  >
                    <option value="none">None (Standard Layer)</option>
                    <option value="headline">Headline</option>
                    <option value="subtitle">Subtitle</option>
                    <option value="body">Body Copy</option>
                    <option value="hero_image">Hero Image</option>
                    <option value="bg_image">Background Image</option>
                    <option value="cta">CTA Trigger</option>
                    <option value="author_name">Author Name</option>
                    <option value="author_avatar">Author Avatar</option>
                    <option value="logo">Brand Logo</option>
                    <option value="badge">Badge / Tag</option>
                    <option value="slide_number">Slide Counter</option>
                  </select>
                </div>

                {/* Static vs Dynamic Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-surface-elevated rounded border border-border-default">
                  <div>
                    <div className="text-xs font-medium text-white">Static Master Element</div>
                    <div className="text-[10px] text-text-tertiary">Same on all slides (e.g. logo, header)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!selectedLayer.isStatic}
                    onChange={(e) => updateLayerNode(selectedLayer.id, { isStatic: e.target.checked })}
                    className="w-4 h-4 accent-accent-blue rounded cursor-pointer"
                  />
                </div>

                {/* Editable Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-surface-elevated rounded border border-border-default">
                  <div>
                    <div className="text-xs font-medium text-white">Editable Content</div>
                    <div className="text-[10px] text-text-tertiary">User can edit copy/media in template</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedLayer.isEditable !== false}
                    onChange={(e) => updateLayerNode(selectedLayer.id, { isEditable: e.target.checked })}
                    className="w-4 h-4 accent-accent-blue rounded cursor-pointer"
                  />
                </div>

                {/* Text Slot Constraints (Text Layer Only) */}
                {selectedLayer.type === 'text' && (() => {
                  const textNode = selectedLayer as TextLayerNode;
                  const constraints = textNode.constraints || textNode.textConstraints || { overflow: 'shrink' };

                  const updateConstraints = (patch: any) => {
                    const next = { ...constraints, ...patch };
                    updateLayerNode(selectedLayer.id, {
                      constraints: next,
                      textConstraints: next
                    } as any);
                  };

                  return (
                    <div className="space-y-3 pt-2 border-t border-border-subtle">
                      <div className="text-[11px] font-bold uppercase text-accent-blue tracking-wider">
                        Typography Auto-Fit & Constraints
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-text-secondary mb-1">Max Lines</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            className="w-full bg-surface-elevated border border-border-default rounded px-2 py-1 text-xs text-white"
                            value={constraints.maxLines || ''}
                            placeholder="Unlimited"
                            onChange={(e) => updateConstraints({ maxLines: e.target.value ? parseInt(e.target.value) : undefined })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-text-secondary mb-1">Overflow Strategy</label>
                          <select
                            className="w-full bg-surface-elevated border border-border-default rounded px-2 py-1 text-xs text-white"
                            value={constraints.overflow || 'shrink'}
                            onChange={(e) => updateConstraints({ overflow: e.target.value as any })}
                          >
                            <option value="shrink">Auto-Shrink</option>
                            <option value="truncate">Truncate (...)</option>
                            <option value="wrap">Wrap Multi-line</option>
                            <option value="fixed">Fixed Overflow</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-text-secondary mb-1">Min Font Size (px)</label>
                          <input
                            type="number"
                            min="8"
                            max="200"
                            className="w-full bg-surface-elevated border border-border-default rounded px-2 py-1 text-xs text-white"
                            value={constraints.minFontSize || 14}
                            onChange={(e) => updateConstraints({ minFontSize: parseInt(e.target.value) || 14 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-text-secondary mb-1">Max Font Size (px)</label>
                          <input
                            type="number"
                            min="8"
                            max="200"
                            className="w-full bg-surface-elevated border border-border-default rounded px-2 py-1 text-xs text-white"
                            value={constraints.maxFontSize || 96}
                            onChange={(e) => updateConstraints({ maxFontSize: parseInt(e.target.value) || 96 })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Image Slot Controls */}
                {(selectedLayer.type === 'image-slot' || selectedLayer.type === 'image') && (() => {
                  const isSlot = selectedLayer.type === 'image-slot';
                  const slotNode = selectedLayer as any;

                  return (
                    <div className="space-y-3 pt-2 border-t border-border-subtle">
                      <div className="text-[11px] font-bold uppercase text-accent-blue tracking-wider">
                        Image Slot & Focal Crop Controls
                      </div>

                      {!isSlot ? (
                        <button
                          className="w-full py-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-blue/40 text-accent-blue text-xs font-semibold rounded transition-colors"
                          onClick={() => {
                            updateLayerNode(selectedLayer.id, {
                              type: 'image-slot',
                              slotLabel: selectedLayer.name || 'Image Slot',
                              fit: 'cover',
                              focalPoint: { x: 0.5, y: 0.5 },
                              semanticRole: selectedLayer.semanticRole || 'hero_image'
                            } as any);
                          }}
                        >
                          Convert Image to Template Slot
                        </button>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[10px] text-text-secondary mb-1">Slot Label</label>
                            <input
                              type="text"
                              className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1 text-xs text-white"
                              value={slotNode.slotLabel || ''}
                              placeholder="e.g. Hero Photography Slot"
                              onChange={(e) => updateLayerNode(selectedLayer.id, { slotLabel: e.target.value } as any)}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-text-secondary mb-1">Image Fit</label>
                            <select
                              className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1 text-xs text-white"
                              value={slotNode.fit || 'cover'}
                              onChange={(e) => updateLayerNode(selectedLayer.id, { fit: e.target.value as any } as any)}
                            >
                              <option value="cover">Cover (Fill & Crop)</option>
                              <option value="contain">Contain (Fit Aspect)</option>
                              <option value="fill">Fill (Stretch)</option>
                              <option value="crop">Custom Focal Crop</option>
                            </select>
                          </div>

                          {/* Focal Point Controls */}
                          <div className="space-y-2 bg-surface-elevated p-2.5 rounded border border-border-default">
                            <div className="text-[10px] font-semibold text-white uppercase">Focal Point Position</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] text-text-secondary">Focal X ({(slotNode.focalPoint?.x ?? 0.5).toFixed(2)})</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={slotNode.focalPoint?.x ?? 0.5}
                                  onChange={(e) => updateLayerNode(selectedLayer.id, {
                                    focalPoint: { x: parseFloat(e.target.value), y: slotNode.focalPoint?.y ?? 0.5 }
                                  } as any)}
                                  className="w-full accent-accent-blue"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-text-secondary">Focal Y ({(slotNode.focalPoint?.y ?? 0.5).toFixed(2)})</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={slotNode.focalPoint?.y ?? 0.5}
                                  onChange={(e) => updateLayerNode(selectedLayer.id, {
                                    focalPoint: { x: slotNode.focalPoint?.x ?? 0.5, y: parseFloat(e.target.value) }
                                  } as any)}
                                  className="w-full accent-accent-blue"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-text-secondary mb-1">Assigned Image URL</label>
                            <input
                              type="text"
                              className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1 text-xs text-white"
                              value={slotNode.assignedMediaUrl || ''}
                              placeholder="https://..."
                              onChange={(e) => updateLayerNode(selectedLayer.id, { assignedMediaUrl: e.target.value } as any)}
                            />
                          </div>

                          <button
                            className="w-full py-1 text-[11px] text-text-secondary hover:text-white border border-border-default rounded transition-colors"
                            onClick={() => updateLayerNode(selectedLayer.id, { type: 'image', url: slotNode.assignedMediaUrl || '' } as any)}
                          >
                            Convert back to Standard Image Layer
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <div className="space-y-4">
            {selectedLayer ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    {selectedLayer.type} Layer Properties
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">{selectedLayer.id}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                    Layer Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-border-focus"
                    value={selectedLayer.name}
                    onChange={(e) => updateLayerNode(selectedLayer.id, { name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                    Semantic Role (Template Mapping)
                  </label>
                  <select
                    className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-border-focus"
                    value={selectedLayer.semanticRole || 'none'}
                    onChange={(e) => updateLayerNode(selectedLayer.id, { semanticRole: e.target.value as any })}
                  >
                    <option value="none">None</option>
                    <option value="headline">Headline</option>
                    <option value="subtitle">Subtitle</option>
                    <option value="body">Body Copy</option>
                    <option value="hero_image">Hero Image</option>
                    <option value="cta">CTA Trigger</option>
                    <option value="accent">Accent Graphic</option>
                  </select>
                </div>

                {/* TEXT LAYER CONTROLS */}
                {selectedLayer.type === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                        Text Content
                      </label>
                      <textarea
                        className="w-full bg-surface-elevated border border-border-default rounded p-2.5 text-xs text-white outline-none focus:border-border-focus resize-none font-sans"
                        rows={3}
                        value={(selectedLayer as TextLayerNode).content}
                        onChange={(e) => updateLayerNode(selectedLayer.id, { content: e.target.value })}
                      />
                    </div>

                    {/* FIGMA TYPOGRAPHY PANEL */}
                    <FigmaTypographyControl
                      layer={selectedLayer as TextLayerNode}
                      onUpdate={(patch) => updateLayerNode(selectedLayer.id, patch)}
                    />
                  </div>
                )}

                {/* IMAGE LAYER CONTROLS */}
                {selectedLayer.type === 'image' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                        Image Asset URL
                      </label>
                      <input
                        type="text"
                        className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-border-focus font-mono"
                        value={(selectedLayer as ImageLayerNode).url || ''}
                        onChange={(e) => updateLayerNode(selectedLayer.id, { url: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                        Corner Radius (px)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        className="w-full accent-accent-blue"
                        value={(selectedLayer as ImageLayerNode).borderRadius || 0}
                        onChange={(e) => updateLayerNode(selectedLayer.id, { borderRadius: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                {/* SHAPE LAYER CONTROLS & GRADIENT UI ENGINE */}
                {selectedLayer.type === 'shape' && (
                  <div className="space-y-4">
                    {/* Fill Mode Selector (Solid, Linear, Radial) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                        Fill Mode
                      </label>
                      <div className="flex rounded border border-border-default overflow-hidden bg-surface-elevated">
                        {(['solid', 'linear-gradient', 'radial-gradient'] as const).map((type) => (
                          <button
                            key={type}
                            className={`flex-1 py-1.5 text-[11px] capitalize font-medium transition-colors ${
                              getFillType((selectedLayer as ShapeLayerNode).fill) === type
                                ? 'bg-accent-blue text-white'
                                : 'text-text-secondary hover:text-white'
                            }`}
                            onClick={() => handleFillTypeChange(type)}
                          >
                            {type.replace('-gradient', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SOLID COLOR PICKER */}
                    {typeof (selectedLayer as ShapeLayerNode).fill === 'string' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                          Solid Fill Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="w-8 h-8 rounded border border-border-default cursor-pointer p-0 bg-transparent"
                            value={(selectedLayer as ShapeLayerNode).fill as string}
                            onChange={(e) => updateShapeFill(selectedLayer.id, e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full bg-surface-elevated border border-border-default rounded px-2 py-1.5 text-xs text-white font-mono uppercase"
                            value={(selectedLayer as ShapeLayerNode).fill as string}
                            onChange={(e) => updateShapeFill(selectedLayer.id, e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* GRADIENT CONTROL ENGINE (Linear & Radial) */}
                    {typeof (selectedLayer as ShapeLayerNode).fill !== 'string' && (
                      <div className="space-y-4 bg-surface-elevated p-3 rounded-lg border border-border-default">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-accent-blue uppercase tracking-wider block">
                            FIGMA GRADIENT ENGINE
                          </span>
                          {/* Quick Presets Dropdown */}
                          <select
                            className="bg-surface border border-border-default text-text-secondary hover:text-white rounded px-2 py-0.5 text-[10px] outline-none cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                applyGradientPreset(e.target.value);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">Presets...</option>
                            <option value="color-to-trans">Color → Transparent</option>
                            <option value="trans-to-color">Transparent → Color</option>
                            <option value="black-to-trans">Black → Transparent</option>
                            <option value="trans-to-black">Transparent → Black</option>
                            <option value="top-fade">Top Fade</option>
                            <option value="bottom-fade">Bottom Fade</option>
                            <option value="left-fade">Left Fade</option>
                            <option value="right-fade">Right Fade</option>
                            <option value="soft-glow">Soft Center Glow</option>
                            <option value="soft-edge-fade">Soft Edge Fade</option>
                          </select>
                        </div>

                        {/* Checkerboard Alpha Preview & Interactive Gradient Bar */}
                        {(() => {
                          const currentFill = (selectedLayer as ShapeLayerNode).fill as LinearGradientFill | RadialGradientFill;
                          const stops = [...currentFill.stops].sort((a, b) => a.offset - b.offset);
                          const activeStop = stops.find((s) => s.id === selectedStopId) || stops[0];

                          // Compute CSS background for gradient preview bar with exact transparency
                          const cssStops = stops
                            .map((s) => `${hexOrColorToRgba(s.color, s.opacity ?? 1)} ${Math.round(s.offset * 100)}%`)
                            .join(', ');

                          const barGradientBg =
                            currentFill.type === 'linear-gradient'
                              ? `linear-gradient(${currentFill.angle ?? 90}deg, ${cssStops})`
                              : `radial-gradient(circle, ${cssStops})`;

                          return (
                            <div className="space-y-3">
                              {/* Bar Container with Checkerboard Background */}
                              <div
                                className="relative h-7 rounded-md border border-border-default overflow-hidden cursor-pointer select-none"
                                style={{
                                  backgroundImage: `
                                    linear-gradient(45deg, #2A2E39 25%, transparent 25%),
                                    linear-gradient(-45deg, #2A2E39 25%, transparent 25%),
                                    linear-gradient(45deg, transparent 75%, #2A2E39 75%),
                                    linear-gradient(-45deg, transparent 75%, #2A2E39 75%)
                                  `,
                                  backgroundSize: '10px 10px',
                                  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                                  backgroundColor: '#12151B'
                                }}
                                onDoubleClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clickOffset = Math.max(0, Math.min(1, Number(((e.clientX - rect.left) / rect.width).toFixed(2))));
                                  if (currentFill.stops.length >= 8) return;

                                  const newStop: GradientStop = {
                                    id: `stop-${Date.now()}`,
                                    offset: clickOffset,
                                    color: activeStop ? activeStop.color : '#FF0000',
                                    opacity: activeStop ? activeStop.opacity : 1
                                  };
                                  const updatedStops = [...currentFill.stops, newStop].sort((a, b) => a.offset - b.offset);
                                  updateShapeFill(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                  setSelectedStopId(newStop.id);
                                }}
                              >
                                {/* Colored Overlay */}
                                <div className="absolute inset-0" style={{ background: barGradientBg }} />

                                {/* Stop Markers on Bar */}
                                {stops.map((stop) => {
                                  const isSelected = stop.id === (activeStop?.id || selectedStopId);
                                  return (
                                    <div
                                      key={stop.id}
                                      className={`absolute top-0 bottom-0 w-3 cursor-pointer transition-transform shadow ${
                                        isSelected ? 'ring-2 ring-accent-blue z-20 scale-110' : 'z-10'
                                      }`}
                                      style={{
                                        left: `calc(${stop.offset * 100}% - 6px)`,
                                        backgroundColor: stop.color,
                                        border: '2px solid #FFFFFF'
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStopId(stop.id);
                                      }}
                                    />
                                  );
                                })}
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-text-tertiary">
                                <span>Double-click bar to add stop (min 2, max 8).</span>
                                <span>Stop {stops.findIndex((s) => s.id === activeStop?.id) + 1} of {stops.length}</span>
                              </div>

                              {/* SELECTED STOP CONTROLS */}
                              {activeStop && (
                                <div className="bg-surface p-2.5 rounded border border-border-subtle space-y-2.5">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-white uppercase tracking-wider">
                                    <span>Stop #{stops.findIndex((s) => s.id === activeStop.id) + 1} Properties</span>
                                    <div className="flex gap-1">
                                      {/* Duplicate Stop Button */}
                                      <button
                                        className="px-1.5 py-0.5 bg-surface-elevated hover:bg-surface-hover rounded text-[9px] text-text-secondary hover:text-white"
                                        title="Duplicate Stop"
                                        onClick={() => {
                                          if (stops.length >= 8) return;
                                          const newStop: GradientStop = {
                                            id: `stop-${Date.now()}`,
                                            offset: Math.min(1, Number((activeStop.offset + 0.05).toFixed(2))),
                                            color: activeStop.color,
                                            opacity: activeStop.opacity
                                          };
                                          const updatedStops = [...currentFill.stops, newStop].sort((a, b) => a.offset - b.offset);
                                          updateShapeFill(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                          setSelectedStopId(newStop.id);
                                        }}
                                      >
                                        Copy
                                      </button>
                                      {/* Remove Stop Button */}
                                      <button
                                        className="px-1.5 py-0.5 bg-surface-elevated hover:bg-red-500/20 text-text-secondary hover:text-red-400 rounded text-[9px] disabled:opacity-30"
                                        title="Delete Stop"
                                        disabled={stops.length <= 2}
                                        onClick={() => {
                                          if (stops.length <= 2) return;
                                          const updatedStops = currentFill.stops.filter((s) => s.id !== activeStop.id);
                                          updateShapeFill(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                          setSelectedStopId(updatedStops[0]?.id || null);
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {/* Stop Color */}
                                  <div>
                                    <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">
                                      Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        className="w-7 h-7 rounded border border-border-default cursor-pointer p-0 bg-transparent"
                                        value={activeStop.color}
                                        onChange={(e) => {
                                          const updatedStops = currentFill.stops.map((s) =>
                                            s.id === activeStop.id ? { ...s, color: e.target.value } : s
                                          );
                                          updateShapeFillLive(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                        }}
                                        onBlur={() => commitShapeFillSnapshot('CHANGE_STOP_COLOR')}
                                      />
                                      <input
                                        type="text"
                                        className="w-full bg-surface-elevated border border-border-default rounded px-2 py-1 text-xs text-white font-mono uppercase outline-none focus:border-border-focus"
                                        value={activeStop.color}
                                        onChange={(e) => {
                                          const updatedStops = currentFill.stops.map((s) =>
                                            s.id === activeStop.id ? { ...s, color: e.target.value } : s
                                          );
                                          updateShapeFillLive(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                        }}
                                        onBlur={() => commitShapeFillSnapshot('CHANGE_STOP_COLOR')}
                                      />
                                    </div>
                                  </div>

                                  {/* Stop Opacity Control (0-100%) */}
                                  <div>
                                    <div className="flex justify-between items-center text-[10px] text-text-secondary font-semibold mb-1">
                                      <span>Opacity</span>
                                      <div className="flex items-center gap-1 font-mono">
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="w-12 bg-surface-elevated border border-border-default rounded text-right px-1 py-0.5 text-xs text-white"
                                          value={Math.round(activeStop.opacity * 100)}
                                          onChange={(e) => {
                                            const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                            const updatedStops = currentFill.stops.map((s) =>
                                              s.id === activeStop.id ? { ...s, opacity: Number((val / 100).toFixed(2)) } : s
                                            );
                                            updateShapeFillLive(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                          }}
                                          onBlur={() => commitShapeFillSnapshot('CHANGE_STOP_OPACITY')}
                                        />
                                        <span>%</span>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      className="w-full accent-accent-blue"
                                      value={Math.round(activeStop.opacity * 100)}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const updatedStops = currentFill.stops.map((s) =>
                                          s.id === activeStop.id ? { ...s, opacity: Number((val / 100).toFixed(2)) } : s
                                        );
                                        updateShapeFillLive(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                      }}
                                      onMouseUp={() => commitShapeFillSnapshot('CHANGE_STOP_OPACITY')}
                                      onTouchEnd={() => commitShapeFillSnapshot('CHANGE_STOP_OPACITY')}
                                    />
                                  </div>

                                  {/* Stop Position Control (0-100%) */}
                                  <div>
                                    <div className="flex justify-between items-center text-[10px] text-text-secondary font-semibold mb-1">
                                      <span>Position</span>
                                      <div className="flex items-center gap-1 font-mono">
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="w-12 bg-surface-elevated border border-border-default rounded text-right px-1 py-0.5 text-xs text-white"
                                          value={Math.round(activeStop.offset * 100)}
                                          onChange={(e) => {
                                            const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                            const updatedStops = currentFill.stops
                                              .map((s) => (s.id === activeStop.id ? { ...s, offset: Number((val / 100).toFixed(2)) } : s))
                                              .sort((a, b) => a.offset - b.offset);
                                            updateShapeFillLive(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                          }}
                                          onBlur={() => commitShapeFillSnapshot('CHANGE_STOP_OFFSET')}
                                        />
                                        <span>%</span>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      className="w-full accent-accent-blue"
                                      value={Math.round(activeStop.offset * 100)}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const updatedStops = currentFill.stops
                                          .map((s) => (s.id === activeStop.id ? { ...s, offset: Number((val / 100).toFixed(2)) } : s))
                                          .sort((a, b) => a.offset - b.offset);
                                        updateShapeFillLive(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                      }}
                                      onMouseUp={() => commitShapeFillSnapshot('CHANGE_STOP_OFFSET')}
                                      onTouchEnd={() => commitShapeFillSnapshot('CHANGE_STOP_OFFSET')}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Angle Control for Linear Gradient */}
                              {currentFill.type === 'linear-gradient' && (
                                <div>
                                  <div className="flex justify-between items-center text-[10px] text-text-secondary font-semibold mb-1">
                                    <span>Gradient Angle</span>
                                    <span className="font-mono">{currentFill.angle ?? 90}°</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={360}
                                    className="w-full accent-accent-blue"
                                    value={currentFill.angle ?? 90}
                                    onChange={(e) => {
                                      const newAngle = Number(e.target.value);
                                      const rad = (newAngle * Math.PI) / 180;
                                      const newStart = { x: Number((0.5 - 0.5 * Math.cos(rad)).toFixed(3)), y: Number((0.5 - 0.5 * Math.sin(rad)).toFixed(3)) };
                                      const newEnd = { x: Number((0.5 + 0.5 * Math.cos(rad)).toFixed(3)), y: Number((0.5 + 0.5 * Math.sin(rad)).toFixed(3)) };
                                      updateShapeFillLive(selectedLayer.id, {
                                        ...currentFill,
                                        angle: newAngle,
                                        start: newStart,
                                        end: newEnd
                                      });
                                    }}
                                    onMouseUp={() => commitShapeFillSnapshot('CHANGE_GRADIENT_ANGLE')}
                                    onTouchEnd={() => commitShapeFillSnapshot('CHANGE_GRADIENT_ANGLE')}
                                  />
                                </div>
                              )}

                              {/* Action Buttons: Reverse Stops & Add Stop */}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  className="py-1.5 px-2 bg-surface hover:bg-surface-hover border border-border-default rounded text-[10px] font-semibold text-text-secondary hover:text-white flex items-center justify-center gap-1"
                                  onClick={() => {
                                    const reversedStops = currentFill.stops
                                      .map((s) => ({ ...s, offset: Number((1 - s.offset).toFixed(2)) }))
                                      .sort((a, b) => a.offset - b.offset);
                                    updateShapeFill(selectedLayer.id, { ...currentFill, stops: reversedStops });
                                  }}
                                >
                                  <RotateCw className="w-3 h-3" />
                                  Reverse Stops
                                </button>
                                <button
                                  className="py-1.5 px-2 bg-surface hover:bg-surface-hover border border-border-default rounded text-[10px] font-semibold text-text-secondary hover:text-white flex items-center justify-center gap-1"
                                  onClick={() => {
                                    if (currentFill.stops.length >= 8) return;
                                    const newStop: GradientStop = {
                                      id: `stop-${Date.now()}`,
                                      offset: 0.5,
                                      color: activeStop ? activeStop.color : '#FF0000',
                                      opacity: activeStop ? activeStop.opacity : 0.5
                                    };
                                    const updatedStops = [...currentFill.stops, newStop].sort((a, b) => a.offset - b.offset);
                                    updateShapeFill(selectedLayer.id, { ...currentFill, stops: updatedStops });
                                    setSelectedStopId(newStop.id);
                                  }}
                                >
                                  <Plus className="w-3 h-3" />
                                  + Add Stop
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="pb-2 border-b border-border-subtle">
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    Slide #{activeDoc?.slides.findIndex(s => s.id === activeSlideId)! + 1 || 1} Properties
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                    Canvas Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-9 h-9 rounded border border-border-default cursor-pointer p-0 bg-transparent"
                      value={activeSlide?.backgroundColor || '#111111'}
                      onChange={(e) => updateSlideBg(e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full bg-surface-elevated border border-border-default rounded px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                      value={activeSlide?.backgroundColor || '#111111'}
                      onChange={(e) => updateSlideBg(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CREATIVE AI TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-5">
            <div className="bg-surface-elevated rounded-lg border border-border-default p-3 space-y-2.5">
              <span className="text-[10px] font-bold text-accent-blue tracking-wider uppercase block">
                SLIDE PROMPT (GENERATED BY AI)
              </span>
              <textarea
                className="w-full bg-surface border border-border-default rounded p-2.5 text-xs text-white placeholder-text-tertiary focus:border-border-focus outline-none resize-none leading-relaxed"
                rows={4}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  className="py-1.5 px-2 bg-surface hover:bg-surface-hover border border-border-default text-text-secondary hover:text-white rounded text-[11px] font-medium flex items-center justify-center gap-1"
                  onClick={() => navigator.clipboard.writeText(promptText)}
                >
                  <Copy className="w-3 h-3" />
                  Copy Prompt
                </button>
                <button
                  className="py-1.5 px-2 bg-surface hover:bg-surface-hover border border-border-default text-text-secondary hover:text-white rounded text-[11px] font-medium flex items-center justify-center gap-1"
                  onClick={() => setPromptText("Regenerated visual concept: Bold dynamic typography with neon accents.")}
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
            </div>

            <div className="bg-surface-elevated rounded-lg border border-border-default p-3 space-y-3">
              <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block">
                REFINE VISUALS VIA CHAT
              </span>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded text-xs leading-normal ${
                      msg.sender === 'user'
                        ? 'bg-blue-600/20 border border-blue-500/30 text-white ml-4'
                        : 'bg-surface border border-border-subtle text-text-secondary mr-4'
                    }`}
                  >
                    <div className="font-semibold text-[10px] mb-0.5 text-text-tertiary uppercase">
                      {msg.sender === 'user' ? 'You' : 'Creative AI Director'}
                    </div>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  className="flex-1 bg-surface border border-border-default rounded px-2.5 py-1.5 text-xs text-white placeholder-text-tertiary outline-none focus:border-border-focus"
                  placeholder="Ask AI to edit canvas..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                />
                <button
                  className="px-3 bg-accent-blue text-white rounded hover:bg-blue-600 flex items-center justify-center"
                  onClick={() => handleSendChatMessage()}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LAYERS TAB (FIGMA-GRADE DOCUMENT HIERARCHY SYSTEM) */}
        {activeTab === 'layers' && (
          <div className="space-y-3 relative" onClick={() => setContextMenu(null)}>
            {/* Header & Filter Controls */}
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
              <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Document Hierarchy
              </h3>
              <span className="text-[10px] text-text-tertiary font-mono">
                {activeContainer?.layers.length || 0} nodes
              </span>
            </div>

            {/* Layer Search Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Filter layers (Cmd+F)..."
                className="w-full bg-surface-elevated border border-border-default rounded pl-8 pr-2.5 py-1 text-xs text-white placeholder-text-tertiary outline-none focus:border-border-focus"
                value={layerSearchQuery}
                onChange={(e) => setLayerSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick Action Bar (Group, Ungroup, Delete, Duplicate) */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              <button
                className="py-1 px-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-[10px] font-semibold text-text-secondary hover:text-white flex items-center justify-center gap-1 disabled:opacity-30"
                title="Group Selected (Cmd+G)"
                disabled={selectedLayerIds.length === 0}
                onClick={() => groupSelectedLayers()}
              >
                <Folder className="w-3 h-3 text-accent-blue" />
                Group
              </button>
              <button
                className="py-1 px-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-[10px] font-semibold text-text-secondary hover:text-white flex items-center justify-center gap-1 disabled:opacity-30"
                title="Ungroup (Cmd+Shift+G)"
                disabled={!selectedLayerIds.some(id => activeContainer?.layers.find(l => l.id === id)?.type === 'group')}
                onClick={() => {
                  const targetGroup = activeContainer?.layers.find(l => selectedLayerIds.includes(l.id) && l.type === 'group');
                  if (targetGroup) ungroupLayer(targetGroup.id);
                }}
              >
                <LayersIcon className="w-3 h-3 text-accent-purple" />
                Ungroup
              </button>
              <button
                className="py-1 px-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-[10px] font-semibold text-text-secondary hover:text-white flex items-center justify-center gap-1 disabled:opacity-30"
                title="Duplicate (Cmd+D)"
                disabled={selectedLayerIds.length === 0}
                onClick={() => duplicateSelectedLayers()}
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <button
                className="py-1 px-1.5 bg-surface-elevated hover:bg-red-500/20 border border-border-default rounded text-[10px] font-semibold text-text-secondary hover:text-red-400 flex items-center justify-center gap-1 disabled:opacity-30"
                title="Delete Selected"
                disabled={selectedLayerIds.length === 0}
                onClick={() => removeSelectedLayers()}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>

            {/* Tree View Container */}
            <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-0.5 select-none pt-1">
              {(() => {
                if (!activeContainer) return null;

                // Recursive Tree Render Function
                const renderTreeNode = (layer: LayerNode, level: number = 0): React.ReactNode => {
                  // Search query filter matching
                  if (layerSearchQuery.trim()) {
                    const match = layer.name.toLowerCase().includes(layerSearchQuery.toLowerCase()) ||
                                  layer.type.toLowerCase().includes(layerSearchQuery.toLowerCase());
                    if (!match && layer.type !== 'group') return null;
                  }

                  const isSelected = selectedLayerIds.includes(layer.id);
                  const isHovered = hoveredLayerId === layer.id;
                  const isEditingName = editingLayerNameId === layer.id;
                  const isExpanded = expandedGroupIds.includes(layer.id);
                  const isGroup = layer.type === 'group';

                  const isDropBefore = dropTarget?.id === layer.id && dropTarget.zone === 'before';
                  const isDropAfter = dropTarget?.id === layer.id && dropTarget.zone === 'after';
                  const isDropInside = dropTarget?.id === layer.id && dropTarget.zone === 'inside';

                  // Select icon by type
                  const getLayerIcon = () => {
                    if (layer.type === 'text') return <Type className="w-3.5 h-3.5 text-accent-blue" />;
                    if (layer.type === 'image') return <ImageIcon className="w-3.5 h-3.5 text-accent-green" />;
                    if (layer.type === 'shape') return <Square className="w-3.5 h-3.5 text-accent-orange" />;
                    if (layer.type === 'group') return <Folder className="w-3.5 h-3.5 text-accent-purple" />;
                    return <LayersIcon className="w-3.5 h-3.5 text-text-secondary" />;
                  };

                  return (
                    <React.Fragment key={layer.id}>
                      <div
                        draggable={!layer.isLocked}
                        className={`group relative h-8 px-2 rounded-md flex items-center justify-between text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-accent-blue/20 text-white border border-accent-blue/50 font-semibold'
                            : isHovered
                            ? 'bg-surface-hover text-white border border-transparent'
                            : 'text-text-secondary hover:text-white border border-transparent'
                        } ${isDropInside ? 'ring-2 ring-accent-blue bg-accent-blue/30' : ''}`}
                        style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerSelection(layer.id, e.metaKey || e.ctrlKey, e.shiftKey);
                        }}
                        onMouseEnter={() => setHoveredLayerId(layer.id)}
                        onMouseLeave={() => setHoveredLayerId(null)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!selectedLayerIds.includes(layer.id)) {
                            setSelectedLayerId(layer.id);
                          }
                          setContextMenu({ x: e.clientX, y: e.clientY, layerId: layer.id });
                        }}
                        onDragStart={(e) => {
                          setDraggedLayerId(layer.id);
                          e.dataTransfer.setData('text/plain', layer.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const relY = (e.clientY - rect.top) / rect.height;

                          if (isGroup) {
                            if (relY < 0.25) setDropTarget({ id: layer.id, zone: 'before' });
                            else if (relY > 0.75) setDropTarget({ id: layer.id, zone: 'after' });
                            else setDropTarget({ id: layer.id, zone: 'inside' });
                          } else {
                            if (relY < 0.5) setDropTarget({ id: layer.id, zone: 'before' });
                            else setDropTarget({ id: layer.id, zone: 'after' });
                          }
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!draggedLayerId || !dropTarget) return;

                          const currentIdx = activeContainer.layers.findIndex(l => l.id === layer.id);
                          if (dropTarget.zone === 'inside') {
                            moveLayerNode(draggedLayerId, layer.id, 0);
                            if (!expandedGroupIds.includes(layer.id)) toggleGroupExpand(layer.id);
                          } else if (dropTarget.zone === 'before') {
                            moveLayerNode(draggedLayerId, layer.parentId || null, currentIdx);
                          } else if (dropTarget.zone === 'after') {
                            moveLayerNode(draggedLayerId, layer.parentId || null, currentIdx + 1);
                          }

                          setDraggedLayerId(null);
                          setDropTarget(null);
                        }}
                      >
                        {/* Drag Insertion Lines */}
                        {isDropBefore && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent-blue z-30" />
                        )}
                        {isDropAfter && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue z-30" />
                        )}

                        {/* Disclosure Chevron & Icon */}
                        <div className="flex items-center gap-1.5 truncate">
                          {isGroup ? (
                            <button
                              className="p-0.5 hover:text-white text-text-tertiary rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupExpand(layer.id);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3.5" />
                          )}

                          {getLayerIcon()}

                          {/* Editable Name */}
                          {isEditingName ? (
                            <input
                              autoFocus
                              type="text"
                              className="bg-surface border border-accent-blue text-white rounded px-1 text-xs outline-none font-medium"
                              defaultValue={layer.name}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  renameLayer(layer.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingLayerNameId(null);
                                }
                              }}
                              onBlur={(e) => renameLayer(layer.id, e.currentTarget.value)}
                            />
                          ) : (
                            <span
                              className="truncate font-medium hover:underline cursor-pointer"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingLayerNameId(layer.id);
                              }}
                            >
                              {layer.name}
                            </span>
                          )}
                        </div>

                        {/* Context Controls (Visibility & Lock) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1 hover:text-white text-text-tertiary"
                            title="Toggle Lock"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerLock(layer.id);
                            }}
                          >
                            {layer.isLocked ? (
                              <Lock className="w-3 h-3 text-accent-orange" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            className="p-1 hover:text-white text-text-tertiary"
                            title="Toggle Visibility (Option/Alt+Click to Solo)"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id, e.altKey);
                            }}
                          >
                            {layer.isVisible ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-red-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Render Children if Group is Expanded */}
                      {isGroup && isExpanded && (
                        <div>
                          {activeContainer.layers
                            .filter((l) => l.parentId === layer.id)
                            .map((child) => renderTreeNode(child, level + 1))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                };

                // Render Top-Level Root Nodes in direct array order (index 0 = top of Layers Panel = frontmost)
                const rootLayers = activeContainer.layers.filter((l) => !l.parentId);
                return rootLayers.map((rootLayer) => renderTreeNode(rootLayer, 0));
              })()}
            </div>


            {/* RIGHT-CLICK CONTEXT MENU OVERLAY */}
            {contextMenu && (
              <div
                className="fixed bg-surface-elevated border border-border-default shadow-2xl rounded-lg py-1.5 w-44 z-50 text-xs text-white divide-y divide-border-subtle"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-surface-hover flex items-center justify-between"
                    onClick={() => {
                      setEditingLayerNameId(contextMenu.layerId);
                      setContextMenu(null);
                    }}
                  >
                    <span>Rename</span>
                    <span className="text-[10px] text-text-tertiary font-mono">Enter</span>
                  </button>
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-surface-hover flex items-center justify-between"
                    onClick={() => {
                      duplicateSelectedLayers();
                      setContextMenu(null);
                    }}
                  >
                    <span>Duplicate</span>
                    <span className="text-[10px] text-text-tertiary font-mono">⌘D</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-surface-hover flex items-center justify-between"
                    onClick={() => {
                      groupSelectedLayers();
                      setContextMenu(null);
                    }}
                  >
                    <span>Group Selection</span>
                    <span className="text-[10px] text-text-tertiary font-mono">⌘G</span>
                  </button>
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-surface-hover flex items-center justify-between"
                    onClick={() => {
                      ungroupLayer(contextMenu.layerId);
                      setContextMenu(null);
                    }}
                  >
                    <span>Ungroup</span>
                    <span className="text-[10px] text-text-tertiary font-mono">⌘⇧G</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-surface-hover flex items-center justify-between"
                    onClick={() => {
                      moveSelectedLayersZOrder('bring-to-front');
                      setContextMenu(null);
                    }}
                  >
                    <span>Bring to Front</span>
                    <span className="text-[10px] text-text-tertiary font-mono">⌘⇧]</span>
                  </button>
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-surface-hover flex items-center justify-between"
                    onClick={() => {
                      moveSelectedLayersZOrder('send-to-back');
                      setContextMenu(null);
                    }}
                  >
                    <span>Send to Back</span>
                    <span className="text-[10px] text-text-tertiary font-mono">⌘⇧[</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-red-500/20 text-red-400 flex items-center justify-between"
                    onClick={() => {
                      removeSelectedLayers();
                      setContextMenu(null);
                    }}
                  >
                    <span>Delete Layer</span>
                    <span className="text-[10px] text-red-400 font-mono">Del</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Export Carousel Assets
            </h3>
            <div className="space-y-2">
              <button
                className="w-full py-2.5 bg-accent-blue hover:bg-blue-600 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2"
                onClick={() => handleExport('png')}
                disabled={!!exportingFormat}
              >
                <Download className="w-3.5 h-3.5" />
                {exportingFormat === 'png' ? 'Exporting PNGs...' : 'Download PNG Images (Zip)'}
              </button>
              <button
                className="w-full py-2.5 bg-surface-elevated hover:bg-surface-hover border border-border-default text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2"
                onClick={() => handleExport('pdf')}
                disabled={!!exportingFormat}
              >
                <Download className="w-3.5 h-3.5" />
                {exportingFormat === 'pdf' ? 'Generating PDF...' : 'Download PDF Document'}
              </button>
              <button
                className="w-full py-2.5 bg-surface-elevated hover:bg-surface-hover border border-border-default text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2"
                onClick={() => handleExport('zip')}
                disabled={!!exportingFormat}
              >
                <Download className="w-3.5 h-3.5" />
                {exportingFormat === 'zip' ? 'Packaging Bundle...' : 'Export Complete Project Zip'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
