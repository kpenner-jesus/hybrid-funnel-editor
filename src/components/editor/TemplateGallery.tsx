"use client";

import React, { useState, useMemo } from "react";
import { searchWidgets, templateCategories, widgetTemplateList } from "@/lib/widget-templates";
import type { WidgetTemplate } from "@/lib/types";
import { Tooltip } from "@/components/shared/Tooltip";

interface TemplateGalleryProps {
  onSelect: (templateId: string) => void;
  onClose: () => void;
  /** If provided, shows "Replace with..." header and filters to swappable widgets */
  replaceWidgetId?: string;
}

// Complexity badge colors
const complexityColors: Record<string, { bg: string; text: string }> = {
  simple: { bg: "#dcfce7", text: "#166534" },
  moderate: { bg: "#fef9c3", text: "#854d0e" },
  complex: { bg: "#fce7f3", text: "#9d174d" },
};

export function TemplateGallery({ onSelect, onClose, replaceWidgetId }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);

  // Collect all unique tags across widgets for the tag cloud
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    widgetTemplateList.forEach(w => (w.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, []);

  // Filter widgets
  const filtered = useMemo(() => {
    let results = searchQuery
      ? searchWidgets(searchQuery)
      : widgetTemplateList;

    // Category filter
    if (activeCategory !== "all") {
      results = results.filter(t => t.category === activeCategory);
    }

    // Tag filter
    if (selectedTags.size > 0) {
      results = results.filter(t =>
        Array.from(selectedTags).every(tag => (t.tags || []).includes(tag))
      );
    }

    return results;
  }, [searchQuery, activeCategory, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  // Get popular tags (appear in 3+ widgets) for quick access
  const popularTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    widgetTemplateList.forEach(w => (w.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    return Object.entries(tagCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);
  }, []);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold">
              {replaceWidgetId ? "Swap Widget" : "Add Widget"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {replaceWidgetId ? "Choose a replacement widget" : "Search or browse widgets to add to your step"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search widgets... (try: rooms, meals, bar, timeline, payment)"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-gray-50"
              autoFocus
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-6 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            All ({widgetTemplateList.length})
          </button>
          {templateCategories.map((cat) => {
            const count = widgetTemplateList.filter(t => t.category === cat.id).length;
            return (
              <Tooltip key={cat.id} text={cat.description} position="bottom">
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Popular tags (quick filters) */}
        {!searchQuery && (
          <div className="flex gap-1 px-6 pb-3 flex-wrap">
            {popularTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  selectedTags.has(tag)
                    ? "bg-primary text-white"
                    : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-100"
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="px-2 py-0.5 rounded text-[10px] font-medium text-red-500 hover:bg-red-50"
              >
                ✕ clear
              </button>
            )}
          </div>
        )}

        {/* Widget grid */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No widgets match your search</p>
              <p className="text-xs mt-1">Try different keywords or clear your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((template) => (
                <WidgetCard
                  key={template.id}
                  template={template}
                  onSelect={() => onSelect(template.id)}
                  isHovered={hoveredWidget === template.id}
                  onHover={() => setHoveredWidget(template.id)}
                  onLeave={() => setHoveredWidget(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-400">{filtered.length} widget{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Individual widget card ---
function WidgetCard({
  template,
  onSelect,
  isHovered,
  onHover,
  onLeave,
}: {
  template: WidgetTemplate;
  onSelect: () => void;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const cplx = template.complexity || "simple";
  const cColors = complexityColors[cplx] || complexityColors.simple;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`text-left p-4 rounded-xl border-2 transition-all duration-150 group ${
        isHovered
          ? "border-primary bg-primary/[0.03] shadow-md scale-[1.01]"
          : "border-gray-100 hover:border-gray-300 bg-white"
      }`}
    >
      {/* Top row: icon + name + complexity */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl flex-shrink-0 mt-0.5">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{template.name}</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
              style={{ backgroundColor: cColors.bg, color: cColors.text }}
            >
              {cplx}
            </span>
          </div>
          {/* Best for (short) */}
          {template.bestFor && template.bestFor.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
              Best for: {template.bestFor.slice(0, 3).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
        {template.aiDescription || template.description}
      </p>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {template.tags.slice(0, 4).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-gray-50 text-gray-400 border border-gray-100">
              {tag}
            </span>
          ))}
          {template.tags.length > 4 && (
            <span className="text-[9px] text-gray-300">+{template.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Pricing model badge */}
      {template.pricingModel && template.pricingModel !== "none" && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[9px] text-gray-300">💲</span>
          <span className="text-[9px] text-gray-400">{template.pricingModel}</span>
        </div>
      )}
    </button>
  );
}
