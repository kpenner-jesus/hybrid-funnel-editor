"use client";

import React, { useState } from "react";
import { widgetTemplateList, templateCategories } from "@/lib/widget-templates";
import { Button } from "@/components/shared/Button";

interface TemplateGalleryProps {
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered =
    activeCategory === "all"
      ? widgetTemplateList
      : widgetTemplateList.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-lg font-semibold font-serif">Add Widget</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-primary text-white"
                : "bg-surface-dim text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            All
          </button>
          {templateCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-primary text-white"
                  : "bg-surface-dim text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {filtered.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className="w-full text-left p-4 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary-light/30 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-on-surface">
                      {template.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant bg-surface-dim px-1.5 py-0.5 rounded">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex gap-3 mt-2 text-[10px] text-outline">
                    <span>{template.inputs.length} inputs</span>
                    <span>{template.outputs.length} outputs</span>
                    <span>{template.variants.length} variants</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-outline-variant">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
