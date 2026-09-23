'use client';

import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface NewCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCarouselModal({ isOpen, onClose }: NewCarouselModalProps) {
  const createDocument = useCarouselStore((state) => state.createDocument);
  const templates = useCarouselStore((state) => state.templates);
  const activeTemplateId = useCarouselStore((state) => state.activeTemplateId);

  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [templateId, setTemplateId] = useState(activeTemplateId || templates[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [operation, setOperation] = useState<'ai' | 'draft'>('ai');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (mode: 'ai' | 'draft') => {
    if (!prompt.trim()) return;
    setOperation(mode);
    setIsGenerating(true);
    setError('');

    try {
      const aiCopy = mode === 'ai' ? await fetchAICopy(prompt, slideCount, templateId) : undefined;
      await createDocument(aiCopy?.title || prompt, prompt, slideCount, templateId, aiCopy);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-default rounded-xl w-full max-w-[540px] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-purple" />
            What do you want to create?
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white p-1" disabled={isGenerating}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Start with a topic and a template. Generate written slides with AI, or make an editable draft yourself.
        </p>

        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Topic</label>
          <textarea
            className="w-full bg-surface-elevated border border-border-default rounded-md p-3 text-xs text-white placeholder-text-tertiary focus:border-border-focus outline-none resize-none"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder={'e.g. Countries that no longer exist'}
          />
        </div>

        {/* Slide Count & Template */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Target Slides
            </label>
            <select
              className="w-full bg-surface-elevated border border-border-default rounded-md px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              disabled={isGenerating}
            >
              <option value={3}>3 Slides</option>
              <option value={5}>5 Slides</option>
              <option value={7}>7 Slides</option>
              <option value={10}>10 Slides</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Template Style
            </label>
            <select
              className="w-full bg-surface-elevated border border-border-default rounded-md px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={isGenerating}
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isGenerating && (
          <div className="mb-4 p-3 bg-black border border-border-default rounded-md flex items-center gap-2 text-xs text-accent-blue">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {operation === 'ai' ? 'Writing your carousel...' : 'Creating your draft...'}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-md text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-xs font-medium rounded bg-surface-elevated text-text-secondary hover:text-white border border-border-default"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-xs font-semibold rounded border border-border-default bg-surface-elevated text-white hover:bg-surface-hover disabled:opacity-50"
            onClick={() => handleSubmit('draft')}
            disabled={isGenerating || !prompt.trim()}
          >
            Create draft
          </button>
          <button
            className="px-5 py-2 text-xs font-semibold rounded bg-accent-blue text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => handleSubmit('ai')}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating && operation === 'ai' ? 'Writing...' : 'Generate with AI'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchAICopy(topic: string, slideCount: number, templateId: string) {
  try {
    const res = await fetch('/api/ai/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        topic,
        slideCount,
        templateId,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `AI generation returned status ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Failed to connect to AI service. Please verify dev server is running.');
  }
}
