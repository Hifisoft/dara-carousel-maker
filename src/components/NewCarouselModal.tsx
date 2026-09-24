'use client';

import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { SlidePreview } from './SlidePreview';

interface NewCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCarouselModal({ isOpen, onClose }: NewCarouselModalProps) {
  const createDocument = useCarouselStore(state => state.createDocument);
  const templates = useCarouselStore(state => state.templates);
  const activeTemplateId = useCarouselStore(state => state.activeTemplateId);
  const settings = useCarouselStore(state => state.settings);
  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [templateId, setTemplateId] = useState(activeTemplateId || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [operation, setOperation] = useState<'ai' | 'draft'>('ai');
  const [error, setError] = useState('');
  const template = templates.find(item => item.id === templateId) || templates.find(item => item.isDefault) || templates[0];
  const layout = template?.layouts.find(item => item.role === 'cover') || template?.layouts[0];
  const preview = layout && {
    ...layout,
    layers: layout.layers.map(layer => layer.type === 'text' && (layer.semanticRole === 'headline' || layer.role === 'headline')
      ? { ...layer, content: prompt.trim() || 'Your next great story.' } : layer),
  };

  if (!isOpen) return null;

  const handleSubmit = async (mode: 'ai' | 'draft') => {
    if (!prompt.trim() || !template) return;
    setOperation(mode);
    setIsGenerating(true);
    setError('');
    try {
      let aiCopy;
      if (mode === 'ai') {
        const response = await fetch('/api/ai/pipeline', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), topic: prompt.trim(), slideCount, templateId: template.id, model: settings.routing.copy, instructions: settings.instructions.copy }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not generate this carousel. Please try again.');
        aiCopy = data;
      }
      await createDocument(aiCopy?.title || prompt.trim(), prompt.trim(), slideCount, template.id, aiCopy);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="studio-dialog-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="studio-dialog creation-dialog" role="dialog" aria-modal="true" aria-labelledby="new-carousel-title"
        onKeyDown={event => {
          if (event.key === 'Escape' && !isGenerating) onClose();
          if (event.key === 'Tab') {
            const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), select:not(:disabled)'));
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <div className="dialog-heading">
          <h2 id="new-carousel-title">New carousel</h2>
          <button className="icon-button" onClick={onClose} disabled={isGenerating} aria-label="Close new carousel" title="Close"><X size={18} /></button>
        </div>
        <div className="creation-layout">
          <div className="creation-fields">
            <label htmlFor="carousel-topic">What is your story about?</label>
            <textarea id="carousel-topic" rows={4} autoFocus value={prompt} onChange={event => setPrompt(event.target.value)}
              disabled={isGenerating} placeholder="An idea worth sharing..." />
            <div className="creation-selectors">
              <div>
                <label htmlFor="carousel-count">Slides</label>
                <select id="carousel-count" value={slideCount} onChange={event => setSlideCount(Number(event.target.value))} disabled={isGenerating}>
                  {[3, 5, 7, 10].map(count => <option key={count} value={count}>{count} slides</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="carousel-template">Template</label>
                <select id="carousel-template" value={template?.id || ''} onChange={event => setTemplateId(event.target.value)} disabled={isGenerating}>
                  {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          {preview && <div className="creation-preview"><SlidePreview slide={preview} /><p>1080 × 1440 px</p></div>}
        </div>
        {isGenerating && <div className="operation-message" role="status"><Loader2 size={15} className="animate-spin" />{operation === 'ai' ? 'Writing your carousel...' : 'Creating your draft...'}</div>}
        {error && <div className="operation-error" role="alert">{error}</div>}
        <div className="dialog-actions">
          <button className="cancel-action" onClick={onClose} disabled={isGenerating}>Cancel</button>
          <button className="secondary-button" onClick={() => handleSubmit('draft')} disabled={isGenerating || !prompt.trim() || !template}>Create draft</button>
          <button className="primary-button" onClick={() => handleSubmit('ai')} disabled={isGenerating || !prompt.trim() || !template}><Sparkles size={14} />{isGenerating && operation === 'ai' ? 'Writing...' : 'Generate with AI'}</button>
        </div>
      </div>
    </div>
  );
}
