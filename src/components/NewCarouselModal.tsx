'use client';

import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { X, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

interface NewCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  '✦ Understanding topic & audience...',
  '✦ Building narrative arc...',
  '✦ Writing slide copy with AI...',
  '✦ Applying template layout...',
  '✦ Finalising carousel...',
];

export function NewCarouselModal({ isOpen, onClose }: NewCarouselModalProps) {
  const createDocument = useCarouselStore((state) => state.createDocument);
  const templates = useCarouselStore((state) => state.templates);
  const activeTemplateId = useCarouselStore((state) => state.activeTemplateId);

  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [templateId, setTemplateId] = useState(activeTemplateId || templates[0]?.id || '');
  const [inputMode, setInputMode] = useState<'prompt' | 'url' | 'notes'>('prompt');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const advanceStep = (step: number) => {
    setCurrentStep(step);
    setDoneSteps(prev => [...prev, step - 1].filter(s => s >= 0));
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError('');
    setDoneSteps([]);
    setCurrentStep(0);

    try {
      // Step 1 — understanding topic
      advanceStep(0);
      await delay(400);

      // Step 2 — narrative arc
      advanceStep(1);
      await delay(400);

      // Step 3 — AI copy generation (real network call)
      advanceStep(2);
      const aiCopy = await fetchAICopy(prompt, slideCount, templateId);

      // Step 4 — applying template
      advanceStep(3);
      await delay(300);

      // Step 5 — finalising
      advanceStep(4);
      await createDocument(prompt, prompt, slideCount, templateId, aiCopy);
      setDoneSteps([0, 1, 2, 3, 4]);

      await delay(300);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
      setCurrentStep(0);
      setDoneSteps([]);
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
          Turn an idea, article link, or notes into a professional carousel — AI writes the copy using your template.
        </p>

        {/* Input Mode Selector */}
        <div className="flex gap-2 mb-3">
          {(['prompt', 'url', 'notes'] as const).map(mode => (
            <button
              key={mode}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${
                inputMode === mode ? 'bg-accent-blue text-white' : 'bg-surface-elevated text-text-secondary hover:text-white'
              }`}
              onClick={() => setInputMode(mode)}
            >
              {mode === 'prompt' ? 'Topic Prompt' : mode === 'url' ? 'Article URL' : 'Markdown Notes'}
            </button>
          ))}
        </div>

        {/* Prompt Input */}
        <div className="mb-4">
          <textarea
            className="w-full bg-surface-elevated border border-border-default rounded-md p-3 text-xs text-white placeholder-text-tertiary focus:border-border-focus outline-none resize-none"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder={
              inputMode === 'url'
                ? 'Paste article or blog post URL...'
                : inputMode === 'notes'
                ? 'Paste markdown notes or draft content...'
                : 'Enter topic (e.g. "5 habits that double your productivity")'
            }
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

        {/* AI Progress Steps */}
        {isGenerating && (
          <div className="mb-4 p-3 bg-black border border-border-default rounded-md space-y-2">
            {STEPS.map((step, i) => {
              const isDone = doneSteps.includes(i);
              const isActive = currentStep === i;
              return (
                <div key={i} className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
                  isDone ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-30'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 text-accent-blue animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-border-default shrink-0" />
                  )}
                  <span className={isDone ? 'text-green-400' : isActive ? 'text-accent-blue font-semibold' : 'text-text-secondary'}>
                    {step}
                  </span>
                </div>
              );
            })}
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
            className="px-5 py-2 text-xs font-semibold rounded bg-gradient-to-r from-purple-600 to-accent-blue text-white hover:opacity-90 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? 'Creating...' : 'Create Carousel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function fetchAICopy(topic: string, slideCount: number, templateId: string) {
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
  if (!res.ok) throw new Error(`AI pipeline failed (${res.status})`);
  return res.json();
}
