'use client';

import { useRef, useState } from 'react';
import { Link2, Loader2, Upload, X } from 'lucide-react';
import { useCarouselStore } from '../store/useCarouselStore';

export function InstagramImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const importCarousel = useCarouselStore(state => state.importInstagramCarousel);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/instagram/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not import this post.');
      await importCarousel(result.sourceUrl, result.images, result.caption);
      setUrl('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import this post.');
    } finally {
      setLoading(false);
    }
  };

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoading(true);
    setError('');
    try {
      const selected = Array.from(files);
      if (selected.length > 20 || selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)) {
        throw new Error('Choose up to 20 JPG, PNG, or WebP images under 8 MB each.');
      }
      const images = await Promise.all(selected.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
        reader.readAsDataURL(file);
      })));
      await importCarousel('', images);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import these images.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return <div className="studio-dialog-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="studio-dialog instagram-dialog" role="dialog" aria-modal="true" aria-labelledby="instagram-import-title" onKeyDown={event => { if (event.key === 'Escape' && !loading) onClose(); }}>
      <div className="dialog-heading">
        <h2 id="instagram-import-title">Import Instagram carousel</h2>
        <button className="icon-button" aria-label="Close import" onClick={onClose} disabled={loading}><X size={18} /></button>
      </div>
      <label htmlFor="instagram-url">Post URL</label>
      <input id="instagram-url" type="url" autoFocus value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.instagram.com/p/.../" disabled={loading} />
      <p>Imports image slides from a post accessible to your connected Instagram professional account. Each image becomes an editable image layer in a new carousel.</p>
      <div className="instagram-upload-row">
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={event => void importFiles(event.target.files)} />
        <button className="secondary-button" onClick={() => fileInputRef.current?.click()} disabled={loading}><Upload size={14} /> Upload slide images instead</button>
      </div>
      {error && <div className="operation-error" role="alert">{error}</div>}
      <div className="dialog-actions">
        <button className="cancel-action" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="primary-button" onClick={handleImport} disabled={loading || !url.trim()}>{loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}{loading ? 'Importing...' : 'Import post'}</button>
      </div>
    </div>
  </div>;
}
