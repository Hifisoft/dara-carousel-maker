'use client';

import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { MasterLayoutNode, LayerNode } from '../types/schema';
import { X, Save, Layers, CheckCircle2, ChevronRight, LayoutTemplate, Plus } from 'lucide-react';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'full_carousel' | 'single_slide';
}

export function SaveAsTemplateModal({ isOpen, onClose, mode = 'full_carousel' }: SaveAsTemplateModalProps) {
  const documents = useCarouselStore((state) => state.documents);
  const activeDocumentId = useCarouselStore((state) => state.activeDocumentId);
  const activeSlideId = useCarouselStore((state) => state.activeSlideId);
  const templates = useCarouselStore((state) => state.templates);

  const createTemplateFromCarousel = useCarouselStore((state) => state.createTemplateFromCarousel);
  const saveCurrentSlideAsLayout = useCarouselStore((state) => state.saveCurrentSlideAsLayout);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeSlide = activeDoc?.slides.find((s) => s.id === activeSlideId) || activeDoc?.slides[0];

  // Form State
  const [templateName, setTemplateName] = useState(activeDoc?.title ? `${activeDoc.title} Template` : 'My Custom Template');
  const [templateDesc, setTemplateDesc] = useState('Reusable design system converted from carousel');
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>(activeDoc?.slides.map((s) => s.id) || []);
  const [step, setStep] = useState<1 | 2>(1);

  // Single Slide Mode State
  const [targetTemplateId, setTargetTemplateId] = useState<string>(templates[0]?.id || '');
  const [singleLayoutName, setSingleLayoutName] = useState('Custom Layout Alt');
  const [singleLayoutRole, setSingleLayoutRole] = useState<MasterLayoutNode['role']>('content');

  // Layer Slot Override Map: layerId -> 'headline' | 'subtitle' | 'body' | 'cta' | 'hero_image' | 'static' | 'ignore'
  const [layerOverrides, setLayerOverrides] = useState<Record<string, string>>({});

  if (!isOpen || !activeDoc) return null;

  const handleToggleSlide = (slideId: string) => {
    setSelectedSlideIds((prev) =>
      prev.includes(slideId) ? prev.filter((id) => id !== slideId) : [...prev, slideId]
    );
  };

  const handleSetLayerOverride = (layerId: string, role: string) => {
    setLayerOverrides((prev) => ({ ...prev, [layerId]: role }));
  };

  const handleSaveFullCarousel = async () => {
    if (!templateName.trim()) return;
    try {
      await createTemplateFromCarousel(
        activeDoc.id,
        templateName.trim(),
        selectedSlideIds,
        layerOverrides
      );
      onClose();
    } catch (err) {
      console.error('Failed to create template from carousel:', err);
    }
  };

  const handleSaveSingleSlide = async () => {
    if (!activeSlide || !targetTemplateId) return;
    try {
      await saveCurrentSlideAsLayout(
        activeSlide.id,
        targetTemplateId,
        singleLayoutName.trim() || 'Custom Layout',
        singleLayoutRole,
        layerOverrides
      );
      onClose();
    } catch (err) {
      console.error('Failed to save slide as layout:', err);
    }
  };

  // Collect layers from selected slides for confirmation table
  const selectedSlides = activeDoc.slides.filter((s) => selectedSlideIds.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-default rounded-xl w-full max-w-[620px] p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-accent-blue" />
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'full_carousel' ? 'Save Carousel as Design Template' : 'Save Current Slide as Template Layout'}
              </h3>
              <p className="text-xs text-text-secondary">
                {mode === 'full_carousel'
                  ? 'Convert carousel slides into reusable master layouts with semantic slots'
                  : 'Append the active slide design as a new master layout in your template library'}
              </p>
            </div>
          </div>
          <button className="text-text-tertiary hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FULL CAROUSEL CONVERSION FLOW */}
        {mode === 'full_carousel' ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                    placeholder="e.g. Explain Editorial System"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                    placeholder="e.g. High contrast typography and full-bleed photography"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
                    Select Source Slides ({selectedSlideIds.length} of {activeDoc.slides.length} selected)
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {activeDoc.slides.map((slide, idx) => {
                      const isSelected = selectedSlideIds.includes(slide.id);
                      return (
                        <div
                          key={slide.id}
                          className={`p-2.5 rounded-lg border cursor-pointer text-center relative transition-all ${
                            isSelected
                              ? 'border-accent-blue bg-surface-elevated ring-1 ring-blue-500'
                              : 'border-border-default bg-surface/50 opacity-60 hover:opacity-100'
                          }`}
                          onClick={() => handleToggleSlide(slide.id)}
                        >
                          <div className="text-[10px] font-bold text-white mb-1">
                            Slide #{idx + 1}
                          </div>
                          <div className="text-[9px] text-text-tertiary truncate">
                            {(slide.layers[0] as any)?.content || `Slide ${idx + 1}`}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent-blue absolute top-1 right-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: LAYER SLOT MAPPING CONFIRMATION TABLE */
              <div className="space-y-4">
                <div className="text-xs text-text-secondary bg-surface-elevated p-3 rounded-lg border border-border-default">
                  Confirm how layers should be converted into template placeholders. Text copy is converted to editable text slots, images to image slots, and logos/gradients to static master assets.
                </div>

                <div className="space-y-3">
                  {selectedSlides.map((slide, idx) => (
                    <div key={slide.id} className="bg-surface-elevated border border-border-default rounded-lg p-3 space-y-2">
                      <div className="text-xs font-bold text-white flex justify-between items-center pb-1 border-b border-border-subtle">
                        <span>Slide #{idx + 1} ({idx === 0 ? 'Cover' : idx === selectedSlides.length - 1 ? 'CTA' : 'Content'})</span>
                        <span className="text-[10px] text-text-tertiary">{slide.layers.length} layers</span>
                      </div>

                      <div className="space-y-1.5">
                        {slide.layers.map((layer) => {
                          const currentOverride = layerOverrides[layer.id];
                          const inferredRole =
                            currentOverride ||
                            layer.semanticRole ||
                            (layer.type === 'text' ? (layer as any).role || 'body' : layer.type === 'image' ? 'hero_image' : 'static');

                          return (
                            <div key={layer.id} className="flex items-center justify-between gap-3 text-xs bg-surface p-2 rounded border border-border-subtle">
                              <div className="truncate flex-1">
                                <span className="font-semibold text-white block truncate">{layer.name}</span>
                                <span className="text-[10px] text-text-tertiary font-mono">{layer.type} layer</span>
                              </div>

                              <select
                                className="bg-surface-elevated border border-border-default rounded px-2 py-1 text-xs text-white outline-none focus:border-border-focus"
                                value={currentOverride || inferredRole}
                                onChange={(e) => handleSetLayerOverride(layer.id, e.target.value)}
                              >
                                <option value="headline">Headline Slot</option>
                                <option value="subtitle">Subtitle Slot</option>
                                <option value="body">Body Copy Slot</option>
                                <option value="cta">CTA Slot</option>
                                <option value="hero_image">Hero Image Slot</option>
                                <option value="bg_image">Background Image Slot</option>
                                <option value="static">Static Asset (Keep Exact)</option>
                                <option value="ignore">Ignore (Omit Layer)</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* SINGLE SLIDE CONVERSION FLOW */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Target Template
              </label>
              <select
                className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                value={targetTemplateId}
                onChange={(e) => setTargetTemplateId(e.target.value)}
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.layouts.length} layouts)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  New Layout Name
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                  placeholder="e.g. Split Photo Content"
                  value={singleLayoutName}
                  onChange={(e) => setSingleLayoutName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                  Layout Role
                </label>
                <select
                  className="w-full bg-surface-elevated border border-border-default rounded px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
                  value={singleLayoutRole}
                  onChange={(e) => setSingleLayoutRole(e.target.value as any)}
                >
                  <option value="cover">Cover Slide</option>
                  <option value="content">Content Slide</option>
                  <option value="cta">CTA Slide</option>
                  <option value="quote">Quote / Testimonial</option>
                  <option value="statistic">Statistic / Data</option>
                  <option value="comparison">Comparison Grid</option>
                </select>
              </div>
            </div>

            {/* Layer confirmation for single slide */}
            {activeSlide && (
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <label className="block text-xs font-semibold text-text-secondary uppercase">
                  Layer Slot Conversion
                </label>
                {activeSlide.layers.map((layer) => {
                  const currentOverride = layerOverrides[layer.id];
                  const inferredRole =
                    currentOverride ||
                    layer.semanticRole ||
                    (layer.type === 'text' ? (layer as any).role || 'body' : layer.type === 'image' ? 'hero_image' : 'static');

                  return (
                    <div key={layer.id} className="flex items-center justify-between gap-3 text-xs bg-surface-elevated p-2 rounded border border-border-default">
                      <span className="font-medium text-white truncate">{layer.name} ({layer.type})</span>
                      <select
                        className="bg-surface border border-border-default rounded px-2 py-1 text-xs text-white outline-none"
                        value={currentOverride || inferredRole}
                        onChange={(e) => handleSetLayerOverride(layer.id, e.target.value)}
                      >
                        <option value="headline">Headline Slot</option>
                        <option value="subtitle">Subtitle Slot</option>
                        <option value="body">Body Copy Slot</option>
                        <option value="cta">CTA Slot</option>
                        <option value="hero_image">Hero Image Slot</option>
                        <option value="static">Static Asset</option>
                        <option value="ignore">Omit Layer</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex justify-between items-center pt-3 border-t border-border-subtle shrink-0">
          <button
            className="px-4 py-2 text-xs font-medium rounded bg-surface-elevated text-text-secondary hover:text-white border border-border-default"
            onClick={onClose}
          >
            Cancel
          </button>

          {mode === 'full_carousel' ? (
            <div className="flex gap-2">
              {step === 1 ? (
                <button
                  className="px-5 py-2 text-xs font-semibold rounded bg-accent-blue text-white hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50"
                  disabled={!templateName.trim() || selectedSlideIds.length === 0}
                  onClick={() => setStep(2)}
                >
                  Configure Layer Slots
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    className="px-4 py-2 text-xs font-medium rounded bg-surface-elevated text-text-secondary hover:text-white border border-border-default"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    className="px-5 py-2 text-xs font-semibold rounded bg-accent-blue text-white hover:bg-blue-600 flex items-center gap-1.5"
                    onClick={handleSaveFullCarousel}
                  >
                    <Save className="w-4 h-4" />
                    Save Template
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              className="px-5 py-2 text-xs font-semibold rounded bg-accent-blue text-white hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50"
              disabled={!targetTemplateId || !singleLayoutName.trim()}
              onClick={handleSaveSingleSlide}
            >
              <Plus className="w-4 h-4" />
              Save Layout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
