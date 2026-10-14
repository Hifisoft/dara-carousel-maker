'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { authorisedFetch } from '../lib/cloud';
import { useCarouselStore } from '../store/useCarouselStore';
import type { LayerNode, TextLayerNode } from '../types/schema';

type ReviewSource = { title: string; url: string };

export function ContentReviewPanel() {
  const activeDocumentId = useCarouselStore(state => state.activeDocumentId);
  const document = useCarouselStore(state => state.documents.find(item => item.id === activeDocumentId));
  const settings = useCarouselStore(state => state.settings);
  const [review, setReview] = useState('');
  const [reviewSources, setReviewSources] = useState<ReviewSource[]>([]);
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

  useEffect(() => { setReview(''); setReviewSources([]); setReviewedText(''); setError(''); }, [activeDocumentId]);

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
      setReviewSources(Array.isArray(result.sources) ? result.sources : []);
      setReviewedText(currentText);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not review this carousel.');
    } finally {
      setLoading(false);
    }
  };

  return <section className="content-review-panel" aria-label="Content review">
    <div className="content-review-heading"><ClipboardCheck size={16} /><h3>Content review</h3></div>
    <p>Check every slide against live web sources, then pressure-test clarity and audience response.</p>
    <button className="primary-button" type="button" onClick={runReview} disabled={!hasContent || loading}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
      {loading ? 'Reviewing...' : review ? 'Review again' : 'Review carousel'}
    </button>
    {!hasContent && <p role="status">Add text to a slide before reviewing.</p>}
    {!!document?.researchSources?.length && <div className="content-review-sources"><strong>Research sources used for this carousel</strong><ul>{document.researchSources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a></li>)}</ul></div>}
    {error && <p className="content-review-error" role="alert">{error}</p>}
    {review && <div className="content-review-result">
      {reviewedText !== currentText && <p className="content-review-stale">Slides changed since this review. Run it again for current feedback.</p>}
      <p className="content-review-disclaimer">AI verification can be incomplete. Open the cited sources and confirm important claims yourself.</p>
      <div className="content-review-report" aria-label="Review report">{renderCitedReview(review)}</div>
      {!!reviewSources.length && <div className="content-review-sources"><strong>Sources checked</strong><ul>{reviewSources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a></li>)}</ul></div>}
    </div>}
  </section>;
}

function renderCitedReview(text: string) {
  return text.split(/(\[[^\]]+\]\(https:\/\/[^)\s]+\))/g).map((part, index) => {
    const citation = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (!citation) return part;
    try {
      const url = new URL(citation[2]);
      if (url.protocol !== 'https:') return part;
      return <a key={`citation-${index}`} href={url.href} target="_blank" rel="noreferrer">{citation[1]}</a>;
    } catch { return part; }
  });
}
