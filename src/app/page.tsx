'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { NavigationHeader } from '../components/NavigationHeader';
import { NewCarouselModal } from '../components/NewCarouselModal';
import dynamic from 'next/dynamic';
import {
  Search, Trash2, LayoutGrid, Plus, Sparkles, Layers,
  Type, Image as ImageIcon, Square, Layout, X, Play,
  AlertCircle, CheckCircle2, Sliders, Upload, RefreshCw, ZoomIn, ZoomOut,
  Copy, Circle, Minus, LayoutTemplate, Layers2
} from 'lucide-react';

const KonvaCanvas = dynamic(
  () => import('../components/KonvaCanvas').then((mod) => mod.KonvaCanvas),
  { ssr: false }
);
import { InspectorPanel } from '../components/InspectorPanel';
import { SaveAsTemplateModal } from '../components/SaveAsTemplateModal';
import { ExportModal } from '../components/ExportModal';

export default function AppMain() {
  const currentView = useCarouselStore((state) => state.currentView);
  const setView = useCarouselStore((state) => state.setView);
  const documents = useCarouselStore((state) => state.documents);
  const activeDocumentId = useCarouselStore((state) => state.activeDocumentId);
  const activeSlideId = useCarouselStore((state) => state.activeSlideId);
  const loadDocumentsFromStorage = useCarouselStore((state) => state.loadDocumentsFromStorage);
  const openDocument = useCarouselStore((state) => state.openDocument);
  const deleteDocument = useCarouselStore((state) => state.deleteDocument);

  // Slide Mutators
  const setActiveSlideId = useCarouselStore((state) => state.setActiveSlideId);
  const addSlide = useCarouselStore((state) => state.addSlide);
  const duplicateSlide = useCarouselStore((state) => state.duplicateSlide);
  const deleteSlide = useCarouselStore((state) => state.deleteSlide);
  const moveSlide = useCarouselStore((state) => state.moveSlide);

  // Layer Mutators & Selection
  const selectedLayerId = useCarouselStore((state) => state.selectedLayerId);
  const selectedLayerIds = useCarouselStore((state) => state.selectedLayerIds);
  const moveSelectedLayersZOrder = useCarouselStore((state) => state.moveSelectedLayersZOrder);
  const groupSelectedLayers = useCarouselStore((state) => state.groupSelectedLayers);
  const ungroupLayer = useCarouselStore((state) => state.ungroupLayer);
  const duplicateSelectedLayers = useCarouselStore((state) => state.duplicateSelectedLayers);
  const copySelectedLayers = useCarouselStore((state) => state.copySelectedLayers);
  const pasteLayers = useCarouselStore((state) => state.pasteLayers);
  const removeSelectedLayers = useCarouselStore((state) => state.removeSelectedLayers);
  const addTextLayer = useCarouselStore((state) => state.addTextLayer);
  const addImageLayerFromFile = useCarouselStore((state) => state.addImageLayerFromFile);
  const addShapeLayer = useCarouselStore((state) => state.addShapeLayer);

  // Tool State
  const editorMode = useCarouselStore((state) => state.editorMode);
  const setEditorMode = useCarouselStore((state) => state.setEditorMode);
  const setActiveShapeType = useCarouselStore((state) => state.setActiveShapeType);

  const settings = useCarouselStore((state) => state.settings);
  const setPerformancePreset = useCarouselStore((state) => state.setPerformancePreset);

  // Template System Store State & Actions
  const templates = useCarouselStore((state) => state.templates);
  const activeTemplateId = useCarouselStore((state) => state.activeTemplateId);
  const activeLayoutId = useCarouselStore((state) => state.activeLayoutId);
  const isTemplateEditorMode = useCarouselStore((state) => state.isTemplateEditorMode);
  const loadTemplatesFromStorage = useCarouselStore((state) => state.loadTemplatesFromStorage);

  const createTemplate = useCarouselStore((state) => state.createTemplate);
  const renameTemplate = useCarouselStore((state) => state.renameTemplate);
  const duplicateTemplate = useCarouselStore((state) => state.duplicateTemplate);
  const deleteTemplate = useCarouselStore((state) => state.deleteTemplate);
  const setDefaultTemplate = useCarouselStore((state) => state.setDefaultTemplate);
  const setActiveTemplateId = useCarouselStore((state) => state.setActiveTemplateId);
  const setActiveLayoutId = useCarouselStore((state) => state.setActiveLayoutId);
  const enterTemplateEditMode = useCarouselStore((state) => state.enterTemplateEditMode);
  const exitTemplateEditMode = useCarouselStore((state) => state.exitTemplateEditMode);
  const saveTemplateEdits = useCarouselStore((state) => state.saveTemplateEdits);
  const applyTemplateToCarousel = useCarouselStore((state) => state.applyTemplateToCarousel);
  const addMasterLayout = useCarouselStore((state) => state.addMasterLayout);
  const deleteMasterLayout = useCarouselStore((state) => state.deleteMasterLayout);
  const getActiveTemplate = useCarouselStore((state) => state.getActiveTemplate);
  const getActiveMasterLayout = useCarouselStore((state) => state.getActiveMasterLayout);
  const createTemplateFromCarousel = useCarouselStore((state) => state.createTemplateFromCarousel);
  const changeSlideLayout = useCarouselStore((state) => state.changeSlideLayout);
  const isPreviewWithSampleContent = useCarouselStore((state) => state.isPreviewWithSampleContent);
  const toggleSampleContentPreview = useCarouselStore((state) => state.toggleSampleContentPreview);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Native File Picker Ref for Image Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shape Picker Popover State
  const [showShapePicker, setShowShapePicker] = useState(false);

  // Add Slide Layout Picker Modal State
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);

  // Template Modal States
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateNameInput, setNewTemplateNameInput] = useState('Untitled Template');
  const [newTemplateStartFromType, setNewTemplateStartFromType] = useState<'blank' | 'duplicate' | 'carousel'>('blank');
  const [newTemplateSourceId, setNewTemplateSourceId] = useState<string>('');

  const [isSaveAsTemplateModalOpen, setIsSaveAsTemplateModalOpen] = useState(false);
  const [saveAsTemplateModalMode, setSaveAsTemplateModalMode] = useState<'full_carousel' | 'single_slide'>('full_carousel');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [mobileEditorTab, setMobileEditorTab] = useState<'canvas' | 'inspector'>('canvas');

  const [isRenameTemplateModalOpen, setIsRenameTemplateModalOpen] = useState(false);
  const [renameTemplateIdTarget, setRenameTemplateIdTarget] = useState<string | null>(null);
  const [renameTemplateNameInput, setRenameTemplateNameInput] = useState('');

  // Brand Kit Sub-tabs state
  const [brandKitTab, setBrandKitTab] = useState<'templates' | 'guidelines'>('templates');
  const [activeSkillTab, setActiveSkillTab] = useState<'global' | 'cover' | 'content' | 'cta'>('global');
  const [enableSkillContext, setEnableSkillContext] = useState(true);
  const [skillRules, setSkillRules] = useState({
    global: 'Keep compositions minimal and cinematic. Maintain high contrast typography and clear brand color hierarchy.',
    cover: 'Dopamine hook headline under 10 words. Eye-catching subtitle and hero image layout.',
    content: '1 primary takeaway per slide. High readability 28px+ body copy.',
    cta: 'Strong bold conversion prompt. Clear arrow graphic or action trigger handle.'
  });
  const [simInput, setSimInput] = useState('Generate a slide prompt for 5 AI productivity tools');
  const [simResult, setSimResult] = useState<string | null>(null);

  // Template View state
  const [templateZoom, setTemplateZoom] = useState(100);

  // Settings view local state
  const [selectedPreset, setSelectedPreset] = useState<'high_quality' | 'balanced' | 'high_speed'>('balanced');
  const [apiKeys, setApiKeys] = useState({
    openai: 'sk-proj-••••••••••••••••',
    claude: 'sk-ant-••••••••••••••••',
    gemini: '',
    deepseek: 'sk-ds-••••••••••••••••',
    grok: '',
    seeddance: 'sd-••••••••••••••••'
  });

  // Reorder Drag State for Slide Deck
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);

  useEffect(() => {
    loadDocumentsFromStorage();
    loadTemplatesFromStorage();
  }, [loadDocumentsFromStorage, loadTemplatesFromStorage]);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeSlide = activeDoc?.slides.find((s) => s.id === activeSlideId) || activeDoc?.slides[0];

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard shortcut listener for Z-order, grouping, duplication, deletion & slide reordering
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when user is typing inside an input, textarea, or contentEditable element
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Bring to Front: Cmd/Ctrl + Shift + ]
      if (isMod && e.shiftKey && (e.code === 'BracketRight' || e.key === ']')) {
        e.preventDefault();
        moveSelectedLayersZOrder('bring-to-front');
        return;
      }

      // Send to Back: Cmd/Ctrl + Shift + [
      if (isMod && e.shiftKey && (e.code === 'BracketLeft' || e.key === '[')) {
        e.preventDefault();
        moveSelectedLayersZOrder('send-to-back');
        return;
      }

      // Bring Forward: Cmd/Ctrl + ]
      if (isMod && !e.shiftKey && (e.code === 'BracketRight' || e.key === ']')) {
        e.preventDefault();
        moveSelectedLayersZOrder('bring-forward');
        return;
      }

      // Send Backward: Cmd/Ctrl + [
      if (isMod && !e.shiftKey && (e.code === 'BracketLeft' || e.key === '[')) {
        e.preventDefault();
        moveSelectedLayersZOrder('send-backward');
        return;
      }

      // Group: Cmd/Ctrl + G
      if (isMod && !e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        groupSelectedLayers();
        return;
      }

      // Ungroup: Cmd/Ctrl + Shift + G
      if (isMod && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (activeDoc && activeSlideId) {
          const slide = activeDoc.slides.find(s => s.id === activeSlideId);
          const targetGroup = slide?.layers.find(l => selectedLayerIds.includes(l.id) && l.type === 'group');
          if (targetGroup) ungroupLayer(targetGroup.id);
        }
        return;
      }

      // Copy: Cmd/Ctrl + C
      if (isMod && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        if (selectedLayerIds.length > 0) {
          e.preventDefault();
          copySelectedLayers();
          return;
        }
      }

      // Paste: Cmd/Ctrl + V
      if (isMod && !e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        pasteLayers();
        return;
      }

      // Duplicate: Cmd/Ctrl + D
      if (isMod && !e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateSelectedLayers();
        return;
      }

      // Delete / Backspace: Remove selected layers
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isMod) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea' && !(document.activeElement as HTMLElement)?.isContentEditable) {
          if (selectedLayerIds.length > 0 || selectedLayerId) {
            e.preventDefault();
            removeSelectedLayers();
            return;
          }
        }
      }

      // Slide reordering (Cmd/Ctrl + Shift + ArrowLeft/ArrowRight)
      if (isMod && e.shiftKey && activeDoc && activeSlideId) {
        const currentIdx = activeDoc.slides.findIndex((s) => s.id === activeSlideId);
        if (currentIdx !== -1) {
          if (e.key === 'ArrowLeft' && currentIdx > 0) {
            e.preventDefault();
            moveSlide(activeSlideId, currentIdx, currentIdx - 1);
          } else if (e.key === 'ArrowRight' && currentIdx < activeDoc.slides.length - 1) {
            e.preventDefault();
            moveSlide(activeSlideId, currentIdx, currentIdx + 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeDoc,
    activeSlideId,
    selectedLayerIds,
    moveSelectedLayersZOrder,
    groupSelectedLayers,
    ungroupLayer,
    duplicateSelectedLayers,
    removeSelectedLayers,
    moveSlide
  ]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addImageLayerFromFile(file);
      e.target.value = '';
    }
  };

  const handleRunSimulation = () => {
    setSimResult(
      `[COMPILED SYSTEM PROMPT]\nSkill Context: ${skillRules[activeSkillTab]}\n\nUser Input: "${simInput}"\n\nResulting Prompt:\n"High contrast dark slide with punchy headline, neon blue accents, and 60fps layout hierarchy."\n\nMetrics: 1,248 tokens | Latency: ~320ms | Provider: Claude 3.5 Sonnet`
    );
  };

  return (
    <div className="min-h-screen bg-workspace text-white flex flex-col overflow-hidden select-none">
      <NavigationHeader
        onOpenCreationModal={() => setIsModalOpen(true)}
        onOpenSaveAsTemplateModal={(m) => {
          setSaveAsTemplateModalMode(m);
          setIsSaveAsTemplateModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Hidden File Input for Native Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* DASHBOARD VIEW */}
      {currentView === 'dashboard' && (
        <main className="pt-[74px] px-6 max-w-[1280px] mx-auto pb-12 flex-1 overflow-y-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
              <p className="text-xs text-text-secondary">
                Manage, edit, and export your high-converting social media carousels.
              </p>
            </div>

            <div className="relative w-[300px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                className="w-full bg-surface border border-border-default rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-text-tertiary focus:border-border-focus outline-none"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-surface border border-border-default rounded-lg overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-text-tertiary hover:shadow-2xl transition-all group flex flex-col"
                  onClick={() => openDocument(doc.id)}
                >
                  <div
                    className="aspect-[4/5] relative flex items-center justify-center p-6 text-center"
                    style={{ backgroundColor: doc.slides[0]?.backgroundColor || '#111111' }}
                  >
                    <span className="text-sm font-extrabold text-white line-clamp-3">
                      {(doc.slides[0]?.layers[0] as any)?.content || doc.title}
                    </span>

                    <button
                      className="absolute top-2 right-2 p-1.5 rounded bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 border-t border-border-subtle">
                    <h3 className="text-xs font-semibold text-white truncate mb-1">{doc.title}</h3>
                    <div className="flex justify-between items-center text-[10px] text-text-secondary">
                      <span>{doc.slides.length} Slides</span>
                      <span>Just now</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 max-w-[480px] mx-auto">
              <div className="w-14 h-14 rounded-full bg-surface-elevated border border-border-default flex items-center justify-center mx-auto mb-4 text-text-secondary">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No Carousels Created Yet</h3>
              <p className="text-xs text-text-secondary mb-4">
                Create your first social media carousel using AI prompt generation or custom templates.
              </p>
              <button
                className="px-4 py-2 text-xs font-semibold rounded bg-accent-blue text-white hover:bg-blue-600"
                onClick={() => setIsModalOpen(true)}
              >
                Create Carousel
              </button>
            </div>
          )}
        </main>
      )}

      {/* EDITOR VIEW */}
      {currentView === 'editor' && (
        <main className="pt-[50px] flex-1 flex flex-col overflow-hidden w-full relative">
          {/* Upper Editor Workspace */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Quick Tool Rail (Left Edge) */}
            <div className="w-[60px] bg-surface border-r border-border-default flex flex-col items-center py-4 gap-4 z-30 relative">
              <button
                className="p-2.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-white flex flex-col items-center gap-1 transition-colors"
                onClick={() => addTextLayer()}
                title="Add Text Layer"
              >
                <Type className="w-4 h-4 text-accent-blue" />
                <span className="text-[9px] font-medium">Text</span>
              </button>

              <button
                className="p-2.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-white flex flex-col items-center gap-1 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="Add / Upload Image"
              >
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span className="text-[9px] font-medium">Image</span>
              </button>

              {/* Shape Tool with Popover */}
              <div className="relative">
                <button
                  className={`p-2.5 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                    showShapePicker || editorMode === 'draw-shape'
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-white'
                  }`}
                  onClick={() => setShowShapePicker((prev) => !prev)}
                  title="Add / Draw Shape"
                >
                  <Square className="w-4 h-4 text-green-400" />
                  <span className="text-[9px] font-medium">Shape</span>
                </button>

                {/* Shape Picker Popover */}
                {showShapePicker && (
                  <div className="absolute left-[70px] top-0 bg-surface-elevated border border-border-default rounded-lg p-2 shadow-2xl z-50 flex flex-col gap-1 w-[150px]">
                    <span className="text-[10px] font-bold text-text-tertiary uppercase px-2 py-1">
                      Choose Shape
                    </span>
                    <button
                      className="p-2 hover:bg-surface-hover rounded text-xs text-white flex items-center gap-2"
                      onClick={() => {
                        setActiveShapeType('rectangle');
                        setEditorMode('draw-shape');
                        setShowShapePicker(false);
                      }}
                    >
                      <Square className="w-3.5 h-3.5 text-green-400" />
                      Rectangle
                    </button>
                    <button
                      className="p-2 hover:bg-surface-hover rounded text-xs text-white flex items-center gap-2"
                      onClick={() => {
                        setActiveShapeType('rounded-rectangle');
                        setEditorMode('draw-shape');
                        setShowShapePicker(false);
                      }}
                    >
                      <Square className="w-3.5 h-3.5 text-emerald-400 rounded-sm" />
                      Rounded Rect
                    </button>
                    <button
                      className="p-2 hover:bg-surface-hover rounded text-xs text-white flex items-center gap-2"
                      onClick={() => {
                        setActiveShapeType('ellipse');
                        setEditorMode('draw-shape');
                        setShowShapePicker(false);
                      }}
                    >
                      <Circle className="w-3.5 h-3.5 text-cyan-400" />
                      Ellipse
                    </button>
                    <button
                      className="p-2 hover:bg-surface-hover rounded text-xs text-white flex items-center gap-2"
                      onClick={() => {
                        setActiveShapeType('line');
                        setEditorMode('draw-shape');
                        setShowShapePicker(false);
                      }}
                    >
                      <Minus className="w-3.5 h-3.5 text-amber-400" />
                      Line
                    </button>
                  </div>
                )}
              </div>

              <button
                className="p-2.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-white flex flex-col items-center gap-1 transition-colors"
                onClick={() => setShowLayoutPicker(true)}
                title="Add Slide Layout"
              >
                <Layout className="w-4 h-4 text-amber-400" />
                <span className="text-[9px] font-medium">Layout</span>
              </button>
            </div>

            {/* Central Konva Canvas Stage */}
            <div className={`flex-1 flex flex-col overflow-hidden relative ${mobileEditorTab === 'inspector' ? 'hidden lg:flex' : 'flex'}`}>
              <KonvaCanvas />
            </div>

            {/* Right 4-Tab Inspector Panel */}
            <div className={`w-full lg:w-[340px] flex-col overflow-hidden ${mobileEditorTab === 'canvas' ? 'hidden lg:flex' : 'flex'}`}>
              <InspectorPanel />
            </div>

            {/* Mobile View Toggle Bar (visible only on <1024px screens) */}
            <div className="lg:hidden fixed bottom-[115px] left-1/2 -translate-x-1/2 z-40 bg-surface-elevated/90 backdrop-blur-md border border-border-default rounded-full p-1 shadow-2xl flex items-center gap-1">
              <button
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  mobileEditorTab === 'canvas'
                    ? 'bg-accent-blue text-white shadow'
                    : 'text-text-secondary hover:text-white'
                }`}
                onClick={() => setMobileEditorTab('canvas')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Canvas Stage
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  mobileEditorTab === 'inspector'
                    ? 'bg-accent-blue text-white shadow'
                    : 'text-text-secondary hover:text-white'
                }`}
                onClick={() => setMobileEditorTab('inspector')}
              >
                <Sliders className="w-3.5 h-3.5" />
                Design Panel
              </button>
            </div>
          </div>

          {/* Bottom Horizontal Strip: Master Layout Navigator (in Template Mode) vs Carousel Slide Deck (in Standard Mode) */}
          {isTemplateEditorMode ? (
            <div className="h-[105px] bg-surface border-t border-border-default flex items-center px-4 gap-3 overflow-x-auto z-20">
              {getActiveTemplate()?.layouts.map((layout) => {
                const isActive = layout.id === activeLayoutId;

                return (
                  <div
                    key={layout.id}
                    className={`w-[110px] h-[85px] rounded-lg border cursor-pointer relative overflow-hidden transition-all shrink-0 group flex flex-col justify-between p-2.5 ${
                      isActive
                        ? 'border-accent-blue ring-2 ring-blue-500/40 shadow-lg bg-surface-elevated'
                        : 'border-border-default hover:border-text-secondary opacity-80 hover:opacity-100 bg-surface'
                    }`}
                    style={{ backgroundColor: layout.backgroundColor || '#111' }}
                    onClick={() => setActiveLayoutId(layout.id)}
                  >
                    <div className="flex justify-between items-center z-10">
                      <span className="text-[9px] font-bold text-accent-blue uppercase tracking-widest bg-black/80 px-1.5 py-0.5 rounded">
                        {layout.role.toUpperCase()}
                      </span>
                      {getActiveTemplate()!.layouts.length > 1 && (
                        <button
                          className="w-4 h-4 rounded-full bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTemplateId) deleteMasterLayout(activeTemplateId, layout.id);
                          }}
                          title="Delete Master Layout"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] font-bold text-white truncate z-10">
                      {layout.name}
                    </div>
                  </div>
                );
              })}

              {/* + Add Master Layout Button */}
              <button
                className="w-[110px] h-[85px] rounded-lg border-2 border-dashed border-border-default hover:border-accent-blue bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-white flex flex-col items-center justify-center gap-1 shrink-0 transition-all"
                onClick={() => {
                  if (activeTemplateId) addMasterLayout(activeTemplateId, 'content', 'Content Master Layout');
                }}
              >
                <Plus className="w-4 h-4 text-accent-blue" />
                <span className="text-[9px] font-semibold">+ Master Layout</span>
              </button>
            </div>
          ) : (
            <div className="h-[105px] bg-surface border-t border-border-default flex items-center px-4 gap-3 overflow-x-auto z-20">
              {activeDoc?.slides.map((slide, idx) => {
                const isActive = slide.id === activeSlideId;

                return (
                  <div
                    key={slide.id}
                    draggable
                    onDragStart={() => setDraggedSlideId(slide.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedSlideId && draggedSlideId !== slide.id) {
                        const fromIdx = activeDoc.slides.findIndex((s) => s.id === draggedSlideId);
                        const toIdx = activeDoc.slides.findIndex((s) => s.id === slide.id);
                        if (fromIdx !== -1 && toIdx !== -1) {
                          moveSlide(draggedSlideId, fromIdx, toIdx);
                        }
                      }
                      setDraggedSlideId(null);
                    }}
                    className={`w-[70px] h-[85px] rounded-lg border cursor-pointer relative overflow-hidden transition-all shrink-0 group flex flex-col ${
                      isActive
                        ? 'border-accent-blue ring-2 ring-blue-500/40 shadow-lg'
                        : 'border-border-default hover:border-text-secondary opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: slide.backgroundColor || '#111' }}
                    onClick={() => setActiveSlideId(slide.id)}
                  >
                    <span className="absolute top-1 left-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
                      #{idx + 1}
                    </span>

                    {/* Actions Overlay (Duplicate & Delete) */}
                    <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        className="w-4 h-4 rounded-full bg-surface-elevated text-white flex items-center justify-center hover:bg-surface-hover"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSlide(slide.id);
                        }}
                        title="Duplicate Slide"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                      {activeDoc.slides.length > 1 && (
                        <button
                          className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSlide(slide.id);
                          }}
                          title="Delete Slide"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="p-1 text-[7px] text-white/80 overflow-hidden h-full flex items-center justify-center text-center font-medium leading-tight">
                      {(slide.layers[0] as any)?.content || `Slide ${idx + 1}`}
                    </div>
                  </div>
                );
              })}

              {/* Active Slide Layout Switcher Dropdown */}
              {activeSlide && (
                <div className="flex items-center gap-1.5 bg-surface-elevated border border-border-default rounded-lg px-3 py-2 ml-auto shrink-0 shadow-md">
                  <LayoutTemplate className="w-3.5 h-3.5 text-accent-blue" />
                  <span className="text-[10px] font-semibold text-text-secondary uppercase">Change Layout:</span>
                  <select
                    className="bg-transparent text-xs text-white outline-none font-semibold cursor-pointer max-w-[160px] truncate"
                    value={activeSlide.masterLayoutId || ''}
                    onChange={(e) => {
                      if (activeSlideId && e.target.value) {
                        changeSlideLayout(activeSlideId, e.target.value);
                      }
                    }}
                  >
                    <option value="" disabled>Select Layout Preset...</option>
                    {getActiveTemplate()?.layouts.map((ml) => (
                      <option key={ml.id} value={ml.id} className="bg-surface text-white">
                        {ml.name} ({ml.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* + Add Slide Button */}
              <button
                className="w-[70px] h-[85px] rounded-lg border-2 border-dashed border-border-default hover:border-accent-blue bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-white flex flex-col items-center justify-center gap-1 shrink-0 transition-all"
                onClick={() => setShowLayoutPicker(true)}
              >
                <Plus className="w-4 h-4 text-accent-blue" />
                <span className="text-[9px] font-semibold">Add Slide</span>
              </button>
            </div>
          )}
        </main>
      )}

      {/* ADD SLIDE LAYOUT PICKER MODAL */}
      {showLayoutPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-default rounded-xl p-6 max-w-[600px] w-full space-y-5">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Choose Slide Layout Template</h3>
                <p className="text-xs text-text-secondary">Select a layout preset to insert into your carousel.</p>
              </div>
              <button className="text-text-tertiary hover:text-white" onClick={() => setShowLayoutPicker(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'content_standard', name: 'Standard Content', role: 'value' },
                { id: 'image_led', name: 'Image-Led Visual', role: 'value' },
                { id: 'statistic', name: 'Statistic / Big Data', role: 'value' },
                { id: 'quote', name: 'Quote / Testimonial', role: 'value' },
                { id: 'comparison', name: 'Comparison Grid', role: 'contrarian' },
                { id: 'cta_standard', name: 'CTA / Conversion', role: 'cta' }
              ].map((layout) => (
                <div
                  key={layout.id}
                  className="bg-surface-elevated border border-border-default hover:border-accent-blue p-4 rounded-lg cursor-pointer text-center space-y-2 group transition-colors"
                  onClick={() => {
                    addSlide(layout.id, layout.role as any);
                    setShowLayoutPicker(false);
                  }}
                >
                  <LayoutTemplate className="w-6 h-6 mx-auto text-accent-blue group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-white block">{layout.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BRAND KIT & TEMPLATES VIEW */}
      {(currentView === 'templates' || currentView === 'creative-director') && (
        <main className="pt-[65px] px-6 max-w-[1280px] mx-auto pb-12 flex-1 overflow-y-auto w-full">
          <div className="flex items-center justify-between border-b border-border-default pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Brand Kit & Design System</h1>
              <p className="text-xs text-text-secondary">
                Configure master slide templates, brand guidelines, and AI Creative Director rule engines.
              </p>
            </div>

            <div className="flex bg-surface-elevated p-1 rounded-lg border border-border-default">
              <button
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  brandKitTab === 'templates'
                    ? 'bg-accent-blue text-white shadow'
                    : 'text-text-secondary hover:text-white'
                }`}
                onClick={() => {
                  setBrandKitTab('templates');
                  setView('templates');
                }}
              >
                Design Templates
              </button>
              <button
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  brandKitTab === 'guidelines'
                    ? 'bg-accent-blue text-white shadow'
                    : 'text-text-secondary hover:text-white'
                }`}
                onClick={() => {
                  setBrandKitTab('guidelines');
                  setView('creative-director');
                }}
              >
                AI Creative Director Guidelines
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: DESIGN TEMPLATES */}
          {brandKitTab === 'templates' && (
            <div className="space-y-6">
              <div className="bg-surface border border-border-default rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-text-secondary">Active Template:</label>
                  <select
                    className="bg-surface-elevated border border-border-default rounded px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-border-focus"
                    value={activeTemplateId || ''}
                    onChange={(e) => setActiveTemplateId(e.target.value)}
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} {tpl.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-xs font-medium text-white flex items-center gap-1"
                    onClick={() => {
                      setNewTemplateNameInput('Untitled Template');
                      setNewTemplateStartFromType('blank');
                      setNewTemplateSourceId('');
                      setIsNewTemplateModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 text-accent-blue" />
                    + New Template
                  </button>

                  <button
                    className="px-3 py-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-blue/40 rounded text-xs font-semibold text-accent-blue flex items-center gap-1.5 transition-colors"
                    onClick={() => {
                      setSaveAsTemplateModalMode('full_carousel');
                      setIsSaveAsTemplateModalOpen(true);
                    }}
                  >
                    Save Carousel as Template
                  </button>

                  <button
                    className={`px-3 py-1.5 border border-border-default rounded text-xs font-medium transition-colors ${
                      isPreviewWithSampleContent
                        ? 'bg-accent-blue text-white shadow'
                        : 'bg-surface-elevated text-text-secondary hover:text-white'
                    }`}
                    onClick={toggleSampleContentPreview}
                  >
                    {isPreviewWithSampleContent ? 'Sample Preview: ON' : 'Sample Preview: OFF'}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!getActiveTemplate()?.isDefault && (
                    <button
                      className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-xs font-medium text-text-secondary hover:text-white"
                      onClick={() => activeTemplateId && setDefaultTemplate(activeTemplateId)}
                    >
                      Set Default
                    </button>
                  )}

                  <button
                    className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-xs font-medium text-text-secondary hover:text-white"
                    onClick={() => activeTemplateId && duplicateTemplate(activeTemplateId)}
                  >
                    Duplicate
                  </button>

                  <button
                    className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-xs font-medium text-text-secondary hover:text-white"
                    onClick={() => {
                      setRenameTemplateIdTarget(activeTemplateId);
                      setRenameTemplateNameInput(getActiveTemplate()?.name || '');
                      setIsRenameTemplateModalOpen(true);
                    }}
                  >
                    Rename
                  </button>

                  {!getActiveTemplate()?.isSystemTemplate && templates.length > 1 && (
                    <button
                      className="px-3 py-1.5 bg-surface-elevated hover:bg-red-500/20 border border-border-default text-text-secondary hover:text-red-400 rounded text-xs font-medium"
                      onClick={() => activeTemplateId && deleteTemplate(activeTemplateId)}
                    >
                      Delete
                    </button>
                  )}

                  <div className="flex items-center bg-surface-elevated rounded border border-border-default px-2 py-1 text-xs">
                    <button
                      className="p-1 text-text-secondary hover:text-white"
                      onClick={() => setTemplateZoom((z) => Math.max(50, z - 10))}
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-mono text-white font-semibold">{templateZoom}%</span>
                    <button
                      className="p-1 text-text-secondary hover:text-white"
                      onClick={() => setTemplateZoom((z) => Math.min(200, z + 10))}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    className="px-3.5 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-xs font-semibold text-white flex items-center gap-1.5"
                    onClick={() => activeTemplateId && enterTemplateEditMode(activeTemplateId)}
                  >
                    <Sliders className="w-3.5 h-3.5 text-accent-blue" />
                    Deep Edit
                  </button>
                  <button
                    className="px-4 py-1.5 bg-accent-blue hover:bg-blue-600 rounded text-xs font-semibold text-white shadow"
                    onClick={() => activeTemplateId && applyTemplateToCarousel(activeTemplateId)}
                  >
                    Apply to Carousel
                  </button>
                </div>
              </div>

              {/* Master Layout Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {getActiveTemplate()?.layouts.map((layout) => {
                  const headlineLayer = layout.layers.find((l: any) => l.semanticRole === 'headline' || l.id.includes('headline')) as any;
                  const subtitleLayer = layout.layers.find((l: any) => l.semanticRole === 'subtitle' || l.id.includes('sub')) as any;
                  const bodyLayer = layout.layers.find((l: any) => l.semanticRole === 'body' || l.id.includes('body')) as any;
                  const ctaLayer = layout.layers.find((l: any) => l.semanticRole === 'cta' || l.id.includes('cta')) as any;

                  return (
                    <div
                      key={layout.id}
                      className="bg-surface border border-border-default rounded-xl overflow-hidden group hover:border-accent-blue transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveLayoutId(layout.id);
                        if (activeTemplateId) enterTemplateEditMode(activeTemplateId);
                      }}
                    >
                      <div className="p-3 border-b border-border-subtle bg-surface-elevated flex justify-between items-center">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{layout.name}</span>
                        <span className="text-[10px] bg-blue-500/20 text-accent-blue px-2 py-0.5 rounded font-semibold uppercase">
                          {layout.role}
                        </span>
                      </div>
                      <div
                        className="aspect-[4/5] p-6 flex flex-col justify-between relative overflow-hidden transition-transform group-hover:scale-[1.01]"
                        style={{
                          backgroundColor: layout.backgroundColor || '#0d0e12',
                          transform: `scale(${templateZoom / 100})`,
                          transformOrigin: 'top left'
                        }}
                      >
                        <div className="w-12 h-2 rounded bg-accent-blue/80" />
                        <div className="space-y-3 my-auto">
                          {headlineLayer && (
                            <div
                              className="text-lg font-extrabold leading-tight"
                              style={{ color: headlineLayer.fill || '#FFFFFF', fontFamily: headlineLayer.fontFamily }}
                            >
                              {headlineLayer.content || 'Master Layout Headline'}
                            </div>
                          )}
                          {subtitleLayer && (
                            <div
                              className="text-xs leading-relaxed"
                              style={{ color: subtitleLayer.fill || '#999999' }}
                            >
                              {subtitleLayer.content || 'Master Layout Subtitle'}
                            </div>
                          )}
                          {bodyLayer && (
                            <div
                              className="text-xs leading-relaxed"
                              style={{ color: bodyLayer.fill || '#CCCCCC' }}
                            >
                              {bodyLayer.content || 'Master Layout Body Copy'}
                            </div>
                          )}
                        </div>
                        {ctaLayer && (
                          <div className="text-[10px] font-mono text-accent-blue uppercase tracking-widest mt-auto">
                            {ctaLayer.content || 'CTA TRIGGER ➔'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: GUIDELINES */}
          {brandKitTab === 'guidelines' && (
            <div className="space-y-6">
              <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="skillContext"
                    className="w-4 h-4 rounded accent-accent-blue cursor-pointer"
                    checked={enableSkillContext}
                    onChange={(e) => setEnableSkillContext(e.target.checked)}
                  />
                  <label htmlFor="skillContext" className="text-xs font-semibold text-white cursor-pointer">
                    Enable skill context in prompt engineering pipeline
                  </label>
                </div>

                <div className="flex items-center gap-2 border border-dashed border-border-default rounded-lg px-4 py-2 bg-surface-elevated hover:bg-surface-hover cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-medium text-text-secondary">
                    Upload Brand Guidelines Document (.pdf, .txt, .md)
                  </span>
                </div>
              </div>

              <div className="bg-surface border border-border-default rounded-lg overflow-hidden">
                <div className="flex border-b border-border-default bg-surface-elevated">
                  {(['global', 'cover', 'content', 'cta'] as const).map((tabKey) => (
                    <button
                      key={tabKey}
                      className={`px-5 py-3 text-xs font-semibold capitalize border-b-2 transition-colors ${
                        activeSkillTab === tabKey
                          ? 'border-accent-blue text-white bg-surface'
                          : 'border-transparent text-text-secondary hover:text-white'
                      }`}
                      onClick={() => setActiveSkillTab(tabKey)}
                    >
                      {tabKey === 'global' ? 'Global Rules' : `${tabKey} Slide`}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-3">
                  <label className="block text-xs font-semibold text-text-secondary uppercase">
                    {activeSkillTab.toUpperCase()} INSTRUCTIONS & CREATIVE DIRECTION
                  </label>
                  <textarea
                    className="w-full bg-surface-elevated border border-border-default rounded p-3 text-xs text-white font-mono leading-relaxed outline-none focus:border-border-focus resize-none"
                    rows={6}
                    value={skillRules[activeSkillTab]}
                    onChange={(e) => setSkillRules({ ...skillRules, [activeSkillTab]: e.target.value })}
                  />
                  <button className="px-4 py-2 bg-accent-blue text-white text-xs font-semibold rounded hover:bg-blue-600 transition-colors">
                    Save Skill Directives
                  </button>
                </div>
              </div>

              <div className="bg-surface border border-border-default rounded-lg p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-border-subtle pb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    DRY-RUN SIMULATION CONSOLE
                  </span>
                  <span className="text-[10px] text-accent-blue font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Live Compiler Active
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase">
                    Test Input Prompt
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                      value={simInput}
                      onChange={(e) => setSimInput(e.target.value)}
                    />
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-accent-blue text-white text-xs font-semibold rounded hover:opacity-90 flex items-center gap-1.5"
                      onClick={handleRunSimulation}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Simulation
                    </button>
                  </div>
                </div>

                {simResult && (
                  <div className="bg-[#0b0c10] border border-border-default rounded p-4 font-mono text-xs text-green-400 whitespace-pre-wrap leading-relaxed">
                    {simResult}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* AI SETTINGS VIEW */}
      {currentView === 'settings' && (
        <main className="pt-[65px] px-6 max-w-[1280px] mx-auto pb-24 flex-1 overflow-y-auto w-full space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">AI Configuration Engine</h1>
            <p className="text-xs text-text-secondary">
              Configure multi-model performance presets, API provider keys, and pipeline task routing rules.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Performance Profiles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === 'high_quality'
                    ? 'bg-blue-600/10 border-accent-blue ring-2 ring-blue-500/30'
                    : 'bg-surface border-border-default hover:border-text-secondary'
                }`}
                onClick={() => setSelectedPreset('high_quality')}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white">High Quality</span>
                  {selectedPreset === 'high_quality' && (
                    <CheckCircle2 className="w-4 h-4 text-accent-blue" />
                  )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Maximum reasoning depth and highest visual accuracy. Uses Claude 3.5 Sonnet & GPT-4o.
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === 'balanced'
                    ? 'bg-blue-600/10 border-accent-blue ring-2 ring-blue-500/30'
                    : 'bg-surface border-border-default hover:border-text-secondary'
                }`}
                onClick={() => setSelectedPreset('balanced')}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white">Balanced (Recommended)</span>
                  {selectedPreset === 'balanced' && (
                    <CheckCircle2 className="w-4 h-4 text-accent-blue" />
                  )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Optimal blend of speed, cost & creative depth across GPT-4o, Claude, and Gemini.
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === 'high_speed'
                    ? 'bg-blue-600/10 border-accent-blue ring-2 ring-blue-500/30'
                    : 'bg-surface border-border-default hover:border-text-secondary'
                }`}
                onClick={() => setSelectedPreset('high_speed')}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white">High Speed</span>
                  {selectedPreset === 'high_speed' && (
                    <CheckCircle2 className="w-4 h-4 text-accent-blue" />
                  )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Ultra-fast generation, minimal latency. Uses DeepSeek V3 and fast image endpoints.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Provider Connections (6 Models Supported)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'OpenAI', model: 'GPT-4o', keyField: 'openai', status: 'connected' },
                { name: 'Claude', model: 'Claude 3.5 Sonnet', keyField: 'claude', status: 'connected' },
                { name: 'Gemini', model: 'Gemini 1.5 Pro', keyField: 'gemini', status: 'unconfigured' },
                { name: 'DeepSeek', model: 'DeepSeek V3/R1', keyField: 'deepseek', status: 'connected' },
                { name: 'grok', model: 'Grok 2', keyField: 'grok', status: 'unconfigured' },
                { name: 'seed dance', model: 'Seed-Dance 1.0', keyField: 'seeddance', status: 'connected' }
              ].map((prov) => (
                <div key={prov.name} className="bg-surface border border-border-default rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block capitalize">{prov.name}</span>
                      <span className="text-[10px] text-text-tertiary">{prov.model}</span>
                    </div>
                    {prov.status === 'connected' ? (
                      <span className="text-[10px] bg-green-500/15 text-accent-green px-2 py-0.5 rounded font-semibold border border-green-500/20">
                        Connected ✓
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded font-semibold border border-amber-500/20">
                        Unconfigured
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    className="w-full bg-surface-elevated border border-border-default rounded px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-border-focus"
                    placeholder="Enter API Key..."
                    value={(apiKeys as any)[prov.keyField]}
                    onChange={(e) => setApiKeys({ ...apiKeys, [prov.keyField]: e.target.value })}
                  />
                  <button className="w-full py-1.5 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded text-[11px] font-medium text-text-secondary hover:text-white transition-colors">
                    Test Connection
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Task Routing Logic
            </h2>
            <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated border-b border-border-default text-text-secondary font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Stage / Task</th>
                    <th className="p-3">Primary Engine</th>
                    <th className="p-3">Fallback Engine</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr>
                    <td className="p-3 font-medium text-white">Outline & Script Generation</td>
                    <td className="p-3 font-mono text-text-secondary">OpenAI (GPT-4o)</td>
                    <td className="p-3 font-mono text-text-tertiary">Claude 3.5 Sonnet</td>
                    <td className="p-3">
                      <span className="text-[10px] text-accent-green bg-green-500/10 px-2 py-0.5 rounded font-semibold">OK</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Visual Prompt Engineering</td>
                    <td className="p-3 font-mono text-text-secondary">Claude 3.5 Sonnet</td>
                    <td className="p-3 font-mono text-text-tertiary">Gemini 1.5 Pro</td>
                    <td className="p-3">
                      <span className="text-[10px] text-red-400 bg-red-500/15 px-2 py-0.5 rounded font-semibold flex items-center gap-1 w-fit border border-red-500/30">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        Fallback Missing Key (!)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Image Generation</td>
                    <td className="p-3 font-mono text-text-secondary">Seed-Dance 1.0</td>
                    <td className="p-3 font-mono text-text-tertiary">OpenAI (DALL-E 3)</td>
                    <td className="p-3">
                      <span className="text-[10px] text-accent-green bg-green-500/10 px-2 py-0.5 rounded font-semibold">OK</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">Style & Layout Consistency Check</td>
                    <td className="p-3 font-mono text-text-secondary">Gemini 1.5 Pro</td>
                    <td className="p-3 font-mono text-text-tertiary">DeepSeek V3</td>
                    <td className="p-3">
                      <span className="text-[10px] text-red-400 bg-red-500/15 px-2 py-0.5 rounded font-semibold flex items-center gap-1 w-fit border border-red-500/30">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        Primary Key Unconfigured (!)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-surface border-t border-border-default px-6 flex items-center justify-between z-50 shadow-2xl">
            <span className="text-xs text-text-secondary">
              Changes will be applied dynamically to the reactive routing pipeline.
            </span>
            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2 border border-border-default rounded text-xs font-semibold text-text-secondary hover:text-white hover:bg-surface-hover transition-colors"
                onClick={() => setView('dashboard')}
              >
                Discard Changes
              </button>
              <button
                className="px-5 py-2 bg-white text-black hover:bg-neutral-200 rounded text-xs font-bold shadow transition-colors"
                onClick={() => {
                  setPerformancePreset(selectedPreset);
                  setView('dashboard');
                }}
              >
                Apply Configuration
              </button>
            </div>
          </div>
        </main>
      )}

      <NewCarouselModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* NEW TEMPLATE CREATION MODAL */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-default rounded-xl w-full max-w-[500px] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent-blue" />
                Create Design Template
              </h3>
              <button className="text-text-tertiary hover:text-white" onClick={() => setIsNewTemplateModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                  placeholder="e.g. Explain Editorial System"
                  value={newTemplateNameInput}
                  onChange={(e) => setNewTemplateNameInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                  Start From
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-all ${
                      newTemplateStartFromType === 'blank'
                        ? 'border-accent-blue bg-surface-elevated ring-1 ring-blue-500'
                        : 'border-border-default bg-surface hover:bg-surface-hover'
                    }`}
                    onClick={() => {
                      setNewTemplateStartFromType('blank');
                      setNewTemplateSourceId('');
                    }}
                  >
                    <span className="text-xs font-bold text-white">Blank Template</span>
                    <span className="text-[10px] text-text-tertiary">Cover, Content, and CTA master layouts</span>
                  </button>

                  <button
                    type="button"
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-all ${
                      newTemplateStartFromType === 'duplicate'
                        ? 'border-accent-blue bg-surface-elevated ring-1 ring-blue-500'
                        : 'border-border-default bg-surface hover:bg-surface-hover'
                    }`}
                    onClick={() => {
                      setNewTemplateStartFromType('duplicate');
                      if (!newTemplateSourceId) setNewTemplateSourceId(templates[0]?.id || '');
                    }}
                  >
                    <span className="text-xs font-bold text-white">Existing Template</span>
                    <span className="text-[10px] text-text-tertiary">Duplicate layouts from an existing system</span>
                  </button>

                  <button
                    type="button"
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-all ${
                      newTemplateStartFromType === 'carousel'
                        ? 'border-accent-blue bg-surface-elevated ring-1 ring-blue-500'
                        : 'border-border-default bg-surface hover:bg-surface-hover'
                    }`}
                    onClick={() => {
                      setNewTemplateStartFromType('carousel');
                      if (!newTemplateSourceId) setNewTemplateSourceId(documents[0]?.id || '');
                    }}
                  >
                    <span className="text-xs font-bold text-white">Existing Carousel</span>
                    <span className="text-[10px] text-text-tertiary">Convert slides from a carousel project</span>
                  </button>
                </div>
              </div>

              {newTemplateStartFromType === 'duplicate' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Select Source Template
                  </label>
                  <select
                    className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                    value={newTemplateSourceId}
                    onChange={(e) => setNewTemplateSourceId(e.target.value)}
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.layouts.length} layouts)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newTemplateStartFromType === 'carousel' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Select Source Carousel
                  </label>
                  <select
                    className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                    value={newTemplateSourceId}
                    onChange={(e) => setNewTemplateSourceId(e.target.value)}
                  >
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.slides.length} slides)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                className="px-4 py-2 text-xs font-medium rounded bg-surface-elevated text-text-secondary hover:text-white border border-border-default"
                onClick={() => setIsNewTemplateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 text-xs font-semibold rounded bg-accent-blue text-white hover:bg-blue-600 disabled:opacity-50"
                disabled={!newTemplateNameInput.trim()}
                onClick={async () => {
                  const tplId = await createTemplate(
                    newTemplateNameInput.trim() || 'Untitled Template',
                    newTemplateStartFromType,
                    newTemplateSourceId
                  );
                  setIsNewTemplateModalOpen(false);
                  enterTemplateEditMode(tplId);
                }}
              >
                Create Template & Deep Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME TEMPLATE MODAL */}
      {isRenameTemplateModalOpen && renameTemplateIdTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-default rounded-xl w-full max-w-[420px] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-white">Rename Template</h3>
              <button className="text-text-tertiary hover:text-white" onClick={() => setIsRenameTemplateModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                New Template Name
              </label>
              <input
                type="text"
                className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                value={renameTemplateNameInput}
                onChange={(e) => setRenameTemplateNameInput(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-4 py-2 text-xs font-medium rounded bg-surface-elevated text-text-secondary hover:text-white border border-border-default"
                onClick={() => setIsRenameTemplateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 text-xs font-semibold rounded bg-accent-blue text-white hover:bg-blue-600 disabled:opacity-50"
                disabled={!renameTemplateNameInput.trim()}
                onClick={() => {
                  renameTemplate(renameTemplateIdTarget, renameTemplateNameInput.trim());
                  setIsRenameTemplateModalOpen(false);
                }}
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE AS TEMPLATE MODAL */}
      <SaveAsTemplateModal
        isOpen={isSaveAsTemplateModalOpen}
        onClose={() => setIsSaveAsTemplateModalOpen(false)}
        mode={saveAsTemplateModalMode}
      />

      {/* EXPORT CAROUSEL MODAL */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
