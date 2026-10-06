'use client';

import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { Download, FileImage, FileText, X, Archive } from 'lucide-react';
import { exportBrandBatch, exportCarousel, ExportFormat } from '../lib/export';
import { hasBrandLogoLayers } from '../lib/brandResolution';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const documents = useCarouselStore((state) => state.documents);
  const activeDocumentId = useCarouselStore((state) => state.activeDocumentId);
  const brandProfiles = useCarouselStore(state => state.brandProfiles);
  const previewBrandId = useCarouselStore(state => state.previewBrandId);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  const [resolution, setResolution] = useState<'1x' | '2x' | '3x'>('2x');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('zip');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<'standard' | 'brand-batch'>('standard');
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);

  if (!isOpen || !activeDoc) return null;

  const selectedBrands = brandProfiles.filter(profile => selectedBrandIds.includes(profile.id));
  const requiresBrandLogo = activeDoc.slides.some(hasBrandLogoLayers);
  const missingLogoBrand = requiresBrandLogo ? selectedBrands.find(profile => !profile.assets.logoPrimary?.url) : undefined;
  const previewBrand = brandProfiles.find(profile => profile.id === previewBrandId) || null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('Rendering slides...');

    try {
      if (requiresBrandLogo && (!previewBrand || !previewBrand.assets.logoPrimary?.url)) {
        throw new Error('Choose a Brand Profile with a Primary Logo in the editor header before using Standard Export.');
      }
      await exportCarousel(activeDoc, exportFormat, Number(resolution[0]), (completed, total) => {
        setExportStatus(`Rendering slide ${completed} of ${total}...`);
      }, previewBrand);
      setExportStatus(null);
      onClose();
    } catch (err: any) {
      setExportStatus(`Export Error: ${err.message || 'Failed to render canvas'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBrandBatch = async () => {
    if (!selectedBrands.length || missingLogoBrand) return;
    setIsExporting(true);
    try {
      await exportBrandBatch(activeDoc, selectedBrands, Number(resolution[0]), progress => {
        setExportStatus(`Brand ${progress.brandIndex} of ${progress.brandCount}: ${progress.brandName} · Slide ${progress.slideIndex} of ${progress.slideCount} · ${progress.completed} / ${progress.total} images`);
      });
      setExportStatus(null);
      onClose();
    } catch (err) {
      setExportStatus(`Export Error: ${err instanceof Error ? err.message : 'Could not render this batch.'}`);
    } finally { setIsExporting(false); }
  };

  return (
    <div className="studio-dialog-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="studio-dialog max-w-md w-full p-6 space-y-6" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2">
            <h3 id="export-title" className="text-xl text-white">Export carousel</h3>
          </div>
          <button onClick={onClose} disabled={isExporting} className="icon-button" aria-label="Close export" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="export-modes" role="tablist" aria-label="Export mode">
          <button role="tab" aria-selected={mode === 'standard'} onClick={() => { setMode('standard'); setExportStatus(null); }}>Standard Export</button>
          <button role="tab" aria-selected={mode === 'brand-batch'} onClick={() => { setMode('brand-batch'); setExportStatus(null); }}>Brand Batch</button>
        </div>

        {mode === 'brand-batch' && <section className="brand-batch-list" aria-label="Brand profiles for export">
          <p>Export this carousel for:</p>
          {brandProfiles.length === 0 ? <p className="brand-batch-empty">Create Brand Profiles in Brand Kit to make a batch.</p> : brandProfiles.map(profile => {
            const checked = selectedBrandIds.includes(profile.id);
            const missing = requiresBrandLogo && !profile.assets.logoPrimary?.url;
            return <label className="brand-batch-option" key={profile.id}>
              <input type="checkbox" checked={checked} onChange={event => setSelectedBrandIds(current => event.target.checked
                ? [...current, profile.id] : current.filter(id => id !== profile.id))} disabled={isExporting} />
              <span>{profile.name}</span>
              {missing ? <small className="is-missing">Missing Primary Logo</small> : profile.assets.logoPrimary && <img src={profile.assets.logoPrimary.url} alt="" />}
            </label>;
          })}
          {requiresBrandLogo && <p className="brand-batch-note">This carousel has Brand Logo layers. Every selected brand needs a Primary Logo.</p>}
          <div className="brand-batch-count">
            <strong>{selectedBrands.length} brands × {activeDoc.slides.length} slides</strong>
            <span>{selectedBrands.length * activeDoc.slides.length} images</span>
          </div>
        </section>}

        {/* Format Selection */}
        {mode === 'standard' && <div className="space-y-3">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Export Format</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              className={`p-3 rounded border flex flex-col items-center gap-1.5 transition-colors ${
                exportFormat === 'png'
                  ? 'bg-accent-blue/15 border-accent-blue text-white'
                  : 'bg-surface border-border-default text-text-secondary hover:border-text-secondary'
              }`}
              onClick={() => setExportFormat('png')}
              aria-pressed={exportFormat === 'png'}
            >
              <FileImage className="w-5 h-5 text-accent-blue" />
              <span className="text-xs font-bold">PNG</span>
              <span className="text-[10px] text-text-tertiary">Separate slides</span>
            </button>
            <button
              className={`p-3 rounded border flex flex-col items-center gap-1.5 transition-colors ${
                exportFormat === 'zip'
                  ? 'bg-accent-blue/15 border-accent-blue text-white'
                  : 'bg-surface border-border-default text-text-secondary hover:border-text-secondary'
              }`}
              onClick={() => setExportFormat('zip')}
              aria-pressed={exportFormat === 'zip'}
            >
              <Archive className="w-5 h-5 text-accent-green" />
              <span className="text-xs font-bold">ZIP</span>
              <span className="text-[10px] text-text-tertiary">All PNG slides</span>
            </button>

            <button
              className={`p-3 rounded border flex flex-col items-center gap-1.5 transition-colors ${
                exportFormat === 'pdf'
                  ? 'bg-accent-blue/15 border-accent-blue text-white'
                  : 'bg-surface border-border-default text-text-secondary hover:border-text-secondary'
              }`}
              onClick={() => setExportFormat('pdf')}
              aria-pressed={exportFormat === 'pdf'}
            >
              <FileText className="w-5 h-5 text-text-secondary" />
              <span className="text-xs font-bold">PDF</span>
              <span className="text-[10px] text-text-tertiary">Multi-page</span>
            </button>
          </div>
        </div>}

        {/* Resolution Quality Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-text-secondary">Resolution</label>
          <div className="grid grid-cols-3 gap-2">
            {(['1x', '2x', '3x'] as const).map((res) => (
              <button
                key={res}
                className={`py-2 px-3 rounded border text-xs font-bold transition-colors flex flex-col items-center ${
                  resolution === res
                    ? 'bg-white text-black border-white'
                    : 'bg-surface border-border-default text-text-secondary hover:border-text-secondary'
                }`}
                onClick={() => setResolution(res)}
                aria-pressed={resolution === res}
              >
                <span>{res}</span>
                <span className="text-[9px] font-normal opacity-70">
                  {res === '1x' ? '1080x1440' : res === '2x' ? '2160x2880' : '3240x4320'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-tertiary">
          {activeDoc.slides.length} slides · {Number(resolution[0]) * 1080} × {Number(resolution[0]) * 1440} px
          </p>
        </div>

        {/* Export Status / Progress */}
        {exportStatus && (
          <div role="status" className="p-3 bg-surface rounded border border-border-default text-xs font-medium text-accent-blue flex items-center gap-2">
            <Download className="w-4 h-4 text-accent-blue" />
            <span>{exportStatus}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            className="secondary-button flex-1"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            className="primary-button flex-1"
            onClick={mode === 'standard' ? handleExport : handleBrandBatch}
            disabled={isExporting || (mode === 'standard' ? requiresBrandLogo && (!previewBrand || !previewBrand.assets.logoPrimary?.url) : !selectedBrands.length || !!missingLogoBrand)}
          >
            {mode === 'brand-batch' ? <Archive className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Exporting...' : mode === 'brand-batch' ? `Export ${selectedBrands.length * activeDoc.slides.length} Images` : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
