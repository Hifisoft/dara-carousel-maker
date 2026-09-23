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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-elevated border border-border-default rounded-xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-accent-blue" />
            <h3 className="text-base font-bold text-white">Export Carousel Package</h3>
          </div>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-white rounded hover:bg-surface">
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
            >
              <FileText className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-bold">PDF</span>
              <span className="text-[10px] text-text-tertiary">Multi-page</span>
            </button>
          </div>
        </div>

        {/* Resolution Quality Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Resolution Quality</label>
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
              >
                <span>@{res}</span>
                <span className="text-[9px] font-normal opacity-70">
                  {res === '1x' ? '1080x1440' : res === '2x' ? '2160x2880' : '3240x4320'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-tertiary">
            <strong>@2x (2160x2880px)</strong> is recommended for sharp mobile rendering.
          </p>
        </div>

        {/* Export Status / Progress */}
        {exportStatus && (
          <div className="p-3 bg-surface rounded border border-border-default text-xs font-medium text-accent-blue flex items-center gap-2">
            <Download className="w-4 h-4 text-accent-blue" />
            <span>{exportStatus}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            className="flex-1 py-2.5 bg-surface hover:bg-surface-hover border border-border-default text-xs font-bold text-white rounded-lg transition-colors"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2.5 bg-accent-blue hover:bg-blue-600 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Download Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
