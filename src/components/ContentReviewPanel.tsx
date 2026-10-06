'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { authorisedFetch } from '../lib/cloud';
import { useCarouselStore } from '../store/useCarouselStore';
import type { LayerNode, TextLayerNode } from '../types/schema';

export function ContentReviewPanel() {
  const activeDocumentId = useCarouselStore(state => state.activeDocumentId);
  const document = useCarouselStore(state => state.documents.find(item => item.id === activeDocumentId));
  const settings = useCarouselStore(state => state.settings);
  const [review, setReview] = useState('');
  const [reviewedText, setReviewedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slides = useMemo(() => document?.slides.map((slide, index) => {
    const text = slide.layers.filter((layer: LayerNode): layer is TextLayerNode => layer.type === 'text' && layer.isVisible && Boolean(layer.content.trim()))
      .sort((a, b) => a.y - b.y)
      .map(layer => layer.content.trim());
    return { title: text[0] || `Slide ${index + 1}`, text: text.join('\n') };
  }) || [], [document]);
  const currentText = JSON.stringify(slides);
  const hasContent = slides.some(slide => slide.text);

  useEffect(() => { setReview(''); setReviewedText(''); setError(''); }, [activeDocumentId]);

  const runReview = async () => {
    if (!hasContent || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await authorisedFetch('/api/ai/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, model: settings.routing.review, instructions: settings.instructions.review }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not review this carousel.');
      setReview(result.review);
      setReviewedText(currentText);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not review this carousel.');
    } finally {
      setLoading(false);
    }
  };

  return <section className="content-review-panel" aria-label="Content review">
    <div className="content-review-heading"><ClipboardCheck size={16} /><h3>Content review</h3></div>
    <p>Pressure-test every slide for clarity, claim strength, and likely audience reactions.</p>
    <button className="primary-button" type="button" onClick={runReview} disabled={!hasContent || loading}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
      {loading ? 'Reviewing...' : review ? 'Review again' : 'Review carousel'}
    </button>
    {!hasContent && <p role="status">Add text to a slide before reviewing.</p>}
    {error && <p className="content-review-error" role="alert">{error}</p>}
    {review && <div className="content-review-result">
      {reviewedText !== currentText && <p className="content-review-stale">Slides changed since this review. Run it again for current feedback.</p>}
      <p className="content-review-disclaimer">AI critique only. External claims have not been independently verified.</p>
      <div className="content-review-report" aria-label="Review report">{review}</div>
    </div>}
  </section>;
}
