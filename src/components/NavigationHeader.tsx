'use client';

import React from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { LayoutGrid, Layers, Sparkles, Settings, ArrowLeft, RotateCcw, RotateCw, Plus, Save, LayoutTemplate, Menu, X } from 'lucide-react';

interface NavigationHeaderProps {
  onOpenCreationModal: () => void;
  onOpenSaveAsTemplateModal?: (mode: 'full_carousel' | 'single_slide') => void;
  onOpenExportModal?: () => void;
}

export function NavigationHeader({ onOpenCreationModal, onOpenSaveAsTemplateModal, onOpenExportModal }: NavigationHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const currentView = useCarouselStore((state) => state.currentView);
  const setView = useCarouselStore((state) => state.setView);
  const documents = useCarouselStore((state) => state.documents);
  const activeDocumentId = useCarouselStore((state) => state.activeDocumentId);
  const undo = useCarouselStore((state) => state.undo);
  const redo = useCarouselStore((state) => state.redo);
  const historyIndex = useCarouselStore((state) => state.historyIndex);
  const history = useCarouselStore((state) => state.history);

  const isTemplateEditorMode = useCarouselStore((state) => state.isTemplateEditorMode);
  const getActiveTemplate = useCarouselStore((state) => state.getActiveTemplate);
  const saveTemplateEdits = useCarouselStore((state) => state.saveTemplateEdits);
  const exitTemplateEditMode = useCarouselStore((state) => state.exitTemplateEditMode);
  const templateDirty = useCarouselStore((state) => state.templateDirty);
  const renameTemplate = useCarouselStore((state) => state.renameTemplate);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeTemplate = getActiveTemplate();
  const isEditor = currentView === 'editor';

  return (
    <header className="h-[50px] bg-surface border-b border-border-default flex items-center justify-between px-3 sm:px-4 fixed top-0 left-0 right-0 z-50">
      {/* Brand Logo & Mobile Menu Toggle */}
      <div className="flex items-center gap-2">
        <button
          className="md:hidden p-1.5 text-text-secondary hover:text-white rounded hover:bg-surface-elevated"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div 
          className="flex items-center gap-1.5 cursor-pointer font-extrabold text-white text-sm sm:text-base tracking-wider"
          onClick={() => {
            if (isTemplateEditorMode) exitTemplateEditMode();
            setView('dashboard');
          }}
        >
          DARA <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-accent-blue border border-blue-500/30 uppercase">STUDIO</span>
        </div>
      </div>

      {/* Global Desktop App Nav */}
      <nav className="hidden md:flex items-center gap-1">
        <button
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            currentView === 'dashboard' ? 'bg-white/10 text-white font-semibold' : 'text-text-secondary hover:text-white hover:bg-surface-hover'
          }`}
          onClick={() => {
            if (isTemplateEditorMode) exitTemplateEditMode();
            setView('dashboard');
          }}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            currentView === 'editor' ? 'bg-white/10 text-white font-semibold' : 'text-text-secondary hover:text-white hover:bg-surface-hover'
          }`}
          onClick={() => setView('editor')}
        >
          <Layers className="w-3.5 h-3.5" />
          Editor
        </button>
        <button
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            currentView === 'templates' || currentView === 'creative-director' ? 'bg-white/10 text-white font-semibold' : 'text-text-secondary hover:text-white hover:bg-surface-hover'
          }`}
          onClick={() => {
            if (isTemplateEditorMode) exitTemplateEditMode();
            setView('templates');
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Brand Kit
        </button>
        <button
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            currentView === 'settings' ? 'bg-white/10 text-white font-semibold' : 'text-text-secondary hover:text-white hover:bg-surface-hover'
          }`}
          onClick={() => {
            if (isTemplateEditorMode) exitTemplateEditMode();
            setView('settings');
          }}
        >
          <Settings className="w-3.5 h-3.5" />
          AI Settings
        </button>
      </nav>

      {/* Compact Editor Header Bar Info when editing */}
      {isEditor && (
        <div className="hidden md:flex items-center gap-2 xl:gap-3 bg-surface-elevated px-2.5 py-1 rounded border border-border-default max-w-[36vw] lg:max-w-[42vw] shrink min-w-0">
          {isTemplateEditorMode ? (
            <>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wider shrink-0">
                TEMPLATE
              </span>
              <input
                type="text"
                className="bg-transparent text-xs font-bold text-white max-w-[120px] xl:max-w-[180px] outline-none border-b border-transparent focus:border-accent-blue truncate"
                value={activeTemplate?.name || ''}
                onChange={(e) => activeTemplate && renameTemplate(activeTemplate.id, e.target.value)}
                placeholder="Template Name..."
              />
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                templateDirty
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-accent-green bg-green-500/10 border-green-500/30'
              }`}>
                {templateDirty ? '● Unsaved' : '✓ Saved'}
              </span>
              <button
                className="px-2 py-0.5 bg-accent-blue hover:bg-blue-600 text-white font-semibold text-[10px] rounded transition-colors shrink-0"
                onClick={() => saveTemplateEdits()}
              >
                Save
              </button>
              <button
                className="hidden xl:inline-block px-2 py-0.5 bg-surface hover:bg-surface-hover border border-border-default text-white font-medium text-[10px] rounded transition-colors shrink-0"
                onClick={async () => {
                  await saveTemplateEdits();
                  exitTemplateEditMode();
                }}
              >
                Exit
              </button>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-text-secondary shrink-0">Editing:</span>
              <span className="text-xs font-semibold text-white max-w-[100px] lg:max-w-[150px] xl:max-w-[200px] truncate" title={activeDoc?.title || 'Untitled Carousel'}>
                {activeDoc?.title || 'Untitled Carousel'}
              </span>
              <span className="text-[9px] font-semibold text-accent-green bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 shrink-0">
                Saved ✓
              </span>
              {onOpenSaveAsTemplateModal && (
                <button
                  className="hidden lg:flex px-2 py-0.5 bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-blue/40 text-accent-blue font-semibold text-[10px] rounded items-center gap-1 transition-colors shrink-0"
                  onClick={() => onOpenSaveAsTemplateModal('full_carousel')}
                >
                  <LayoutTemplate className="w-3 h-3" />
                  Save as Template
                </button>
              )}
            </>
          )}

          <div className="flex items-center gap-0.5 border-l border-border-subtle pl-1.5 shrink-0">
            <button
              className="p-1 rounded hover:bg-surface-hover text-text-secondary disabled:opacity-40"
              disabled={historyIndex < 0}
              onClick={undo}
              title="Undo (Cmd+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 rounded hover:bg-surface-hover text-text-secondary disabled:opacity-40"
              disabled={historyIndex >= history.length - 1}
              onClick={redo}
              title="Redo (Cmd+Shift+Z)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isEditor && onOpenExportModal && (
          <button
            className="h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-md bg-accent-blue text-white flex items-center gap-1.5 hover:bg-blue-600 transition-colors shadow-sm"
            onClick={onOpenExportModal}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Carousel</span>
            <span className="sm:hidden">Export</span>
          </button>
        )}
        <button
          className="h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-md bg-white text-black flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-sm"
          onClick={onOpenCreationModal}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ New Post</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>


      {/* Collapsible Mobile Dropdown Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-[50px] left-0 right-0 bg-surface border-b border-border-default p-4 shadow-2xl flex flex-col gap-2 z-50 animate-in slide-in-from-top-2 duration-150">
          <button
            className={`w-full py-2 px-3 text-xs font-semibold rounded-md flex items-center gap-2 ${
              currentView === 'dashboard' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-white bg-surface-elevated'
            }`}
            onClick={() => {
              if (isTemplateEditorMode) exitTemplateEditMode();
              setView('dashboard');
              setIsMobileMenuOpen(false);
            }}
          >
            <LayoutGrid className="w-4 h-4" />
            Dashboard Projects
          </button>
          <button
            className={`w-full py-2 px-3 text-xs font-semibold rounded-md flex items-center gap-2 ${
              currentView === 'editor' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-white bg-surface-elevated'
            }`}
            onClick={() => {
              setView('editor');
              setIsMobileMenuOpen(false);
            }}
          >
            <Layers className="w-4 h-4" />
            Carousel Studio Editor
          </button>
          <button
            className={`w-full py-2 px-3 text-xs font-semibold rounded-md flex items-center gap-2 ${
              currentView === 'templates' || currentView === 'creative-director' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-white bg-surface-elevated'
            }`}
            onClick={() => {
              if (isTemplateEditorMode) exitTemplateEditMode();
              setView('templates');
              setIsMobileMenuOpen(false);
            }}
          >
            <Sparkles className="w-4 h-4" />
            Brand Kit & Master Templates
          </button>
          <button
            className={`w-full py-2 px-3 text-xs font-semibold rounded-md flex items-center gap-2 ${
              currentView === 'settings' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-white bg-surface-elevated'
            }`}
            onClick={() => {
              if (isTemplateEditorMode) exitTemplateEditMode();
              setView('settings');
              setIsMobileMenuOpen(false);
            }}
          >
            <Settings className="w-4 h-4" />
            AI Pipeline Settings
          </button>
        </div>
      )}
    </header>
  );
}
