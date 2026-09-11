import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  CarouselDocument, SlideSceneNode, LayerNode, TextLayerNode, ImageLayerNode, ImageSlotLayerNode,
  ShapeLayerNode, ShapeFill, AISettings, AssetRecord, CarouselTemplate, MasterLayoutNode
} from '../types/schema';
import {
  saveDocumentToIDB, getAllDocumentsFromIDB, deleteDocumentFromIDB, importLegacyLocalStorageToIDB,
  saveTemplateToIDB, getAllTemplatesFromIDB, deleteTemplateFromIDB
} from '../lib/idb';
import { autoSizeTextLayer } from '../lib/textEngine';


interface HistorySnapshot {
  document: CarouselDocument;
  activeSlideId: string | null;
  description: string;
}

export type EditorMode = 'select' | 'text-edit' | 'draw-shape' | 'crop-image' | 'pan' | 'template';
export type ActiveTool = 'select' | 'text' | 'image' | 'shape' | 'layout';

interface DrawingShapeState {
  shapeType: 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'line';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface CarouselState {
  // Navigation & Shell
  currentView: 'dashboard' | 'editor' | 'templates' | 'creative-director' | 'settings';
  
  // Document Collection & Active State
  documents: CarouselDocument[];
  activeDocumentId: string | null;
  activeSlideId: string | null;

  // Template System State
  templates: CarouselTemplate[];
  activeTemplateId: string | null;
  activeLayoutId: string | null;
  isTemplateEditorMode: boolean;
  templateDraft: CarouselTemplate | null;
  templateDirty: boolean;

  // Active State & Selection Hierarchy
  selectedLayerId: string | null;   // Primary selected layer ID
  selectedLayerIds: string[];      // Multi-select layer IDs (Canonical)
  expandedGroupIds: string[];       // UI state: expanded group nodes
  hoveredLayerId: string | null;     // UI state: hovered layer node
  editingLayerNameId: string | null; // UI state: inline renaming layer node
  editingTextId: string | null;      // UI state: text inline editing node
  editingTemplateId: string | null;
  clipboardLayers: LayerNode[];     // Internal clipboard for copy/paste
  clipboardSourceId: string | null; // Tracks source slide/layout ID to evaluate offset vs exact positioning
  
  // Tool State Machine
  editorMode: EditorMode;
  activeTool: ActiveTool;
  activeShapeType: 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'line';
  drawingShape: DrawingShapeState | null;

  // Assets Collection
  assets: AssetRecord[];

  // Canvas View Controls
  zoomMode: 'fit-slide' | 'fit-width' | '100%';
  zoomLevel: number;
  
  // History Stack (Reversible Command Undo/Redo)
  history: HistorySnapshot[];
  historyIndex: number;
  
  // Settings & Configuration
  settings: AISettings;

  // Derived Helpers
  getActiveSlide: () => SlideSceneNode | undefined;
  getActiveTemplate: () => CarouselTemplate | undefined;
  getActiveMasterLayout: () => MasterLayoutNode | undefined;

  // Actions & Navigation
  setView: (view: CarouselState['currentView']) => void;
  setEditorMode: (mode: EditorMode) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setActiveShapeType: (shapeType: 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'line') => void;
  setDrawingShape: (shape: DrawingShapeState | null) => void;

  loadDocumentsFromStorage: () => Promise<void>;
  openDocument: (id: string) => void;
  createDocument: (title: string, topic: string, slideCount: number, templateId: string) => Promise<string>;
  deleteDocument: (id: string) => Promise<void>;

  // Template System Actions
  loadTemplatesFromStorage: () => Promise<void>;
  createTemplate: (name: string, startFromType?: 'blank' | 'duplicate' | 'carousel', sourceId?: string) => Promise<string>;
  createTemplateFromCarousel: (documentId: string, name: string, selectedSlideIds?: string[], layerSlotOverrides?: Record<string, string>) => Promise<string>;
  saveCurrentSlideAsLayout: (slideId: string, templateId: string, layoutName: string, role: MasterLayoutNode['role'], layerSlotOverrides?: Record<string, string>) => Promise<string>;
  renameTemplate: (templateId: string, newName: string) => Promise<void>;
  duplicateTemplate: (templateId: string) => Promise<string>;
  deleteTemplate: (templateId: string) => Promise<void>;
  setDefaultTemplate: (templateId: string) => Promise<void>;
  setActiveTemplateId: (templateId: string) => void;
  setActiveLayoutId: (layoutId: string) => void;
  enterTemplateEditMode: (templateId: string, layoutId?: string) => void;
  exitTemplateEditMode: () => void;
  saveTemplateEdits: () => Promise<void>;
  applyTemplateToCarousel: (templateId: string, documentId?: string) => void;
  changeSlideLayout: (slideId: string, newLayoutId: string) => void;
  addMasterLayout: (templateId: string, role: MasterLayoutNode['role'], name?: string) => void;
  deleteMasterLayout: (templateId: string, layoutId: string) => void;
  reorderMasterLayouts: (templateId: string, fromIndex: number, toIndex: number) => void;
  isPreviewWithSampleContent: boolean;
  toggleSampleContentPreview: () => void;
  
  // Slide Mutators (Canonical Slide Operations)
  setActiveSlideId: (slideId: string) => void;
  addSlide: (layoutId?: string, segmentRole?: SlideSceneNode['segmentRole']) => void;
  duplicateSlide: (slideId: string) => void;
  deleteSlide: (slideId: string) => void;
  moveSlide: (slideId: string, fromIndex: number, toIndex: number) => void;
  updateSlideBg: (color: string) => void;

  // Selection Mutators
  setSelectedLayerId: (id: string | null) => void;
  setSelectedLayerIds: (ids: string[]) => void;
  toggleLayerSelection: (id: string, isMulti?: boolean, isRange?: boolean) => void;
  setExpandedGroupIds: (groupIds: string[]) => void;
  toggleGroupExpand: (groupId: string) => void;
  setHoveredLayerId: (id: string | null) => void;
  setEditingLayerNameId: (id: string | null) => void;
  setEditingTextId: (id: string | null) => void;

  // Layer & Grouping Mutators
  groupSelectedLayers: () => void;
  ungroupLayer: (groupId: string) => void;
  moveLayerNode: (layerId: string, targetParentId: string | null, targetIndex: number) => void;
  moveSelectedLayersZOrder: (direction: 'bring-to-front' | 'bring-forward' | 'send-backward' | 'send-to-back') => void;

  // Layer Content & Styling
  addTextLayer: (initialText?: string, x?: number, y?: number) => void;
  addImageLayerFromFile: (file: File) => Promise<void>;
  addImageLayerFromUrl: (url: string) => void;
  addImageSlotLayer: (
    semanticRole?: string,
    x?: number,
    y?: number,
    width?: number,
    height?: number
  ) => void;
  addShapeLayer: (
    shapeType?: 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'line',
    fill?: ShapeFill | string,
    x?: number,
    y?: number,
    width?: number,
    height?: number
  ) => void;
  updateLayerNode: (layerId: string, updates: Partial<LayerNode>) => void;
  updateShapeFill: (layerId: string, fill: ShapeFill | string) => void;
  updateShapeFillLive: (layerId: string, fill: ShapeFill | string) => void;
  commitShapeFillSnapshot: (description?: string) => void;

  // Visibility, Locking & Renaming
  toggleLayerVisibility: (layerId: string, solo?: boolean) => void;
  toggleLayerLock: (layerId: string) => void;
  renameLayer: (layerId: string, newName: string) => void;

  // Layer Creation, Duplication & Deletion
  duplicateSelectedLayers: () => void;
  removeLayerNode: (layerId: string) => void;
  removeSelectedLayers: () => void;
  reorderLayer: (layerId: string, direction: 'up' | 'down') => void;

  // Clipboard
  copySelectedLayers: () => void;
  pasteLayers: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;

  // Settings Actions
  setPerformancePreset: (preset: AISettings['preset']) => void;
  setApiKey: (provider: keyof AISettings['apiKeys'], key: string) => void;
}

const DEFAULT_DOC: CarouselDocument = {
  schemaVersion: '2.0',
  id: 'doc-initial',
  workspaceId: 'default-workspace',
  title: '5 SaaS Growth Hacks for 2026',
  topic: 'SaaS Growth & AI Automation',
  templateRef: { templateId: 'bbc', version: 1, overrides: {} },
  dimensions: { width: 1080, height: 1440, aspectRatio: '4:5' },
  slides: [
    {
      id: 's1',
      segmentRole: 'cover_hook',
      layoutId: 'cover_standard',
      backgroundColor: '#b80000',
      layers: [
        {
          id: 'l1',
          name: 'Headline',
          semanticRole: 'headline',
          type: 'text',
          role: 'headline',
          content: '5 SaaS Growth Hacks',
          x: 60,
          y: 800,
          width: 960,
          height: 180,
          rotation: 0,
          opacity: 1,
          isLocked: false,
          isVisible: true,
          zIndex: 0,
          fontFamily: 'Space Grotesk',
          fontSize: 54,
          fontWeight: '800',
          fontStyle: 'normal',
          lineHeight: 1.15,
          letterSpacing: 0,
          align: 'left',
          fill: '#FFFFFF',
          styleRuns: []
        },
        {
          id: 'l2',
          name: 'Body Copy',
          semanticRole: 'body',
          type: 'text',
          role: 'body',
          content: 'How modern tech companies scale revenue 10x using AI-driven automation pipelines.',
          x: 60,
          y: 1020,
          width: 960,
          height: 140,
          rotation: 0,
          opacity: 1,
          isLocked: false,
          isVisible: true,
          zIndex: 1,
          fontFamily: 'Inter',
          fontSize: 24,
          fontWeight: '400',
          fontStyle: 'normal',
          lineHeight: 1.3,
          letterSpacing: 0,
          align: 'left',
          fill: '#E2E8F0',
          styleRuns: []
        }
      ]
    }
  ],
  globalCreativeDirection: {
    globalRules: 'Keep visual composition clean and cinematic.',
    coverRules: 'Dopamine hook visual.',
    contentRules: 'Actionable step layout.',
    ctaRules: 'High contrast call to action.',
    enabled: true
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const SYSTEM_TEMPLATES: CarouselTemplate[] = [
  {
    id: 'tpl-explain-editorial',
    workspaceId: 'default-workspace',
    name: 'Editorial High Impact (Explain)',
    description: 'Dramatic full-bleed image layouts with bold uppercase typography, logo tag, and cyan highlights.',
    thumbnailAssetId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'System',
    isDefault: true,
    isSystemTemplate: true,
    isArchived: false,
    layouts: [
      {
        id: 'layout-exp-cover',
        templateId: 'tpl-explain-editorial',
        role: 'cover',
        name: 'Cover Layout',
        backgroundColor: '#0D0E12',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-exp-c-bg',
            name: 'Cover Image Slot',
            semanticRole: 'hero_image',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1080&auto=format&fit=crop',
            prompt: 'Full bleed editorial backdrop',
            status: 'ready',
            x: 0,
            y: 0,
            width: 1080,
            height: 1440,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            borderRadius: 0
          },
          {
            id: 'l-exp-c-overlay',
            name: 'Bottom Dark Gradient',
            type: 'shape',
            shapeType: 'rectangle',
            x: 0,
            y: 600,
            width: 1080,
            height: 840,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 1,
            fill: {
              type: 'linear-gradient',
              angle: 180,
              stops: [
                { id: '1', offset: 0, color: '#000000', opacity: 0 },
                { id: '2', offset: 0.4, color: '#000000', opacity: 0.8 },
                { id: '3', offset: 1, color: '#000000', opacity: 0.98 }
              ]
            }
          },
          {
            id: 'l-exp-c-logo',
            name: 'Brand Tag Logo',
            semanticRole: 'logo',
            type: 'text',
            role: 'body',
            content: '── explain ──',
            x: 60,
            y: 920,
            width: 960,
            height: 40,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 2,
            fontFamily: 'Inter',
            fontSize: 22,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 2,
            align: 'center',
            fill: '#FFFFFF',
            styleRuns: []
          },
          {
            id: 'l-exp-c-headline',
            name: 'Cover Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'YOU CAN PAY TO\nVANISH WITHOUT A TRACE\nIN JAPAN AND ITS LEGAL',
            x: 60,
            y: 980,
            width: 960,
            height: 380,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 3,
            fontFamily: 'Space Grotesk',
            fontSize: 54,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: -1,
            align: 'center',
            fill: '#FFFFFF',
            textCase: 'uppercase',
            textResizeMode: 'AUTO_HEIGHT',
            styleRuns: [
              { start: 15, end: 37, fill: '#26BFFF', fontWeight: '800' }
            ]
          }
        ]
      },
      {
        id: 'layout-exp-content',
        templateId: 'tpl-explain-editorial',
        role: 'content',
        name: 'Content Layout',
        backgroundColor: '#0D0E12',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-exp-v-bg',
            name: 'Content Image Slot',
            semanticRole: 'hero_image',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1080&auto=format&fit=crop',
            prompt: 'Editorial content backdrop',
            status: 'ready',
            x: 0,
            y: 0,
            width: 1080,
            height: 1440,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            borderRadius: 0
          },
          {
            id: 'l-exp-v-overlay',
            name: 'Bottom Dark Gradient',
            type: 'shape',
            shapeType: 'rectangle',
            x: 0,
            y: 700,
            width: 1080,
            height: 740,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 1,
            fill: {
              type: 'linear-gradient',
              angle: 180,
              stops: [
                { id: '1', offset: 0, color: '#000000', opacity: 0 },
                { id: '2', offset: 0.5, color: '#000000', opacity: 0.85 },
                { id: '3', offset: 1, color: '#000000', opacity: 0.98 }
              ]
            }
          },
          {
            id: 'l-exp-v-headline',
            name: 'Content Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'NIGHT MOVERS AT WORK',
            x: 60,
            y: 1020,
            width: 960,
            height: 80,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 2,
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: -1,
            align: 'center',
            fill: '#FFFFFF',
            textCase: 'uppercase',
            textResizeMode: 'AUTO_HEIGHT',
            styleRuns: []
          },
          {
            id: 'l-exp-v-sub',
            name: 'Body Copy',
            semanticRole: 'body',
            type: 'text',
            role: 'body',
            content: 'NIGHT MOVERS SECRETLY PACK YOUR LIFE.\nRELOCATE YOU OVERNIGHT WHILE PEOPLE SLEEP.',
            x: 60,
            y: 1110,
            width: 960,
            height: 120,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 3,
            fontFamily: 'Inter',
            fontSize: 22,
            fontWeight: '500',
            fontStyle: 'normal',
            lineHeight: 1.35,
            letterSpacing: 0,
            align: 'center',
            fill: '#CBD5E1',
            textCase: 'uppercase',
            textResizeMode: 'AUTO_HEIGHT',
            styleRuns: []
          },
          {
            id: 'l-exp-v-logo',
            name: 'Brand Tag Logo',
            semanticRole: 'logo',
            type: 'text',
            role: 'body',
            content: '── explain ──',
            x: 60,
            y: 1260,
            width: 960,
            height: 40,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 4,
            fontFamily: 'Inter',
            fontSize: 20,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 2,
            align: 'center',
            fill: '#FFFFFF',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-exp-cta',
        templateId: 'tpl-explain-editorial',
        role: 'cta',
        name: 'CTA Layout',
        backgroundColor: '#0D0E12',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-exp-cta-bg',
            name: 'CTA Image Slot',
            semanticRole: 'hero_image',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1080&auto=format&fit=crop',
            prompt: 'Airport luggage editorial backdrop',
            status: 'ready',
            x: 0,
            y: 0,
            width: 1080,
            height: 1440,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            borderRadius: 0
          },
          {
            id: 'l-exp-cta-overlay',
            name: 'Bottom Dark Gradient',
            type: 'shape',
            shapeType: 'rectangle',
            x: 0,
            y: 600,
            width: 1080,
            height: 840,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 1,
            fill: {
              type: 'linear-gradient',
              angle: 180,
              stops: [
                { id: '1', offset: 0, color: '#000000', opacity: 0 },
                { id: '2', offset: 0.4, color: '#000000', opacity: 0.8 },
                { id: '3', offset: 1, color: '#000000', opacity: 0.98 }
              ]
            }
          },
          {
            id: 'l-exp-cta-logo',
            name: 'Brand Tag Logo',
            semanticRole: 'logo',
            type: 'text',
            role: 'body',
            content: '── explain ──',
            x: 60,
            y: 900,
            width: 960,
            height: 40,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 2,
            fontFamily: 'Inter',
            fontSize: 22,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 2,
            align: 'center',
            fill: '#FFFFFF',
            styleRuns: []
          },
          {
            id: 'l-exp-cta-headline',
            name: 'CTA Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'YOU MAY NEVER SEE OUR\nPAGE AGAIN IF YOU DON\'T\nFOLLOW US',
            x: 60,
            y: 960,
            width: 960,
            height: 380,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 3,
            fontFamily: 'Space Grotesk',
            fontSize: 54,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: -1,
            align: 'center',
            fill: '#FFFFFF',
            textCase: 'uppercase',
            textResizeMode: 'AUTO_HEIGHT',
            styleRuns: [
              { start: 8, end: 13, fill: '#26BFFF', fontWeight: '800' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-minimalist',
    workspaceId: 'default-workspace',
    name: 'Modern Minimalist',
    description: 'Clean dark theme with high contrast typography and subtle blue accent rules.',
    thumbnailAssetId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'System',
    isDefault: false,
    isSystemTemplate: true,
    isArchived: false,
    layouts: [
      {
        id: 'layout-min-cover',
        templateId: 'tpl-minimalist',
        role: 'cover',
        name: 'Cover Slide',
        backgroundColor: '#0D0E12',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-min-c-tag',
            name: 'Accent Bar',
            type: 'shape',
            shapeType: 'rectangle',
            x: 60,
            y: 80,
            width: 120,
            height: 12,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fill: '#0A84FF',
            borderRadius: 6
          },
          {
            id: 'l-min-c-headline',
            name: 'Cover Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: '5 Figma Shortcuts That Saved Me 100+ Hours',
            x: 60,
            y: 800,
            width: 960,
            height: 220,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 56,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: -1,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          },
          {
            id: 'l-min-c-sub',
            name: 'Cover Subtitle',
            semanticRole: 'subtitle',
            type: 'text',
            role: 'body',
            content: 'Stop wasting time on manual pixel tweaking. Here is the automated workflow.',
            x: 60,
            y: 1040,
            width: 960,
            height: 120,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Inter',
            fontSize: 26,
            fontWeight: '400',
            fontStyle: 'normal',
            lineHeight: 1.3,
            letterSpacing: 0,
            align: 'left',
            fill: '#A0AEC0',
            styleRuns: []
          },
          {
            id: 'l-min-c-swipe',
            name: 'Swipe Cue',
            semanticRole: 'accent',
            type: 'text',
            role: 'body',
            content: 'SWIPE FOR FULL BREAKDOWN ➔',
            x: 60,
            y: 1320,
            width: 960,
            height: 40,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 18,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1,
            letterSpacing: 2,
            align: 'left',
            fill: '#0A84FF',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-min-content',
        templateId: 'tpl-minimalist',
        role: 'content',
        name: 'Content Slide',
        backgroundColor: '#0D0E12',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-min-v-num',
            name: 'Section Tag',
            semanticRole: 'accent',
            type: 'text',
            role: 'subtitle',
            content: '#01 TOOL',
            x: 60,
            y: 80,
            width: 300,
            height: 40,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 22,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1,
            letterSpacing: 2,
            align: 'left',
            fill: '#0A84FF',
            styleRuns: []
          },
          {
            id: 'l-min-v-head',
            name: 'Slide Title',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Auto Layout Spacing',
            x: 60,
            y: 140,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 44,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: -0.5,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          },
          {
            id: 'l-min-v-body',
            name: 'Body Copy',
            semanticRole: 'body',
            type: 'text',
            role: 'body',
            content: 'Use Shift+A to nest components instantly. Set auto-padding to 16px vertical for perfectly responsive carousels.',
            x: 60,
            y: 260,
            width: 960,
            height: 160,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Inter',
            fontSize: 28,
            fontWeight: '400',
            fontStyle: 'normal',
            lineHeight: 1.4,
            letterSpacing: 0,
            align: 'left',
            fill: '#CBD5E0',
            styleRuns: []
          },
          {
            id: 'l-min-v-box',
            name: 'Visual Component Box',
            semanticRole: 'hero_image',
            type: 'shape',
            shapeType: 'rounded-rectangle',
            x: 60,
            y: 460,
            width: 960,
            height: 860,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fill: '#171923',
            stroke: { enabled: true, color: '#2D3748', width: 2 },
            borderRadius: 20
          }
        ]
      },
      {
        id: 'layout-min-cta',
        templateId: 'tpl-minimalist',
        role: 'cta',
        name: 'CTA Slide',
        backgroundColor: '#0D0E12',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-min-cta-icon',
            name: 'Brand Badge',
            type: 'shape',
            shapeType: 'ellipse',
            x: 480,
            y: 400,
            width: 120,
            height: 120,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fill: '#0A84FF'
          },
          {
            id: 'l-min-cta-head',
            name: 'CTA Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Save This Post For Later',
            x: 60,
            y: 560,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: -0.5,
            align: 'center',
            fill: '#FFFFFF',
            styleRuns: []
          },
          {
            id: 'l-min-cta-body',
            name: 'CTA Subtitle',
            semanticRole: 'body',
            type: 'text',
            role: 'body',
            content: 'Follow @DaraApp for daily AI design systems and growth guides.',
            x: 140,
            y: 680,
            width: 800,
            height: 120,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Inter',
            fontSize: 26,
            fontWeight: '400',
            fontStyle: 'normal',
            lineHeight: 1.4,
            letterSpacing: 0,
            align: 'center',
            fill: '#A0AEC0',
            styleRuns: []
          },
          {
            id: 'l-min-cta-btn',
            name: 'Follow Button',
            semanticRole: 'cta',
            type: 'shape',
            shapeType: 'rounded-rectangle',
            x: 340,
            y: 840,
            width: 400,
            height: 80,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fill: '#0A84FF',
            borderRadius: 40
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-bbc',
    workspaceId: 'default-workspace',
    name: 'BBC News Style',
    description: 'Bold editorial crimson red aesthetic designed for high urgency & breaking news carousels.',
    thumbnailAssetId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'System',
    isDefault: false,
    isSystemTemplate: true,
    isArchived: false,
    layouts: [
      {
        id: 'layout-bbc-cover',
        templateId: 'tpl-bbc',
        role: 'cover',
        name: 'Cover Slide',
        backgroundColor: '#B80000',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-bbc-c-head',
            name: 'Cover Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'BREAKING: 5 SaaS Growth Hacks for 2026',
            x: 60,
            y: 750,
            width: 960,
            height: 240,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 54,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: -1,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          },
          {
            id: 'l-bbc-c-body',
            name: 'Cover Subtitle',
            semanticRole: 'body',
            type: 'text',
            role: 'body',
            content: 'How modern tech companies scale revenue 10x using AI automation.',
            x: 60,
            y: 1020,
            width: 960,
            height: 120,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: '400',
            fontStyle: 'normal',
            lineHeight: 1.3,
            letterSpacing: 0,
            align: 'left',
            fill: '#E2E8F0',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-bbc-content',
        templateId: 'tpl-bbc',
        role: 'content',
        name: 'Content Slide',
        backgroundColor: '#B80000',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-bbc-v-head',
            name: 'Slide Title',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Key Insight & Data Point',
            x: 60,
            y: 120,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 44,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          },
          {
            id: 'l-bbc-v-body',
            name: 'Body Copy',
            semanticRole: 'body',
            type: 'text',
            role: 'body',
            content: 'Editorial commentary explaining the tactical implementation steps.',
            x: 60,
            y: 240,
            width: 960,
            height: 160,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Inter',
            fontSize: 26,
            fontWeight: '400',
            fontStyle: 'normal',
            lineHeight: 1.4,
            letterSpacing: 0,
            align: 'left',
            fill: '#F7FAFC',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-bbc-cta',
        templateId: 'tpl-bbc',
        role: 'cta',
        name: 'CTA Slide',
        backgroundColor: '#B80000',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-bbc-cta-head',
            name: 'CTA Title',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Follow For Live Updates',
            x: 60,
            y: 600,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
            fill: '#FFFFFF',
            styleRuns: []
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-tech-dark',
    workspaceId: 'default-workspace',
    name: 'Tech Dark Mode',
    description: 'Sleek cyberpunk dark mode layout with glowing cyan & neon accents.',
    thumbnailAssetId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'System',
    isDefault: false,
    isSystemTemplate: true,
    isArchived: false,
    layouts: [
      {
        id: 'layout-tech-cover',
        templateId: 'tpl-tech-dark',
        role: 'cover',
        name: 'Cover Slide',
        backgroundColor: '#0A0B0E',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-tech-c-head',
            name: 'Cover Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Autonomous AI Pipelines for 2026',
            x: 60,
            y: 760,
            width: 960,
            height: 220,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 52,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: -1,
            align: 'left',
            fill: '#00F0FF',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-tech-content',
        templateId: 'tpl-tech-dark',
        role: 'content',
        name: 'Content Slide',
        backgroundColor: '#0A0B0E',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-tech-v-head',
            name: 'Slide Title',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Step 1: Agentic Orchestration',
            x: 60,
            y: 120,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 44,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-tech-cta',
        templateId: 'tpl-tech-dark',
        role: 'cta',
        name: 'CTA Slide',
        backgroundColor: '#0A0B0E',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-tech-cta-head',
            name: 'CTA Title',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Build AI Workflows Today',
            x: 60,
            y: 600,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
            fill: '#00F0FF',
            styleRuns: []
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-gradient-pastel',
    workspaceId: 'default-workspace',
    name: 'Gradient Pastel',
    description: 'Soft dark violet background with glowing pastel gradients for creative creators.',
    thumbnailAssetId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'System',
    isDefault: false,
    isSystemTemplate: true,
    isArchived: false,
    layouts: [
      {
        id: 'layout-pas-cover',
        templateId: 'tpl-gradient-pastel',
        role: 'cover',
        name: 'Cover Slide',
        backgroundColor: '#1A1625',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-pas-c-head',
            name: 'Cover Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Mastering Visual Storytelling',
            x: 60,
            y: 780,
            width: 960,
            height: 220,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 52,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: -1,
            align: 'left',
            fill: '#F472B6',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-pas-content',
        templateId: 'tpl-gradient-pastel',
        role: 'content',
        name: 'Content Slide',
        backgroundColor: '#1A1625',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-pas-v-head',
            name: 'Slide Title',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Aesthetic Color Harmony',
            x: 60,
            y: 120,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 44,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          }
        ]
      },
      {
        id: 'layout-pas-cta',
        templateId: 'tpl-gradient-pastel',
        role: 'cta',
        name: 'CTA Slide',
        backgroundColor: '#1A1625',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: 'l-pas-cta-head',
            name: 'CTA Title',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Join the Design Guild',
            x: 60,
            y: 600,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
            fill: '#F472B6',
            styleRuns: []
          }
        ]
      }
    ]
  }
];

export const useCarouselStore = create<CarouselState>()(
  immer((set, get) => ({
    currentView: 'dashboard',
    documents: [DEFAULT_DOC],
    activeDocumentId: 'doc-initial',
    activeSlideId: 's1',

    // Template System Initial State
    templates: SYSTEM_TEMPLATES,
    activeTemplateId: 'tpl-minimalist',
    activeLayoutId: 'layout-min-cover',
    isTemplateEditorMode: false,
    templateDraft: null,
    templateDirty: false,

    selectedLayerId: 'l1',
    selectedLayerIds: ['l1'],
    expandedGroupIds: [],
    hoveredLayerId: null,
    editingLayerNameId: null,
    editingTextId: null,
    editingTemplateId: null,
    clipboardLayers: [],
    clipboardSourceId: null,

    editorMode: 'select',
    activeTool: 'select',
    activeShapeType: 'rectangle',
    drawingShape: null,

    assets: [],
    zoomMode: 'fit-slide',
    zoomLevel: 1,
    history: [],
    historyIndex: -1,
    settings: {
      preset: 'balanced',
      apiKeys: {},
      routing: {
        copy: 'gpt-4o',
        prompt: 'claude-3-5-sonnet',
        image: 'nanobanana-2',
        upscale: 'gemini-1.5'
      }
    },

    getActiveSlide: () => {
      const state = get();
      if (state.isTemplateEditorMode) return undefined;
      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      if (!doc) return undefined;
      return doc.slides.find(s => s.id === state.activeSlideId) || doc.slides[0];
    },

    getActiveTemplate: () => {
      const state = get();
      return state.templates.find(t => t.id === state.activeTemplateId) || state.templates[0];
    },

    getActiveMasterLayout: () => {
      const state = get();
      const tpl = state.getActiveTemplate();
      if (!tpl) return undefined;
      return tpl.layouts.find(l => l.id === state.activeLayoutId) || tpl.layouts[0];
    },

    setView: (view) => set((state) => { state.currentView = view; }),
    setEditorMode: (mode) => set((state) => { state.editorMode = mode; }),
    setActiveTool: (tool) => set((state) => { state.activeTool = tool; }),
    setActiveShapeType: (shapeType) => set((state) => { state.activeShapeType = shapeType; }),
    setDrawingShape: (shape) => set((state) => { state.drawingShape = shape; }),



    // TEMPLATE ACTIONS IMPLEMENTATION
    loadTemplatesFromStorage: async () => {
      let storedTpls = await getAllTemplatesFromIDB();
      if (!storedTpls || storedTpls.length === 0) {
        for (const sysTpl of SYSTEM_TEMPLATES) {
          await saveTemplateToIDB(sysTpl);
        }
        storedTpls = SYSTEM_TEMPLATES;
      } else {
        for (const sysTpl of SYSTEM_TEMPLATES) {
          const exists = storedTpls.some(t => t.id === sysTpl.id);
          if (!exists) {
            await saveTemplateToIDB(sysTpl);
            storedTpls.unshift(sysTpl);
          }
        }
      }
      set((state) => {
        state.templates = storedTpls;
        const defaultTpl = storedTpls.find(t => t.id === 'tpl-explain-editorial') || storedTpls.find(t => t.isDefault) || storedTpls[0];
        if (defaultTpl) {
          state.activeTemplateId = defaultTpl.id;
          state.activeLayoutId = defaultTpl.layouts[0]?.id || null;
        }
      });
    },

    createTemplate: async (name, startFromType = 'blank', sourceId) => {
      const state = get();
      if (startFromType === 'carousel' && sourceId) {
        return await state.createTemplateFromCarousel(sourceId, name);
      }

      const templateId = `tpl-${Date.now()}`;
      let baseLayouts: MasterLayoutNode[] = [];

      if (startFromType === 'duplicate' && sourceId) {
        const source = state.templates.find(t => t.id === sourceId);
        if (source) {
          baseLayouts = JSON.parse(JSON.stringify(source.layouts)).map((l: MasterLayoutNode, idx: number) => ({
            ...l,
            id: `layout-${templateId}-${idx}`,
            templateId
          }));
        }
      }

      if (baseLayouts.length === 0) {
        baseLayouts = [
          {
            id: `layout-${templateId}-cover`,
            templateId,
            role: 'cover',
            name: 'Cover Slide',
            backgroundColor: '#0D0E12',
            canvas: { width: 1080, height: 1440 },
            layers: [
              {
                id: `l-${Date.now()}-c-head`,
                name: 'Headline',
                semanticRole: 'headline',
                type: 'text',
                role: 'headline',
                content: 'Your Headline Goes Here',
                x: 60,
                y: 800,
                width: 960,
                height: 200,
                rotation: 0,
                opacity: 1,
                isLocked: false,
                isVisible: true,
                zIndex: 0,
                fontFamily: 'Space Grotesk',
                fontSize: 54,
                fontWeight: '800',
                fontStyle: 'normal',
                lineHeight: 1.15,
                letterSpacing: -1,
                align: 'left',
                fill: '#FFFFFF',
                styleRuns: []
              }
            ]
          },
          {
            id: `layout-${templateId}-content`,
            templateId,
            role: 'content',
            name: 'Content Slide',
            backgroundColor: '#0D0E12',
            canvas: { width: 1080, height: 1440 },
            layers: [
              {
                id: `l-${Date.now()}-v-head`,
                name: 'Slide Title',
                semanticRole: 'headline',
                type: 'text',
                role: 'headline',
                content: 'Key Section Title',
                x: 60,
                y: 120,
                width: 960,
                height: 100,
                rotation: 0,
                opacity: 1,
                isLocked: false,
                isVisible: true,
                zIndex: 0,
                fontFamily: 'Space Grotesk',
                fontSize: 44,
                fontWeight: '700',
                fontStyle: 'normal',
                lineHeight: 1.2,
                letterSpacing: 0,
                align: 'left',
                fill: '#FFFFFF',
                styleRuns: []
              },
              {
                id: `l-${Date.now()}-v-body`,
                name: 'Body Copy',
                semanticRole: 'body',
                type: 'text',
                role: 'body',
                content: 'Supporting copy goes here explaining the details.',
                x: 60,
                y: 240,
                width: 960,
                height: 160,
                rotation: 0,
                opacity: 1,
                isLocked: false,
                isVisible: true,
                zIndex: 0,
                fontFamily: 'Inter',
                fontSize: 28,
                fontWeight: '400',
                fontStyle: 'normal',
                lineHeight: 1.4,
                letterSpacing: 0,
                align: 'left',
                fill: '#CBD5E0',
                styleRuns: []
              }
            ]
          },
          {
            id: `layout-${templateId}-cta`,
            templateId,
            role: 'cta',
            name: 'CTA Slide',
            backgroundColor: '#0D0E12',
            canvas: { width: 1080, height: 1440 },
            layers: [
              {
                id: `l-${Date.now()}-cta-head`,
                name: 'CTA Headline',
                semanticRole: 'headline',
                type: 'text',
                role: 'headline',
                content: 'Follow for More Insights',
                x: 60,
                y: 600,
                width: 960,
                height: 100,
                rotation: 0,
                opacity: 1,
                isLocked: false,
                isVisible: true,
                zIndex: 0,
                fontFamily: 'Space Grotesk',
                fontSize: 48,
                fontWeight: '800',
                fontStyle: 'normal',
                lineHeight: 1.2,
                letterSpacing: 0,
                align: 'center',
                fill: '#FFFFFF',
                styleRuns: []
              }
            ]
          }
        ];
      }

      const newTpl: CarouselTemplate = {
        id: templateId,
        workspaceId: 'default-workspace',
        name: name.trim() || 'Untitled Template',
        description: 'Custom user template',
        thumbnailAssetId: null,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'User',
        isDefault: state.templates.length === 0,
        isSystemTemplate: false,
        isArchived: false,
        layouts: baseLayouts
      };

      await saveTemplateToIDB(newTpl);
      set((draft) => {
        draft.templates.unshift(newTpl);
        draft.activeTemplateId = templateId;
        draft.activeLayoutId = baseLayouts[0]?.id || null;
      });
      return templateId;
    },

    renameTemplate: async (templateId, newName) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const state = get();
      const target = state.templates.find(t => t.id === templateId);
      if (!target) return;

      target.name = trimmed;
      target.updatedAt = new Date().toISOString();
      await saveTemplateToIDB(target);

      set((draft) => {
        const tpl = draft.templates.find(t => t.id === templateId);
        if (tpl) {
          tpl.name = trimmed;
          tpl.updatedAt = new Date().toISOString();
        }
      });
    },

    duplicateTemplate: async (templateId) => {
      const state = get();
      const source = state.templates.find(t => t.id === templateId);
      if (!source) return '';

      const newId = `tpl-${Date.now()}`;
      const clonedLayouts: MasterLayoutNode[] = JSON.parse(JSON.stringify(source.layouts)).map((l: MasterLayoutNode, idx: number) => ({
        ...l,
        id: `layout-${newId}-${idx}`,
        templateId: newId,
        layers: l.layers.map((lyr) => ({
          ...lyr,
          id: `l-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        }))
      }));

      const clonedTpl: CarouselTemplate = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} Copy`,
        isDefault: false,
        isSystemTemplate: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        layouts: clonedLayouts
      };

      await saveTemplateToIDB(clonedTpl);
      set((draft) => {
        draft.templates.unshift(clonedTpl);
        draft.activeTemplateId = newId;
        draft.activeLayoutId = clonedLayouts[0]?.id || null;
      });
      return newId;
    },

    deleteTemplate: async (templateId) => {
      const state = get();
      const target = state.templates.find(t => t.id === templateId);
      if (!target || target.isSystemTemplate) return;

      await deleteTemplateFromIDB(templateId);
      set((draft) => {
        draft.templates = draft.templates.filter(t => t.id !== templateId);
        if (draft.activeTemplateId === templateId) {
          const fallback = draft.templates[0];
          draft.activeTemplateId = fallback?.id || null;
          draft.activeLayoutId = fallback?.layouts[0]?.id || null;
        }
      });
    },

    setDefaultTemplate: async (templateId) => {
      const state = get();
      set((draft) => {
        draft.templates.forEach((t) => {
          t.isDefault = t.id === templateId;
        });
      });
      const updatedTpls = get().templates;
      for (const tpl of updatedTpls) {
        await saveTemplateToIDB(tpl);
      }
    },

    setActiveTemplateId: (templateId) => set((state) => {
      const tpl = state.templates.find(t => t.id === templateId);
      if (tpl) {
        state.activeTemplateId = templateId;
        state.activeLayoutId = tpl.layouts[0]?.id || null;
      }
    }),

    setActiveLayoutId: (layoutId) => set((state) => {
      state.activeLayoutId = layoutId;
    }),

    enterTemplateEditMode: (templateId, layoutId) => set((state) => {
      const tpl = state.templates.find(t => t.id === templateId);
      if (!tpl) return;

      state.activeTemplateId = templateId;
      state.activeLayoutId = layoutId || tpl.layouts[0]?.id || null;
      state.isTemplateEditorMode = true;
      state.editorMode = 'select';
      state.currentView = 'editor';
      state.templateDraft = JSON.parse(JSON.stringify(tpl));
      state.templateDirty = false;
    }),

    exitTemplateEditMode: () => set((state) => {
      state.isTemplateEditorMode = false;
      state.currentView = 'templates';
      state.templateDraft = null;
      state.templateDirty = false;
    }),

    saveTemplateEdits: async () => {
      const state = get();
      if (!state.activeTemplateId) return;

      const tpl = state.templates.find(t => t.id === state.activeTemplateId);
      if (!tpl) return;

      tpl.version = (tpl.version || 1) + 1;
      tpl.updatedAt = new Date().toISOString();

      await saveTemplateToIDB(tpl);
      set((draft) => {
        draft.templateDirty = false;
      });
    },

    applyTemplateToCarousel: (templateId, documentId) => set((state) => {
      const targetDoc = state.documents.find(d => d.id === (documentId || state.activeDocumentId));
      const tpl = state.templates.find(t => t.id === templateId);
      if (!targetDoc || !tpl) return;

      pushHistorySnapshot(get(), state, `APPLY_TEMPLATE_${tpl.name.toUpperCase()}`);

      targetDoc.templateRef = { templateId: tpl.id, version: tpl.version, overrides: {} };

      targetDoc.slides.forEach((slide) => {
        let layout: MasterLayoutNode | undefined;
        if (slide.segmentRole === 'cover_hook') {
          layout = tpl.layouts.find(l => l.role === 'cover');
        } else if (slide.segmentRole === 'cta') {
          layout = tpl.layouts.find(l => l.role === 'cta');
        } else {
          layout = tpl.layouts.find(l => l.role === 'content' || l.role === 'image_led' || l.role === 'statistic');
        }

        if (!layout) layout = tpl.layouts[0];
        if (!layout) return;

        slide.backgroundColor = layout.backgroundColor;
        if (layout.backgroundGradient) {
          slide.backgroundGradient = JSON.parse(JSON.stringify(layout.backgroundGradient));
        }

        const existingContentMap = new Map<string, any>();
        slide.layers.forEach((l) => {
          if (l.semanticRole) {
            existingContentMap.set(l.semanticRole, l);
          }
        });

        const newLayers: LayerNode[] = layout.layers.map((tLayer) => {
          const cloned: LayerNode = JSON.parse(JSON.stringify(tLayer));
          cloned.id = `l-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          if (cloned.semanticRole && existingContentMap.has(cloned.semanticRole)) {
            const orig = existingContentMap.get(cloned.semanticRole);
            if (cloned.type === 'text' && orig.type === 'text') {
              (cloned as TextLayerNode).content = orig.content;
            } else if (cloned.type === 'image' && orig.type === 'image') {
              (cloned as ImageLayerNode).url = orig.url;
              (cloned as ImageLayerNode).localPreviewUrl = orig.localPreviewUrl;
              (cloned as ImageLayerNode).assetId = orig.assetId;
            }
          }
          return cloned;
        });

        slide.layers = newLayers;
      });

      persistActiveDocument(targetDoc);
    }),

    addMasterLayout: (templateId, role = 'content', name) => set((state) => {
      const tpl = state.templates.find(t => t.id === templateId);
      if (!tpl) return;

      const newLayoutId = `layout-${templateId}-${Date.now()}`;
      const layoutName = name || `${role.charAt(0).toUpperCase() + role.slice(1).replace('_', '-')} Layout`;

      const newLayout: MasterLayoutNode = {
        id: newLayoutId,
        templateId,
        role,
        name: layoutName,
        backgroundColor: '#0D0E12',
        canvas: { width: 1080, height: 1440 },
        layers: [
          {
            id: `l-${Date.now()}-head`,
            name: 'Layout Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: 'Master Layout Title',
            x: 60,
            y: 120,
            width: 960,
            height: 100,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 44,
            fontWeight: '700',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          }
        ]
      };

      tpl.layouts.push(newLayout);
      state.activeLayoutId = newLayoutId;
      state.templateDirty = true;
    }),

    deleteMasterLayout: (templateId, layoutId) => set((state) => {
      const tpl = state.templates.find(t => t.id === templateId);
      if (!tpl || tpl.layouts.length <= 1) return;

      tpl.layouts = tpl.layouts.filter(l => l.id !== layoutId);
      if (state.activeLayoutId === layoutId) {
        state.activeLayoutId = tpl.layouts[0]?.id || null;
      }
      state.templateDirty = true;
    }),

    reorderMasterLayouts: (templateId, fromIndex, toIndex) => set((state) => {
      const tpl = state.templates.find(t => t.id === templateId);
      if (!tpl) return;

      if (fromIndex >= 0 && fromIndex < tpl.layouts.length && toIndex >= 0 && toIndex < tpl.layouts.length) {
        const [moved] = tpl.layouts.splice(fromIndex, 1);
        tpl.layouts.splice(toIndex, 0, moved);
        state.templateDirty = true;
      }
    }),

    createTemplateFromCarousel: async (documentId, name, selectedSlideIds, layerSlotOverrides) => {
      const state = get();
      const doc = state.documents.find(d => d.id === documentId) || state.documents.find(d => d.id === state.activeDocumentId);
      if (!doc) throw new Error('Document not found');

      const templateId = `tpl-${Date.now()}`;
      const targetSlides = selectedSlideIds && selectedSlideIds.length > 0
        ? doc.slides.filter(s => selectedSlideIds.includes(s.id))
        : doc.slides;

      const masterLayouts: MasterLayoutNode[] = targetSlides.map((slide, idx) => {
        const layoutId = `layout-${templateId}-${idx}`;
        const role: MasterLayoutNode['role'] = idx === 0 ? 'cover' : (idx === targetSlides.length - 1 ? 'cta' : 'content');
        const layoutName = idx === 0 ? 'Cover Slide' : (idx === targetSlides.length - 1 ? 'CTA Slide' : `Content Slide ${idx}`);

        const clonedLayers: LayerNode[] = slide.layers
          .filter(l => layerSlotOverrides?.[l.id] !== 'ignore')
          .map((layer) => {
            const l = JSON.parse(JSON.stringify(layer)) as LayerNode;
            const override = layerSlotOverrides?.[l.id];

            if (override && override !== 'static' && override !== 'ignore') {
              l.semanticRole = override as any;
            }

            if (l.type === 'text') {
              if (!l.semanticRole) {
                if (l.role === 'headline' || l.id.includes('head')) l.semanticRole = 'headline';
                else if (l.role === 'subtitle' || l.id.includes('sub')) l.semanticRole = 'subtitle';
                else if (l.role === 'body' || l.id.includes('body')) l.semanticRole = 'body';
                else if (l.role === 'cta' || l.id.includes('cta')) l.semanticRole = 'cta';
                else l.semanticRole = 'body';
              }
              if (l.semanticRole === 'headline') l.content = 'Master Layout Headline Placeholder';
              else if (l.semanticRole === 'subtitle') l.content = 'Master Layout Subtitle Copy';
              else if (l.semanticRole === 'body') l.content = 'Master Layout Body Copy Paragraph';
              else if (l.semanticRole === 'cta') l.content = 'ACTION TRIGGER ➔';
            } else if (l.type === 'image' && override !== 'static') {
              const imageSlot: ImageSlotLayerNode = {
                id: 'slot-' + l.id,
                name: l.name || 'Hero Image Slot',
                type: 'image-slot',
                semanticRole: l.semanticRole || 'hero_image',
                fit: 'cover',
                focalPoint: { x: 0.5, y: 0.5 },
                zoom: 100,
                pan: { x: 0, y: 0 },
                borderRadius: l.borderRadius || 0,
                x: l.x,
                y: l.y,
                width: l.width,
                height: l.height,
                rotation: l.rotation,
                opacity: l.opacity,
                isLocked: l.isLocked,
                isVisible: l.isVisible,
                zIndex: l.zIndex
              };
              return imageSlot;
            }
            return l;
          });

        return {
          id: layoutId,
          templateId,
          role,
          name: layoutName,
          backgroundColor: slide.backgroundColor,
          canvas: { width: 1080, height: 1440 },
          layers: clonedLayers
        };
      });

      const newTemplate: CarouselTemplate = {
        id: templateId,
        workspaceId: 'default-workspace',
        name: name.trim() || `${doc.title} Template`,
        description: `Created from carousel "${doc.title}"`,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'User',
        isDefault: false,
        isSystemTemplate: false,
        isArchived: false,
        layouts: masterLayouts
      };

      await saveTemplateToIDB(newTemplate);

      set((draft) => {
        draft.templates.unshift(newTemplate);
        draft.activeTemplateId = newTemplate.id;
        draft.activeLayoutId = newTemplate.layouts[0]?.id || null;
      });

      return templateId;
    },

    saveCurrentSlideAsLayout: async (slideId, templateId, layoutName, role, layerSlotOverrides) => {
      const state = get();
      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      const slide = doc?.slides.find(s => s.id === slideId);
      if (!slide) throw new Error('Slide not found');

      const targetTemplate = state.templates.find(t => t.id === templateId);
      if (!targetTemplate) throw new Error('Target template not found');

      const newLayoutId = `layout-${templateId}-${Date.now()}`;
      const clonedLayers: LayerNode[] = slide.layers
        .filter(l => layerSlotOverrides?.[l.id] !== 'ignore')
        .map((layer) => {
          const l = JSON.parse(JSON.stringify(layer)) as LayerNode;
          const override = layerSlotOverrides?.[l.id];

          if (override && override !== 'static' && override !== 'ignore') {
            l.semanticRole = override as any;
          }

          if (l.type === 'text') {
            const r = override || l.semanticRole || l.role;
            if (r === 'headline') l.content = 'Master Layout Headline Placeholder';
            else if (r === 'subtitle') l.content = 'Master Layout Subtitle Copy';
            else if (r === 'body') l.content = 'Master Layout Body Copy Paragraph';
            else if (r === 'cta') l.content = 'ACTION TRIGGER ➔';
          } else if (l.type === 'image' && override !== 'static') {
            const imageSlot: ImageSlotLayerNode = {
              id: 'slot-' + l.id,
              name: l.name || 'Hero Image Slot',
              type: 'image-slot',
              semanticRole: (override as any) || l.semanticRole || 'hero_image',
              fit: 'cover',
              focalPoint: { x: 0.5, y: 0.5 },
              zoom: 100,
              pan: { x: 0, y: 0 },
              borderRadius: l.borderRadius || 0,
              x: l.x,
              y: l.y,
              width: l.width,
              height: l.height,
              rotation: l.rotation,
              opacity: l.opacity,
              isLocked: l.isLocked,
              isVisible: l.isVisible,
              zIndex: l.zIndex
            };
            return imageSlot;
          }
          return l;
        });

      const newLayout: MasterLayoutNode = {
        id: newLayoutId,
        templateId,
        role: role || 'content',
        name: layoutName.trim() || 'Custom Layout',
        backgroundColor: slide.backgroundColor,
        canvas: { width: 1080, height: 1440 },
        layers: clonedLayers
      };

      set((draft) => {
        const tpl = draft.templates.find(t => t.id === templateId);
        if (tpl) {
          tpl.layouts.push(newLayout);
          tpl.updatedAt = new Date().toISOString();
          saveTemplateToIDB(JSON.parse(JSON.stringify(tpl))).catch(console.error);
        }
      });

      return newLayoutId;
    },

    changeSlideLayout: (slideId, newLayoutId) => set((state) => {
      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      if (!doc) return;

      const slide = doc.slides.find(s => s.id === slideId);
      if (!slide) return;

      let targetLayout: MasterLayoutNode | undefined;
      for (const tpl of state.templates) {
        targetLayout = tpl.layouts.find(l => l.id === newLayoutId);
        if (targetLayout) break;
      }
      if (!targetLayout) return;

      pushHistorySnapshot(get(), state, 'CHANGE_SLIDE_LAYOUT');

      slide.layoutId = newLayoutId;
      slide.backgroundColor = targetLayout.backgroundColor;

      const oldLayers = slide.layers;
      const newLayers: LayerNode[] = JSON.parse(JSON.stringify(targetLayout.layers));

      newLayers.forEach((newLayer) => {
        if (newLayer.semanticRole) {
          const oldMatch = oldLayers.find(l => l.semanticRole === newLayer.semanticRole || (l.type === newLayer.type && (l as any).role === (newLayer as any).role));
          if (oldMatch) {
            if (newLayer.type === 'text' && oldMatch.type === 'text') {
              newLayer.content = oldMatch.content;
            } else if ((newLayer.type === 'image' || newLayer.type === 'image-slot') && oldMatch.type === 'image') {
              (newLayer as any).url = oldMatch.url;
            }
          }
        }
      });

      slide.layers = newLayers;
      persistActiveDocument(doc);
    }),

    addImageSlotLayer: (semanticRole = 'hero_image', x = 60, y = 200, width = 960, height = 720) => set((state) => {
      if (state.isTemplateEditorMode && state.activeTemplateId && state.activeLayoutId) {
        const tpl = state.templates.find(t => t.id === state.activeTemplateId);
        const layout = tpl?.layouts.find(l => l.id === state.activeLayoutId);
        if (layout) {
          const slotNode: ImageSlotLayerNode = {
            id: 'slot-' + Date.now(),
            name: 'Hero Image Slot',
            type: 'image-slot',
            semanticRole: (semanticRole as any) || 'hero_image',
            fit: 'cover',
            focalPoint: { x: 0.5, y: 0.5 },
            zoom: 100,
            pan: { x: 0, y: 0 },
            borderRadius: 16,
            x,
            y,
            width,
            height,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0
          };
          layout.layers.unshift(slotNode);
          state.templateDirty = true;
          if (tpl) saveTemplateToIDB(tpl).catch(console.error);
        }
        return;
      }

      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      const slide = doc?.slides.find(s => s.id === state.activeSlideId);
      if (slide) {
        pushHistorySnapshot(get(), state, 'ADD_IMAGE_SLOT');
        const slotNode: ImageSlotLayerNode = {
          id: 'slot-' + Date.now(),
          name: 'Hero Image Slot',
          type: 'image-slot',
          semanticRole: (semanticRole as any) || 'hero_image',
          fit: 'cover',
          focalPoint: { x: 0.5, y: 0.5 },
          zoom: 100,
          pan: { x: 0, y: 0 },
          borderRadius: 16,
          x,
          y,
          width,
          height,
          rotation: 0,
          opacity: 1,
          isLocked: false,
          isVisible: true,
          zIndex: 0
        };
        slide.layers.unshift(slotNode);
        state.selectedLayerId = slotNode.id;
        state.selectedLayerIds = [slotNode.id];
        persistActiveDocument(doc);
      }
    }),

    isPreviewWithSampleContent: false,
    toggleSampleContentPreview: () => set((state) => {
      state.isPreviewWithSampleContent = !state.isPreviewWithSampleContent;
    }),

    loadDocumentsFromStorage: async () => {
      await importLegacyLocalStorageToIDB();
      let storedDocs = await getAllDocumentsFromIDB();
      if (!storedDocs || storedDocs.length === 0) {
        await saveDocumentToIDB(DEFAULT_DOC);
        storedDocs = [DEFAULT_DOC];
      }
      set((state) => {
        state.documents = storedDocs;
        if (!state.activeDocumentId || !storedDocs.find(d => d.id === state.activeDocumentId)) {
          state.activeDocumentId = storedDocs[0].id;
          state.activeSlideId = storedDocs[0].slides[0]?.id || null;
        }
      });
    },

    openDocument: (id) => set((state) => {
      const doc = state.documents.find(d => d.id === id);
      state.activeDocumentId = id;
      state.activeSlideId = doc?.slides[0]?.id || null;
      state.selectedLayerId = null;
      state.editingTextId = null;
      state.editorMode = 'select';
      state.currentView = 'editor';
      state.history = [];
      state.historyIndex = -1;
    }),

    createDocument: async (title, topic, slideCount, templateId) => {
      const state = get();
      const selectedTpl = state.templates.find(t => t.id === templateId) || state.templates.find(t => t.isDefault) || state.templates[0];
      const newDocId = `doc-${Date.now()}`;

      const slides: SlideSceneNode[] = Array.from({ length: slideCount }, (_, idx) => {
        const slideId = `s-${Date.now()}-${idx}`;
        const segmentRole: SlideSceneNode['segmentRole'] = idx === 0 ? 'cover_hook' : (idx === slideCount - 1 ? 'cta' : 'value');

        let layout: MasterLayoutNode | undefined;
        if (selectedTpl) {
          if (segmentRole === 'cover_hook') layout = selectedTpl.layouts.find(l => l.role === 'cover');
          else if (segmentRole === 'cta') layout = selectedTpl.layouts.find(l => l.role === 'cta');
          else layout = selectedTpl.layouts.find(l => l.role === 'content' || l.role === 'image_led');
          if (!layout) layout = selectedTpl.layouts[0];
        }

        const layers: LayerNode[] = layout ? layout.layers.map((tLyr) => {
          const cloned: LayerNode = JSON.parse(JSON.stringify(tLyr));
          cloned.id = `l-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
          if (cloned.semanticRole === 'headline' && cloned.type === 'text') {
            (cloned as TextLayerNode).content = idx === 0 ? (title || 'Untitled Carousel') : `Key Takeaway #${idx}`;
          } else if (cloned.semanticRole === 'subtitle' && cloned.type === 'text' && idx === 0 && topic) {
            (cloned as TextLayerNode).content = topic;
          }
          return cloned;
        }) : [
          {
            id: `l-${Date.now()}-${idx}-1`,
            name: idx === 0 ? 'Headline' : `Section #${idx}`,
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: idx === 0 ? (title || 'Untitled Carousel') : `Key Takeaway #${idx}`,
            x: 60,
            y: idx === 0 ? 800 : 200,
            width: 960,
            height: 180,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: 0,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          }
        ];

        return {
          id: slideId,
          segmentRole,
          layoutId: layout?.id || (idx === 0 ? 'cover_standard' : (idx === slideCount - 1 ? 'cta_standard' : 'content_standard')),
          backgroundColor: layout?.backgroundColor || (templateId === 'bbc' ? '#b80000' : '#0D0E12'),
          backgroundGradient: layout?.backgroundGradient ? JSON.parse(JSON.stringify(layout.backgroundGradient)) : undefined,
          layers
        };
      });

      const newDoc: CarouselDocument = {
        schemaVersion: '2.0',
        id: newDocId,
        workspaceId: 'default-workspace',
        title: title || 'Untitled Carousel',
        topic,
        templateRef: { templateId, version: 1, overrides: {} },
        dimensions: { width: 1080, height: 1440, aspectRatio: '4:5' },
        slides,
        globalCreativeDirection: {
          globalRules: 'Clean brand guidelines',
          coverRules: 'Hook focus',
          contentRules: 'Insight focus',
          ctaRules: 'Conversion focus',
          enabled: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveDocumentToIDB(newDoc);

      set((state) => {
        state.documents.unshift(newDoc);
        state.activeDocumentId = newDoc.id;
        state.activeSlideId = newDoc.slides[0]?.id || null;
        state.selectedLayerId = null;
        state.editingTextId = null;
        state.currentView = 'editor';
      });

      return newDoc.id;
    },

    deleteDocument: async (id) => {
      await deleteDocumentFromIDB(id);
      set((state) => {
        state.documents = state.documents.filter(d => d.id !== id);
        if (state.activeDocumentId === id) {
          state.activeDocumentId = state.documents[0]?.id || null;
          state.activeSlideId = state.documents[0]?.slides[0]?.id || null;
          state.currentView = 'dashboard';
        }
      });
    },

    // SLIDE MUTATORS
    setActiveSlideId: (slideId) => set((state) => {
      state.activeSlideId = slideId;
      state.selectedLayerId = null;
      state.editingTextId = null;
      state.editorMode = 'select';
    }),

    addSlide: (layoutId = 'content_standard', segmentRole = 'value') => set((state) => {
      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      if (!doc) return;

      pushHistorySnapshot(get(), state, 'ADD_SLIDE');

      const currentIdx = doc.slides.findIndex(s => s.id === state.activeSlideId);
      const insertIndex = currentIdx >= 0 ? currentIdx + 1 : doc.slides.length;
      const newSlideId = `s-${Date.now()}`;

      const newSlide: SlideSceneNode = {
        id: newSlideId,
        segmentRole,
        layoutId,
        backgroundColor: doc.templateRef.templateId === 'bbc' ? '#b80000' : '#121215',
        layers: [
          {
            id: `l-${Date.now()}-1`,
            name: 'Slide Headline',
            semanticRole: 'headline',
            type: 'text',
            role: 'headline',
            content: layoutId === 'cta_standard' ? 'Follow & Save For Later' : 'Key Insight',
            x: 60,
            y: 200,
            width: 960,
            height: 140,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            fontFamily: 'Space Grotesk',
            fontSize: 48,
            fontWeight: '800',
            fontStyle: 'normal',
            lineHeight: 1.15,
            letterSpacing: 0,
            align: 'left',
            fill: '#FFFFFF',
            styleRuns: []
          }
        ]
      };

      doc.slides.splice(insertIndex, 0, newSlide);
      state.activeSlideId = newSlideId;
      state.selectedLayerId = null;
      state.editingTextId = null;
      persistActiveDocument(doc);
    }),

    duplicateSlide: (slideId) => set((state) => {
      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      if (!doc) return;

      const sourceIdx = doc.slides.findIndex(s => s.id === slideId);
      if (sourceIdx === -1) return;

      pushHistorySnapshot(get(), state, 'DUPLICATE_SLIDE');

      const sourceSlide = doc.slides[sourceIdx];
      const newSlideId = `s-${Date.now()}`;
      
      // Deep clone slide and generate unique IDs for all layers
      const clonedSlide: SlideSceneNode = {
        ...JSON.parse(JSON.stringify(sourceSlide)),
        id: newSlideId,
        layers: sourceSlide.layers.map((layer, lIdx) => ({
          ...JSON.parse(JSON.stringify(layer)),
          id: `l-${Date.now()}-${lIdx}`
        }))
      };

      doc.slides.splice(sourceIdx + 1, 0, clonedSlide);
      state.activeSlideId = newSlideId;
      state.selectedLayerId = null;
      state.editingTextId = null;
      persistActiveDocument(doc);
    }),

    deleteSlide: (slideId) => set((state) => {
      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      if (!doc || doc.slides.length <= 1) return; // Disallow deleting the last remaining slide

      const targetIdx = doc.slides.findIndex(s => s.id === slideId);
      if (targetIdx === -1) return;

      pushHistorySnapshot(get(), state, 'DELETE_SLIDE');

      // Determine next active slide before deletion
      let nextActiveId = state.activeSlideId;
      if (state.activeSlideId === slideId) {
        if (targetIdx < doc.slides.length - 1) {
          nextActiveId = doc.slides[targetIdx + 1].id;
        } else {
          nextActiveId = doc.slides[targetIdx - 1].id;
        }
      }

      doc.slides.splice(targetIdx, 1);
      state.activeSlideId = nextActiveId;
      state.selectedLayerId = null;
      state.editingTextId = null;
      persistActiveDocument(doc);
    }),

    moveSlide: (slideId, fromIndex, toIndex) => set((state) => {
      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      if (!doc) return;
      if (fromIndex < 0 || fromIndex >= doc.slides.length || toIndex < 0 || toIndex >= doc.slides.length) return;

      pushHistorySnapshot(get(), state, 'MOVE_SLIDE');

      const [moved] = doc.slides.splice(fromIndex, 1);
      doc.slides.splice(toIndex, 0, moved);
      // activeSlideId remains unchanged! Stable identity maintained.
      persistActiveDocument(doc);
    }),

    updateSlideBg: (color) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (container) {
        pushHistorySnapshot(get(), state, 'UPDATE_SLIDE_BG');
        container.backgroundColor = color;
        save();
      }
    }),

    // SELECTION MUTATORS
    setSelectedLayerId: (id) => set((state) => {
      state.selectedLayerId = id;
      state.selectedLayerIds = id ? [id] : [];
      if (id !== state.editingTextId) state.editingTextId = null;
    }),

    setSelectedLayerIds: (ids) => set((state) => {
      state.selectedLayerIds = ids;
      state.selectedLayerId = ids[ids.length - 1] || null;
      if (!ids.includes(state.editingTextId || '')) state.editingTextId = null;
    }),

    toggleLayerSelection: (id, isMulti = false, isRange = false) => set((state) => {
      if (isMulti) {
        if (state.selectedLayerIds.includes(id)) {
          state.selectedLayerIds = state.selectedLayerIds.filter((lId) => lId !== id);
          state.selectedLayerId = state.selectedLayerIds[state.selectedLayerIds.length - 1] || null;
        } else {
          state.selectedLayerIds.push(id);
          state.selectedLayerId = id;
        }
      } else {
        state.selectedLayerIds = [id];
        state.selectedLayerId = id;
      }
    }),

    setExpandedGroupIds: (groupIds) => set((state) => {
      state.expandedGroupIds = groupIds;
    }),

    toggleGroupExpand: (groupId) => set((state) => {
      if (state.expandedGroupIds.includes(groupId)) {
        state.expandedGroupIds = state.expandedGroupIds.filter((gId) => gId !== groupId);
      } else {
        state.expandedGroupIds.push(groupId);
      }
    }),

    setHoveredLayerId: (id) => set((state) => {
      state.hoveredLayerId = id;
    }),

    setEditingLayerNameId: (id) => set((state) => {
      state.editingLayerNameId = id;
    }),

    setEditingTextId: (id) => set((state) => {
      state.editingTextId = id;
      if (id) {
        state.selectedLayerId = id;
        if (!state.selectedLayerIds.includes(id)) state.selectedLayerIds = [id];
        state.editorMode = 'text-edit';
      } else {
        state.editorMode = 'select';
      }
    }),

    // GROUPING OPERATIONS
    groupSelectedLayers: () => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container || state.selectedLayerIds.length < 1) return;

      pushHistorySnapshot(get(), state, 'GROUP_LAYERS');

      const targetIndices: number[] = [];
      const targets: LayerNode[] = [];
      container.layers.forEach((l, idx) => {
        if (state.selectedLayerIds.includes(l.id)) {
          targets.push(l);
          targetIndices.push(idx);
        }
      });
      if (targets.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      targets.forEach((l) => {
        const parentObj = l.parentId ? container.layers.find((p) => p.id === l.parentId) : null;
        const worldX = parentObj ? parentObj.x + l.x : l.x;
        const worldY = parentObj ? parentObj.y + l.y : l.y;
        minX = Math.min(minX, worldX);
        minY = Math.min(minY, worldY);
        maxX = Math.max(maxX, worldX + l.width);
        maxY = Math.max(maxY, worldY + l.height);
      });

      if (!isFinite(minX)) minX = 100;
      if (!isFinite(minY)) minY = 100;

      const groupId = `group-${Date.now()}`;
      const groupWidth = Math.max(40, maxX - minX);
      const groupHeight = Math.max(40, maxY - minY);
      const childIds = targets.map((l) => l.id);

      targets.forEach((l) => {
        const parentObj = l.parentId ? container.layers.find((p) => p.id === l.parentId) : null;
        const worldX = parentObj ? parentObj.x + l.x : l.x;
        const worldY = parentObj ? parentObj.y + l.y : l.y;
        l.parentId = groupId;
        l.x = worldX - minX;
        l.y = worldY - minY;
      });

      const newGroup: any = {
        id: groupId,
        name: `Group ${container.layers.filter((l) => l.type === 'group').length + 1}`,
        type: 'group',
        x: minX,
        y: minY,
        width: groupWidth,
        height: groupHeight,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isVisible: true,
        zIndex: 0,
        childIds,
        parentId: null
      };

      const topMostSelectedIdx = targetIndices[0];
      container.layers.splice(topMostSelectedIdx, 0, newGroup);

      state.selectedLayerIds = [groupId];
      state.selectedLayerId = groupId;
      if (!state.expandedGroupIds.includes(groupId)) {
        state.expandedGroupIds.push(groupId);
      }
      save();
    }),

    ungroupLayer: (groupId) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container) return;

      const groupIdx = container.layers.findIndex((l) => l.id === groupId);
      if (groupIdx === -1) return;

      const groupNode = container.layers[groupIdx] as any;
      if (groupNode.type !== 'group') return;

      pushHistorySnapshot(get(), state, 'UNGROUP_LAYER');

      const childIds: string[] = groupNode.childIds || [];

      container.layers.forEach((l) => {
        if (l.parentId === groupId || childIds.includes(l.id)) {
          l.parentId = groupNode.parentId || null;
          l.x = l.x + groupNode.x;
          l.y = l.y + groupNode.y;
        }
      });

      container.layers.splice(groupIdx, 1);
      state.selectedLayerIds = childIds;
      state.selectedLayerId = childIds[0] || null;
      save();
    }),

    moveLayerNode: (layerId, targetParentId, targetIndex) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container) return;

      const layer = container.layers.find((l) => l.id === layerId);
      if (!layer) return;

      if (layer.type === 'group' && targetParentId) {
        let checkId: string | null | undefined = targetParentId;
        while (checkId) {
          if (checkId === layerId) return;
          const parentObj = container.layers.find((p) => p.id === checkId);
          checkId = parentObj?.parentId;
        }
      }

      pushHistorySnapshot(get(), state, 'MOVE_LAYER');

      const currentParent = container.layers.find((p) => p.id === layer.parentId);
      const targetParent = container.layers.find((p) => p.id === targetParentId);

      const currentWorldX = currentParent ? currentParent.x + layer.x : layer.x;
      const currentWorldY = currentParent ? currentParent.y + layer.y : layer.y;

      const newLocalX = targetParent ? currentWorldX - targetParent.x : currentWorldX;
      const newLocalY = targetParent ? currentWorldY - targetParent.y : currentWorldY;

      const oldParentId = layer.parentId;
      layer.parentId = targetParentId;
      layer.x = newLocalX;
      layer.y = newLocalY;

      if (oldParentId) {
        const oldParent = container.layers.find((p) => p.id === oldParentId) as any;
        if (oldParent && oldParent.childIds) {
          oldParent.childIds = oldParent.childIds.filter((cId: string) => cId !== layerId);
        }
      }

      if (targetParentId) {
        const newParent = container.layers.find((p) => p.id === targetParentId) as any;
        if (newParent) {
          if (!newParent.childIds) newParent.childIds = [];
          if (!newParent.childIds.includes(layerId)) {
            newParent.childIds.splice(Math.max(0, targetIndex), 0, layerId);
          }
        }
      }

      const fromIdx = container.layers.findIndex((l) => l.id === layerId);
      if (fromIdx !== -1) {
        const [moved] = container.layers.splice(fromIdx, 1);
        const clampedIndex = Math.max(0, Math.min(container.layers.length, targetIndex));
        container.layers.splice(clampedIndex, 0, moved);
      }

      save();
    }),

    moveSelectedLayersZOrder: (direction) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container || state.selectedLayerIds.length === 0) return;

      pushHistorySnapshot(get(), state, `ZORDER_${direction.toUpperCase()}`);

      const targetId = state.selectedLayerIds[0];
      const idx = container.layers.findIndex((l) => l.id === targetId);
      if (idx === -1) return;

      const [moved] = container.layers.splice(idx, 1);
      if (direction === 'bring-to-front') {
        container.layers.unshift(moved);
      } else if (direction === 'send-to-back') {
        container.layers.push(moved);
      } else if (direction === 'bring-forward') {
        const targetIdx = Math.max(0, idx - 1);
        container.layers.splice(targetIdx, 0, moved);
      } else if (direction === 'send-backward') {
        const targetIdx = Math.min(container.layers.length, idx + 1);
        container.layers.splice(targetIdx, 0, moved);
      }

      save();
    }),

    toggleLayerVisibility: (layerId, solo = false) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container) return;

      const target = container.layers.find((l) => l.id === layerId);
      if (!target) return;

      pushHistorySnapshot(get(), state, 'TOGGLE_VISIBILITY');

      if (solo) {
        const otherVisible = container.layers.some((l) => l.id !== layerId && l.isVisible);
        container.layers.forEach((l) => {
          l.isVisible = l.id === layerId ? true : !otherVisible;
        });
      } else {
        target.isVisible = !target.isVisible;
      }
      save();
    }),

    toggleLayerLock: (layerId) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      const target = container?.layers.find((l) => l.id === layerId);
      if (target) {
        pushHistorySnapshot(get(), state, 'TOGGLE_LOCK');
        target.isLocked = !target.isLocked;
        save();
      }
    }),

    renameLayer: (layerId, newName) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      const target = container?.layers.find((l) => l.id === layerId);
      if (target && newName.trim()) {
        pushHistorySnapshot(get(), state, 'RENAME_LAYER');
        target.name = newName.trim();
        save();
      }
      state.editingLayerNameId = null;
    }),

    duplicateSelectedLayers: () => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container || state.selectedLayerIds.length === 0) return;

      pushHistorySnapshot(get(), state, 'DUPLICATE_LAYERS');

      const clonedIds: string[] = [];
      state.selectedLayerIds.forEach((lId) => {
        const targetIdx = container.layers.findIndex((l) => l.id === lId);
        if (targetIdx === -1) return;

        const target = container.layers[targetIdx];
        const newId = `l-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const cloned: LayerNode = {
          ...JSON.parse(JSON.stringify(target)),
          id: newId,
          name: `${target.name} Copy`,
          x: target.x + 20,
          y: target.y + 20
        };
        container.layers.splice(targetIdx, 0, cloned);
        clonedIds.push(newId);
      });

      state.selectedLayerIds = clonedIds;
      state.selectedLayerId = clonedIds[0] || null;
      save();
    }),

    removeSelectedLayers: () => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container || state.selectedLayerIds.length === 0) return;

      pushHistorySnapshot(get(), state, 'DELETE_LAYERS');

      container.layers = container.layers.filter((l) => !state.selectedLayerIds.includes(l.id));
      state.selectedLayerIds = [];
      state.selectedLayerId = null;
      state.editingTextId = null;
      save();
    }),


    copySelectedLayers: () => set((state) => {
      if (state.isTemplateEditorMode) {
        const tpl = state.templates.find((t) => t.id === state.activeTemplateId);
        const layout = tpl?.layouts.find((l) => l.id === state.activeLayoutId);
        if (!layout) return;
        const selected = layout.layers.filter((l) => state.selectedLayerIds.includes(l.id));
        state.clipboardLayers = JSON.parse(JSON.stringify(selected));
        state.clipboardSourceId = layout.id;
      } else {
        const doc = state.documents.find((d) => d.id === state.activeDocumentId);
        const slide = doc?.slides.find((s) => s.id === state.activeSlideId);
        if (!slide) return;
        const selected = slide.layers.filter((l) => state.selectedLayerIds.includes(l.id));
        state.clipboardLayers = JSON.parse(JSON.stringify(selected));
        state.clipboardSourceId = slide.id;
      }
    }),

    pasteLayers: () => set((state) => {
      if (state.clipboardLayers.length === 0) return;

      if (state.isTemplateEditorMode) {
        const tpl = state.templates.find((t) => t.id === state.activeTemplateId);
        const layout = tpl?.layouts.find((l) => l.id === state.activeLayoutId);
        if (!layout) return;

        pushHistorySnapshot(get(), state, 'PASTE_LAYERS');

        const isSameTarget = state.clipboardSourceId === layout.id;
        const offset = isSameTarget ? 24 : 0;
        const pastedIds: string[] = [];

        state.clipboardLayers.forEach((copied, idx) => {
          const newId = `l-copy-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
          const pasted: LayerNode = {
            ...JSON.parse(JSON.stringify(copied)),
            id: newId,
            x: copied.x + offset,
            y: copied.y + offset
          };
          layout.layers.unshift(pasted);
          if (!layout.rootLayerIds) layout.rootLayerIds = layout.layers.map((l) => l.id);
          layout.rootLayerIds.unshift(newId);
          pastedIds.push(newId);
        });

        state.selectedLayerIds = pastedIds;
        state.selectedLayerId = pastedIds[0] || null;
        saveTemplateToIDB(tpl!);
      } else {
        const doc = state.documents.find((d) => d.id === state.activeDocumentId);
        const slide = doc?.slides.find((s) => s.id === state.activeSlideId);
        if (!slide) return;

        pushHistorySnapshot(get(), state, 'PASTE_LAYERS');

        const isSameTarget = state.clipboardSourceId === slide.id;
        const offset = isSameTarget ? 24 : 0;
        const pastedIds: string[] = [];

        state.clipboardLayers.forEach((copied, idx) => {
          const newId = `l-copy-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
          const pasted: LayerNode = {
            ...JSON.parse(JSON.stringify(copied)),
            id: newId,
            x: copied.x + offset,
            y: copied.y + offset
          };
          slide.layers.unshift(pasted);
          if (!slide.rootLayerIds) slide.rootLayerIds = slide.layers.map((l) => l.id);
          slide.rootLayerIds.unshift(newId);
          pastedIds.push(newId);
        });

        state.selectedLayerIds = pastedIds;
        state.selectedLayerId = pastedIds[0] || null;
        persistActiveDocument(doc);
      }
    }),

    addTextLayer: (initialText = 'Type something', x, y) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container) return;

      pushHistorySnapshot(get(), state, 'ADD_TEXT');

      const layerWidth = 600;
      const layerHeight = 100;
      const posX = x !== undefined ? x : Math.round((1080 - layerWidth) / 2);
      const posY = y !== undefined ? y : Math.round((1440 - layerHeight) / 2);
      const newLayerId = `l-${Date.now()}`;

      const newLayer: TextLayerNode = {
        id: newLayerId,
        name: 'Custom Text',
        semanticRole: 'custom_text',
        type: 'text',
        role: 'body',
        content: initialText,
        x: posX,
        y: posY,
        width: layerWidth,
        height: layerHeight,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isVisible: true,
        zIndex: 0,
        fontFamily: 'Space Grotesk',
        fontSize: 48,
        fontWeight: '700',
        fontStyle: 'normal',
        lineHeight: 1.2,
        letterSpacing: 0,
        align: 'left',
        fill: '#FFFFFF',
        styleRuns: []
      };

      container.layers.unshift(newLayer);
      state.selectedLayerId = newLayerId;
      state.editingTextId = newLayerId;
      state.editorMode = 'text-edit';
      save();
    }),

    addImageLayerFromFile: async (file: File) => {
      // Validate file format
      const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Unsupported file format. Please upload PNG, JPEG, or WebP images.');
        return;
      }

      // Check max file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        alert('File size exceeds 20MB limit.');
        return;
      }

      // Create local data URL for immediate zero-latency preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        // Create HTML Image element to extract native width/height
        const img = new Image();
        img.onload = () => {
          const state = get();
          const { container, save } = getActiveLayerContainerAndSave(state);
          if (!container) return;

          // Proportional scaling to fit within canonical $1080 \times 1440$ bounds
          const maxW = 960;
          const maxH = 1000;
          let w = img.width || 800;
          let h = img.height || 600;

          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          const posX = Math.round((1080 - w) / 2);
          const posY = Math.round((1440 - h) / 2);
          const assetId = `asset-${Date.now()}`;
          const newLayerId = `l-${Date.now()}`;

          // Create local AssetRecord
          const assetRecord: AssetRecord = {
            id: assetId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type as any,
            localUrl: dataUrl,
            width: img.width,
            height: img.height,
            createdAt: new Date().toISOString()
          };

          const newLayer: ImageLayerNode = {
            id: newLayerId,
            name: file.name.replace(/\.[^/.]+$/, ''),
            semanticRole: 'image',
            type: 'image',
            assetId,
            url: dataUrl, // Local data URL preview
            localPreviewUrl: dataUrl,
            prompt: 'User uploaded asset',
            status: 'ready',
            x: posX,
            y: posY,
            width: w,
            height: h,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isVisible: true,
            zIndex: 0,
            borderRadius: 12,
            crop: { scale: 1, offsetX: 0, offsetY: 0 }
          };

          set((draft) => {
            const { container: draftContainer, save: draftSave } = getActiveLayerContainerAndSave(draft);
            if (draftContainer) {
              pushHistorySnapshot(get(), draft, 'ADD_IMAGE');
              draft.assets.push(assetRecord);
              draftContainer.layers.unshift(newLayer);
              draft.selectedLayerId = newLayerId;
              draft.editorMode = 'select';
              draftSave();
            }
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },

    addImageLayerFromUrl: (url) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container) return;

      pushHistorySnapshot(get(), state, 'ADD_IMAGE');

      const newLayerId = `l-${Date.now()}`;
      const newLayer: ImageLayerNode = {
        id: newLayerId,
        name: 'Hero Image',
        semanticRole: 'image',
        type: 'image',
        url: url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop',
        prompt: 'Abstract visual representation',
        status: 'ready',
        x: 60,
        y: 400,
        width: 960,
        height: 540,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isVisible: true,
        zIndex: 0,
        borderRadius: 12
      };

      container.layers.unshift(newLayer);
      state.selectedLayerId = newLayerId;
      state.editorMode = 'select';
      save();
    }),

    addShapeLayer: (
      shapeType = 'rectangle',
      fill = '#0A84FF',
      x,
      y,
      width = 240,
      height = 160
    ) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container) return;

      pushHistorySnapshot(get(), state, 'ADD_SHAPE');

      const posX = x !== undefined ? x : Math.round((1080 - width) / 2);
      const posY = y !== undefined ? y : Math.round((1440 - height) / 2);
      const newLayerId = `l-${Date.now()}`;

      const newLayer: ShapeLayerNode = {
        id: newLayerId,
        name: `${shapeType.replace('-', ' ')} shape`,
        type: 'shape',
        shapeType,
        x: posX,
        y: posY,
        width,
        height,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isVisible: true,
        zIndex: 0,
        fill: fill || '#0A84FF',
        stroke: { enabled: false, color: '#FFFFFF', width: 2 },
        borderRadius: shapeType === 'rounded-rectangle' ? 16 : 0
      };

      container.layers.unshift(newLayer);
      state.selectedLayerId = newLayerId;
      state.editorMode = 'select';
      save();
    }),


    updateLayerNode: (layerId, updates) => set((state) => {
      const applyUpdates = (layer: LayerNode) => {
        Object.assign(layer, updates);
        if (layer.type === 'text') {
          autoSizeTextLayer(layer as TextLayerNode);
        }
      };

      if (state.isTemplateEditorMode && state.activeTemplateId && state.activeLayoutId) {
        const tpl = state.templates.find(t => t.id === state.activeTemplateId);
        const layout = tpl?.layouts.find(l => l.id === state.activeLayoutId);
        const layer = layout?.layers.find(l => l.id === layerId);
        if (layer) {
          applyUpdates(layer);
          state.templateDirty = true;
          if (tpl) saveTemplateToIDB(tpl).catch(console.error);
        }
        return;
      }

      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      const slide = doc?.slides.find(s => s.id === state.activeSlideId);
      const layer = slide?.layers.find(l => l.id === layerId);
      if (layer) {
        applyUpdates(layer);
        persistActiveDocument(doc);
      }
    }),


    updateShapeFill: (layerId, fill) => set((state) => {
      if (state.isTemplateEditorMode && state.activeTemplateId && state.activeLayoutId) {
        const tpl = state.templates.find(t => t.id === state.activeTemplateId);
        const layout = tpl?.layouts.find(l => l.id === state.activeLayoutId);
        const layer = layout?.layers.find(l => l.id === layerId) as ShapeLayerNode;
        if (layer && layer.type === 'shape') {
          layer.fill = fill;
          state.templateDirty = true;
          if (tpl) saveTemplateToIDB(tpl).catch(console.error);
        }
        return;
      }

      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      const slide = doc?.slides.find(s => s.id === state.activeSlideId);
      const layer = slide?.layers.find(l => l.id === layerId) as ShapeLayerNode;
      if (layer && layer.type === 'shape') {
        pushHistorySnapshot(get(), state, 'UPDATE_SHAPE_FILL');
        layer.fill = fill;
        persistActiveDocument(doc);
      }
    }),

    updateShapeFillLive: (layerId, fill) => set((state) => {
      if (state.isTemplateEditorMode && state.activeTemplateId && state.activeLayoutId) {
        const tpl = state.templates.find(t => t.id === state.activeTemplateId);
        const layout = tpl?.layouts.find(l => l.id === state.activeLayoutId);
        const layer = layout?.layers.find(l => l.id === layerId) as ShapeLayerNode;
        if (layer && layer.type === 'shape') {
          layer.fill = fill;
          state.templateDirty = true;
          if (tpl) saveTemplateToIDB(tpl).catch(console.error);
        }
        return;
      }

      const doc = state.documents.find(d => d.id === state.activeDocumentId);
      const slide = doc?.slides.find(s => s.id === state.activeSlideId);
      const layer = slide?.layers.find(l => l.id === layerId) as ShapeLayerNode;
      if (layer && layer.type === 'shape') {
        layer.fill = fill;
        persistActiveDocument(doc);
      }
    }),

    commitShapeFillSnapshot: (description = 'UPDATE_GRADIENT') => set((state) => {
      pushHistorySnapshot(get(), state, description);
    }),

    removeLayerNode: (layerId) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (container) {
        pushHistorySnapshot(get(), state, 'REMOVE_LAYER');
        container.layers = container.layers.filter(l => l.id !== layerId);
        if (state.selectedLayerId === layerId) state.selectedLayerId = null;
        if (state.editingTextId === layerId) state.editingTextId = null;
        save();
      }
    }),

    reorderLayer: (layerId, direction) => set((state) => {
      const { container, save } = getActiveLayerContainerAndSave(state);
      if (!container) return;

      const idx = container.layers.findIndex(l => l.id === layerId);
      if (idx === -1) return;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < container.layers.length) {
        pushHistorySnapshot(get(), state, 'REORDER_LAYER');
        const [moved] = container.layers.splice(idx, 1);
        container.layers.splice(targetIdx, 0, moved);
        save();
      }
    }),

    undo: () => set((state) => {
      if (state.historyIndex >= 0) {
        const snapshot = state.history[state.historyIndex];
        const docIdx = state.documents.findIndex(d => d.id === snapshot.document.id);
        if (docIdx !== -1) {
          state.documents[docIdx] = JSON.parse(JSON.stringify(snapshot.document));
          state.activeSlideId = snapshot.activeSlideId;
          state.selectedLayerId = null;
          state.editingTextId = null;
          state.historyIndex -= 1;
          persistActiveDocument(state.documents[docIdx]);
        }
      }
    }),

    redo: () => set((state) => {
      if (state.historyIndex + 1 < state.history.length) {
        state.historyIndex += 1;
        const snapshot = state.history[state.historyIndex];
        const docIdx = state.documents.findIndex(d => d.id === snapshot.document.id);
        if (docIdx !== -1) {
          state.documents[docIdx] = JSON.parse(JSON.stringify(snapshot.document));
          state.activeSlideId = snapshot.activeSlideId;
          state.selectedLayerId = null;
          state.editingTextId = null;
          persistActiveDocument(state.documents[docIdx]);
        }
      }
    }),

    setPerformancePreset: (preset) => set((state) => {
      state.settings.preset = preset;
    }),

    setApiKey: (provider, key) => set((state) => {
      state.settings.apiKeys[provider] = key;
    })
  }))
);

function pushHistorySnapshot(currentState: CarouselState, draftState: any, description: string) {
  const doc = currentState.documents.find(d => d.id === currentState.activeDocumentId);
  if (!doc) return;

  const snapshot: HistorySnapshot = {
    document: JSON.parse(JSON.stringify(doc)),
    activeSlideId: currentState.activeSlideId,
    description
  };

  if (draftState.historyIndex < draftState.history.length - 1) {
    draftState.history = draftState.history.slice(0, draftState.historyIndex + 1);
  }

  draftState.history.push(snapshot);
  if (draftState.history.length > 50) draftState.history.shift();
  draftState.historyIndex = draftState.history.length - 1;
}

function persistActiveDocument(doc?: CarouselDocument) {
  if (!doc) return;
  const plainDoc = JSON.parse(JSON.stringify(doc)) as CarouselDocument;
  saveDocumentToIDB(plainDoc).catch(err => console.error('Failed to persist to IndexedDB:', err));
}

function getActiveLayerContainerAndSave(state: any): { container: { layers: LayerNode[]; backgroundColor?: string } | null; save: () => void } {
  if (state.isTemplateEditorMode && state.activeTemplateId && state.activeLayoutId) {
    const tpl = state.templates.find((t: any) => t.id === state.activeTemplateId);
    const layout = tpl?.layouts.find((l: any) => l.id === state.activeLayoutId);
    return {
      container: layout || null,
      save: () => {
        state.templateDirty = true;
        if (tpl) saveTemplateToIDB(tpl).catch(console.error);
      }
    };
  }
  const doc = state.documents.find((d: any) => d.id === state.activeDocumentId);
  const slide = doc?.slides.find((s: any) => s.id === state.activeSlideId);
  return {
    container: slide || null,
    save: () => {
      if (doc) persistActiveDocument(doc);
    }
  };
}

