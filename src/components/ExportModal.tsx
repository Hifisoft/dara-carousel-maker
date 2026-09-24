'use client';

import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { Download, FileImage, FileText, X, Archive } from 'lucide-react';
import { exportCarousel, ExportFormat } from '../lib/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const documents = useCarouselStore((state) => state.documents);
  const activeDocumentId = useCarouselStore((state) => state.activeDocumentId);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  const [resolution, setResolution] = useState<'1x' | '2x' | '3x'>('2x');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('zip');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!isOpen || !activeDoc) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('Rendering slides...');

    try {
      await exportCarousel(activeDoc, exportFormat, Number(resolution[0]), (completed, total) => {
        setExportStatus(`Rendering slide ${completed} of ${total}...`);
      });
      setExportStatus(null);
      onClose();
    } catch (err: any) {
      setExportStatus(`Export Error: ${err.message || 'Failed to render canvas'}`);
    } finally {
      setIsExporting(false);
    }
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

        {/* Format Selection */}
        <div className="space-y-3">
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
        </div>

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
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
