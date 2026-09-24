'use client';

import React from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { LayoutGrid, Layers, Settings2, ChevronLeft, RotateCcw, RotateCw, Plus, Download, LayoutTemplate, Menu, X, Check, Save } from 'lucide-react';

interface NavigationHeaderProps {
  onOpenCreationModal: () => void;
  onOpenSaveAsTemplateModal?: (mode: 'full_carousel' | 'single_slide') => void;
  onOpenExportModal?: () => void;
}

export function NavigationHeader({ onOpenCreationModal, onOpenSaveAsTemplateModal, onOpenExportModal }: NavigationHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const state = useCarouselStore();
  const activeDoc = state.documents.find(doc => doc.id === state.activeDocumentId);
  const template = state.getActiveTemplate();
  const editing = state.currentView === 'editor';
  const navigate = (view: typeof state.currentView) => {
    if (state.isTemplateEditorMode) state.exitTemplateEditMode();
    state.setView(view);
    setMenuOpen(false);
  };
  const items = [
    { view: 'dashboard' as const, label: 'Carousels', icon: LayoutGrid },
    { view: 'templates' as const, label: 'Brand Kit', icon: LayoutTemplate },
    { view: 'settings' as const, label: 'Settings', icon: Settings2 },
  ];

  return (
    <header className={`studio-header ${editing ? 'is-editing' : ''}`}>
      <div className="header-leading">
        {editing ? (
          <button className="library-back" onClick={() => navigate('dashboard')} title="Back to carousels">
            <ChevronLeft size={19} /><span>Carousels</span>
          </button>
        ) : (
          <button className="studio-wordmark" onClick={() => navigate('dashboard')} aria-label="DARA Studio home">
            <span className="brand-symbol"><Layers size={19} strokeWidth={1.7} /></span>
            <span>DARA <span className="wordmark-studio">Studio</span></span>
          </button>
        )}
        {!editing && <span className="workspace-label">Personal workspace</span>}
      </div>

      {editing ? (
        <div className="document-heading">
          {state.isTemplateEditorMode ? (
            <input aria-label="Template name" value={template?.name || ''} onChange={event => template && state.renameTemplate(template.id, event.target.value)} />
          ) : (
            <strong title={activeDoc?.title}>{activeDoc?.title || 'Untitled carousel'}</strong>
          )}
          <span className="document-subtitle">
            {state.isTemplateEditorMode ? 'Template' : `${activeDoc?.slides.length || 0} slides`}
            <span className="subtitle-dot" />
            {state.isTemplateEditorMode && state.templateDirty ? 'Unsaved changes' : 'Saved on this device'}
          </span>
        </div>
      ) : (
        <nav className="studio-navigation" aria-label="Workspace">
          {items.map(({ view, label, icon: Icon }) => (
            <button key={view} className={state.currentView === view ? 'selected' : ''} onClick={() => navigate(view)} aria-current={state.currentView === view ? 'page' : undefined}>
              <Icon size={16} /><span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="header-actions">
        {editing && (
          <>
            <div className="history-controls">
              <button className="icon-button" onClick={state.undo} disabled={state.historyIndex < 0} title="Undo (Cmd+Z)" aria-label="Undo"><RotateCcw size={17} /></button>
              <button className="icon-button" onClick={state.redo} disabled={state.historyIndex >= state.history.length - 1} title="Redo (Cmd+Shift+Z)" aria-label="Redo"><RotateCw size={17} /></button>
            </div>
            {state.isTemplateEditorMode ? (
              <button className="icon-button save-template-action" onClick={() => state.saveTemplateEdits()} title="Save template" aria-label="Save template"><Save size={18} /></button>
            ) : onOpenSaveAsTemplateModal && (
              <button className="icon-button save-template-action" onClick={() => onOpenSaveAsTemplateModal('full_carousel')} title="Save as template" aria-label="Save as template"><LayoutTemplate size={18} /></button>
            )}
            {onOpenExportModal && <button className="primary-button" onClick={onOpenExportModal}><Download size={16} /><span>Export</span></button>}
          </>
        )}
        <button className={editing ? 'icon-button new-document-action' : 'primary-button'} onClick={onOpenCreationModal} title="New carousel" aria-label="New carousel">
          <Plus size={18} />{!editing && <span>New carousel</span>}
        </button>
        {!editing && <button className="icon-button mobile-navigation-toggle" onClick={() => setMenuOpen(!menuOpen)} title="Workspace menu" aria-label="Workspace menu" aria-expanded={menuOpen}>
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>}
      </div>
      {menuOpen && <nav className="mobile-navigation" aria-label="Workspace menu">
        {items.map(({ view, label, icon: Icon }) => <button key={view} onClick={() => navigate(view)}><Icon size={17} />{label}{state.currentView === view && <Check size={15} className="ml-auto" />}</button>)}
      </nav>}
    </header>
  );
}
