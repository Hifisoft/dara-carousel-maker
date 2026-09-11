'use client';

import React from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { X, FileText, Image as ImageIcon, BarChart2, Quote, Columns, ArrowRight } from 'lucide-react';
import { SlideSceneNode } from '../types/schema';

interface AddSlideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddSlideModal({ isOpen, onClose }: AddSlideModalProps) {
  const addSlide = useCarouselStore((state) => state.addSlide);

  if (!isOpen) return null;

  const layouts: {
    id: string;
    name: string;
    desc: string;
    icon: React.ReactNode;
    segmentRole: SlideSceneNode['segmentRole'];
  }[] = [
    {
      id: 'standard',
      name: 'Standard Content',
      desc: 'Headline + Body paragraph',
      icon: <FileText className="w-5 h-5 text-accent-blue" />,
      segmentRole: 'value'
    },
    {
      id: 'image-led',
      name: 'Image-Led',
      desc: 'Hero image + Caption headline',
      icon: <ImageIcon className="w-5 h-5 text-accent-purple" />,
      segmentRole: 'value'
    },
    {
      id: 'statistic',
      name: 'Statistic / Metric',
      desc: 'Big number + Metric explanation',
      icon: <BarChart2 className="w-5 h-5 text-accent-green" />,
      segmentRole: 'value'
    },
    {
      id: 'quote',
      name: 'Quote / Testimonial',
      desc: 'Large quote text + Author attribution',
      icon: <Quote className="w-5 h-5 text-accent-orange" />,
      segmentRole: 'contrarian'
    },
    {
      id: 'comparison',
      name: 'Comparison',
      desc: 'Before vs After / Side-by-side framework',
      icon: <Columns className="w-5 h-5 text-accent-cyan" />,
      segmentRole: 'value'
    },
    {
      id: 'cta',
      name: 'Call to Action',
      desc: 'High-contrast conversion & follow prompt',
      icon: <ArrowRight className="w-5 h-5 text-accent-red" />,
      segmentRole: 'cta'
    }
  ];

  const handleSelectLayout = (segmentRole: SlideSceneNode['segmentRole']) => {
    addSlide(segmentRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-default rounded-xl w-full max-w-[560px] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white">Add Slide Layout</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-text-secondary mb-5">
          Select a template layout variant to insert into your carousel.
        </p>

        <div className="grid grid-cols-2 gap-3.5 mb-5">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              className="p-3.5 bg-surface-elevated border border-border-default rounded-lg hover:border-accent-blue hover:bg-surface-hover cursor-pointer transition-all flex items-start gap-3 group"
              onClick={() => handleSelectLayout(layout.segmentRole)}
            >
              <div className="p-2 rounded bg-black/40 border border-border-subtle group-hover:border-accent-blue/30">
                {layout.icon}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white mb-0.5 group-hover:text-accent-blue">
                  {layout.name}
                </h3>
                <p className="text-[10px] text-text-secondary">{layout.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            className="px-4 py-1.5 text-xs font-medium rounded bg-surface-elevated text-text-secondary hover:text-white border border-border-default"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
