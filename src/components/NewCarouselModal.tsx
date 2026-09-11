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
  const [templateId, setTemplateId] = useState(activeTemplateId || 'modern-minimalist');
  const [inputMode, setInputMode] = useState<'prompt' | 'url' | 'notes'>('prompt');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepText, setStepText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsGenerating(true);
    setStepText('✓ Understanding topic & target audience...');

    setTimeout(() => {
      setStepText('✓ Researching domain insights...');
      setTimeout(() => {
        setStepText('● Building carousel story arc...');
        setTimeout(async () => {
          await createDocument(prompt || 'Untitled Carousel', prompt, slideCount, templateId);
          setIsGenerating(false);
          onClose();
        }, 600);
      }, 600);
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-default rounded-xl w-full max-w-[540px] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-purple" />
            What do you want to create?
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Turn an idea, article link, or markdown notes into a professional social media carousel.
        </p>

        {/* Input Mode Selector */}
        <div className="flex gap-2 mb-3">
          <button
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              inputMode === 'prompt' ? 'bg-accent-blue text-white' : 'bg-surface-elevated text-text-secondary hover:text-white'
            }`}
            onClick={() => setInputMode('prompt')}
          >
            Topic Prompt
          </button>
          <button
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              inputMode === 'url' ? 'bg-accent-blue text-white' : 'bg-surface-elevated text-text-secondary hover:text-white'
            }`}
            onClick={() => setInputMode('url')}
          >
            Article URL
          </button>
          <button
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              inputMode === 'notes' ? 'bg-accent-blue text-white' : 'bg-surface-elevated text-text-secondary hover:text-white'
            }`}
            onClick={() => setInputMode('notes')}
          >
            Markdown Notes
          </button>
        </div>

        {/* Prompt Input */}
        <div className="mb-4">
          <textarea
            className="w-full bg-surface-elevated border border-border-default rounded-md p-3 text-xs text-white placeholder-text-tertiary focus:border-border-focus outline-none resize-none"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              inputMode === 'url'
                ? 'Paste article or blog post URL (e.g. https://techcrunch.com/article)...'
                : inputMode === 'notes'
                ? 'Paste markdown notes or raw draft content...'
                : 'Enter topic or concept (e.g. 5 actionable steps to scale a SaaS startup in 2026)...'
            }
          />
        </div>

        {/* Slide Count & Template Selection */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Target Slides
            </label>
            <select
              className="w-full bg-surface-elevated border border-border-default rounded-md px-3 py-2 text-xs text-white outline-none focus:border-border-focus"
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
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
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pipeline Step Animation Box */}
        {isGenerating && (
          <div className="mb-4 p-3 bg-black border border-border-default rounded-md flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />
            <span className="text-xs font-semibold text-accent-blue">{stepText}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-xs font-medium rounded bg-surface-elevated text-text-secondary hover:text-white border border-border-default"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 text-xs font-semibold rounded bg-gradient-to-r from-purple-600 to-accent-blue text-white hover:opacity-90 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isGenerating || !prompt.trim()}
          >
            Create Carousel
          </button>
        </div>
      </div>
    </div>
  );
}
