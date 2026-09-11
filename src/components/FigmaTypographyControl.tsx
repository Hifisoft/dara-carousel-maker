'use client';

import React, { useState } from 'react';
import { TextLayerNode, StyleRun } from '../types/schema';
import { POPULAR_FONTS, getFontVariants, loadFont } from '../lib/fontLoader';
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowUpToLine, ArrowDownToLine, Minus, ChevronDown, Search, Check, Type
} from 'lucide-react';

interface FigmaTypographyControlProps {
  layer: TextLayerNode;
  onUpdate: (patch: Partial<TextLayerNode>) => void;
}

export function FigmaTypographyControl({ layer, onUpdate }: FigmaTypographyControlProps) {
  const [fontSearch, setFontSearch] = useState('');
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Style Run Creator State
  const [styleRunText, setStyleRunText] = useState('');
  const [styleRunColor, setStyleRunColor] = useState('#26BFFF');

  const filteredFonts = POPULAR_FONTS.filter((f) =>
    f.family.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const fontVariants = getFontVariants(layer.fontFamily);

  const currentLineHeightValue = layer.lineHeightConfig?.value ?? Math.round((layer.lineHeight || 1.2) * 100);
  const currentLineHeightUnit = layer.lineHeightConfig?.unit ?? '%';

  const currentLetterSpacingValue = layer.letterSpacingConfig?.value ?? (layer.letterSpacing || 0);
  const currentLetterSpacingUnit = layer.letterSpacingConfig?.unit ?? '%';

  const handleFontSelect = async (family: string) => {
    setIsFontDropdownOpen(false);
    await loadFont(family, layer.fontWeight, layer.fontStyle);
    onUpdate({ fontFamily: family });
  };

  const handleLineHeightChange = (val: number, unit: 'Auto' | 'px' | '%') => {
    const mult = unit === '%' ? val / 100 : unit === 'px' ? val / layer.fontSize : 1.2;
    onUpdate({
      lineHeightConfig: { value: val, unit },
      lineHeight: Number(mult.toFixed(2))
    });
  };

  const handleLetterSpacingChange = (val: number, unit: 'px' | '%' | 'em') => {
    onUpdate({
      letterSpacingConfig: { value: val, unit },
      letterSpacing: val
    });
  };

  const handleAddStyleRun = () => {
    if (!styleRunText.trim()) return;
    const start = layer.content.indexOf(styleRunText);
    if (start === -1) {
      alert(`Text "${styleRunText}" not found in current layer content.`);
      return;
    }
    const end = start + styleRunText.length;
    const existing = layer.styleRuns || [];
    const newRuns: StyleRun[] = [
      ...existing.filter((r) => r.start !== start),
      { start, end, fill: styleRunColor }
    ];
    onUpdate({ styleRuns: newRuns });
    setStyleRunText('');
  };

  return (
    <div className="space-y-4 text-white text-xs">
      {/* SECTION TITLE */}
      <div className="flex items-center justify-between font-bold text-sm text-white pt-1">
        <span>Typography</span>
      </div>

      {/* 1. FONT FAMILY SELECTOR */}
      <div className="relative">
        <button
          type="button"
          className="w-full bg-[#2C2C2C] hover:bg-[#383838] border border-[#3E3E3E] rounded-md px-3 py-2 text-left text-xs font-semibold flex items-center justify-between text-white transition-colors"
          onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
        >
          <span style={{ fontFamily: layer.fontFamily }}>{layer.fontFamily}</span>
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        </button>

        {isFontDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#222222] border border-[#3E3E3E] rounded-md shadow-2xl z-50 overflow-hidden max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-[#333333] flex items-center gap-2 bg-[#1A1A1A]">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-neutral-500"
                placeholder="Search font family..."
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-1 divide-y divide-white/5">
              {filteredFonts.map((font) => (
                <button
                  key={font.family}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#333333] transition-colors ${
                    layer.fontFamily === font.family ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-white'
                  }`}
                  onClick={() => handleFontSelect(font.family)}
                >
                  <span style={{ fontFamily: font.family }} className="text-sm">
                    {font.family}
                  </span>
                  {layer.fontFamily === font.family && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. FONT STYLE / WEIGHT & FONT SIZE */}
      <div className="grid grid-cols-2 gap-2">
        {/* Style / Weight */}
        <div>
          <select
            className="w-full bg-[#2C2C2C] border border-[#3E3E3E] rounded-md px-2.5 py-2 text-xs text-white font-medium outline-none focus:border-blue-500"
            value={layer.fontWeight}
            onChange={(e) => onUpdate({ fontWeight: e.target.value })}
          >
            {fontVariants.map((v) => (
              <option key={v.weight} value={v.weight}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Size Input */}
        <div className="relative flex items-center">
          <input
            type="number"
            min="1"
            max="1000"
            className="w-full bg-[#2C2C2C] border border-[#3E3E3E] rounded-md px-3 py-2 text-xs text-white font-mono font-semibold outline-none focus:border-blue-500"
            value={layer.fontSize}
            onChange={(e) => onUpdate({ fontSize: Math.max(1, parseInt(e.target.value) || 24) })}
          />
        </div>
      </div>

      {/* 3. LINE HEIGHT & LETTER SPACING */}
      <div className="grid grid-cols-2 gap-2">
        {/* Line Height */}
        <div>
          <label className="block text-[10px] font-semibold text-neutral-400 uppercase mb-1">Line height</label>
          <div className="flex items-center bg-[#2C2C2C] border border-[#3E3E3E] rounded-md px-2 py-1.5 focus-within:border-blue-500">
            <span className="text-neutral-400 font-bold text-[10px] mr-1">A⤢</span>
            <input
              type="number"
              className="w-full bg-transparent text-xs text-white font-mono font-semibold outline-none"
              value={currentLineHeightValue}
              onChange={(e) => handleLineHeightChange(parseInt(e.target.value) || 100, currentLineHeightUnit)}
            />
            <select
              className="bg-transparent text-[10px] text-neutral-400 font-bold outline-none cursor-pointer"
              value={currentLineHeightUnit}
              onChange={(e) => handleLineHeightChange(currentLineHeightValue, e.target.value as any)}
            >
              <option value="%">%</option>
              <option value="px">px</option>
              <option value="Auto">Auto</option>
            </select>
          </div>
        </div>

        {/* Letter Spacing */}
        <div>
          <label className="block text-[10px] font-semibold text-neutral-400 uppercase mb-1">Letter spacing</label>
          <div className="flex items-center bg-[#2C2C2C] border border-[#3E3E3E] rounded-md px-2 py-1.5 focus-within:border-blue-500">
            <span className="text-neutral-400 font-bold text-[10px] mr-1">|A|</span>
            <input
              type="number"
              className="w-full bg-transparent text-xs text-white font-mono font-semibold outline-none"
              value={currentLetterSpacingValue}
              onChange={(e) => handleLetterSpacingChange(parseInt(e.target.value) || 0, currentLetterSpacingUnit)}
            />
            <select
              className="bg-transparent text-[10px] text-neutral-400 font-bold outline-none cursor-pointer"
              value={currentLetterSpacingUnit}
              onChange={(e) => handleLetterSpacingChange(currentLetterSpacingValue, e.target.value as any)}
            >
              <option value="%">%</option>
              <option value="px">px</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. ALIGNMENT & VERTICAL ALIGNMENT */}
      <div>
        <label className="block text-[10px] font-semibold text-neutral-400 uppercase mb-1">Alignment</label>
        <div className="grid grid-cols-2 gap-2">
          {/* Horizontal Alignment */}
          <div className="flex bg-[#2C2C2C] border border-[#3E3E3E] rounded-md p-0.5">
            {(
              [
                { id: 'left', icon: AlignLeft },
                { id: 'center', icon: AlignCenter },
                { id: 'right', icon: AlignRight },
                { id: 'justify', icon: AlignJustify }
              ] as const
            ).map((item) => {
              const IconComp = item.icon;
              const isActive = (layer.align || 'left') === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex-1 py-1.5 flex items-center justify-center rounded transition-colors ${
                    isActive ? 'bg-[#444444] text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                  onClick={() => onUpdate({ align: item.id })}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* Vertical Alignment */}
          <div className="flex bg-[#2C2C2C] border border-[#3E3E3E] rounded-md p-0.5">
            {(
              [
                { id: 'top', label: 'Top', icon: ArrowUpToLine },
                { id: 'middle', label: 'Mid', icon: Minus },
                { id: 'bottom', label: 'Bot', icon: ArrowDownToLine }
              ] as const
            ).map((item) => {
              const IconComp = item.icon;
              const isActive = (layer.verticalAlign || 'top') === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex-1 py-1.5 flex items-center justify-center rounded transition-colors ${
                    isActive ? 'bg-[#444444] text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                  onClick={() => onUpdate({ verticalAlign: item.id })}
                  title={`Vertical ${item.label}`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <hr className="border-[#3E3E3E] my-3" />

      {/* 5. TEXT RESIZING MODES */}
      <div>
        <label className="block text-[10px] font-semibold text-neutral-400 uppercase mb-1">Text Resizing</label>
        <div className="flex bg-[#2C2C2C] border border-[#3E3E3E] rounded-md p-0.5 gap-0.5">
          {(
            [
              { id: 'AUTO_WIDTH', label: 'Auto Width' },
              { id: 'AUTO_HEIGHT', label: 'Auto Height' },
              { id: 'FIXED', label: 'Fixed' }
            ] as const
          ).map((mode) => {
            const isActive = (layer.textResizeMode || 'AUTO_HEIGHT') === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded transition-colors ${
                  isActive ? 'bg-[#444444] text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
                onClick={() => onUpdate({ textResizeMode: mode.id })}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-[#3E3E3E] my-3" />

      {/* 6. ADVANCED TYPOGRAPHY ACCORDION */}
      <div>
        <button
          type="button"
          className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white py-1"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>Advanced Typography</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-3 border-t border-[#3E3E3E] mt-2">
            {/* Case Transformation */}
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 uppercase mb-1">Case</label>
              <div className="grid grid-cols-4 gap-1 bg-[#2C2C2C] border border-[#3E3E3E] rounded-md p-0.5">
                {(
                  [
                    { id: 'original', label: 'Ag' },
                    { id: 'uppercase', label: 'AG' },
                    { id: 'lowercase', label: 'ag' },
                    { id: 'title', label: 'Title' }
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`py-1 text-[11px] font-bold rounded ${
                      (layer.textCase || 'original') === c.id ? 'bg-[#444444] text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                    onClick={() => onUpdate({ textCase: c.id })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Decoration */}
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 uppercase mb-1">Decoration</label>
              <div className="grid grid-cols-3 gap-1 bg-[#2C2C2C] border border-[#3E3E3E] rounded-md p-0.5">
                {(
                  [
                    { id: 'none', label: 'None' },
                    { id: 'underline', label: 'Underline' },
                    { id: 'strikethrough', label: 'Strikethrough' }
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`py-1 text-[11px] font-bold rounded ${
                      (layer.textDecoration || 'none') === d.id ? 'bg-[#444444] text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                    onClick={() => onUpdate({ textDecoration: d.id })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rich Text Word Highlight / StyleRuns */}
            <div className="space-y-2 bg-[#222222] p-3 rounded-lg border border-[#3E3E3E]">
              <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Selective Word Color (StyleRuns)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 bg-[#2C2C2C] border border-[#3E3E3E] rounded px-2 py-1 text-xs text-white outline-none"
                  placeholder="Word to highlight..."
                  value={styleRunText}
                  onChange={(e) => setStyleRunText(e.target.value)}
                />
                <input
                  type="color"
                  className="w-7 h-7 rounded border border-[#3E3E3E] cursor-pointer bg-transparent"
                  value={styleRunColor}
                  onChange={(e) => setStyleRunColor(e.target.value)}
                />
                <button
                  type="button"
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded"
                  onClick={handleAddStyleRun}
                >
                  Color
                </button>
              </div>
              {layer.styleRuns && layer.styleRuns.length > 0 && (
                <div className="space-y-1 pt-1">
                  {layer.styleRuns.map((run, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-[#1A1A1A] px-2 py-1 rounded">
                      <span className="truncate text-white font-semibold">
                        "{layer.content.slice(run.start, run.end)}"
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: run.fill }} />
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300 font-bold"
                          onClick={() => {
                            const updated = layer.styleRuns.filter((_, i) => i !== idx);
                            onUpdate({ styleRuns: updated });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
