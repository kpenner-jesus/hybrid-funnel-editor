"use client";

import React, { useState, useMemo, useCallback } from "react";
import { searchWidgets, templateCategories, widgetTemplateList } from "@/lib/widget-templates";
import { useFunnelStore } from "@/stores/funnel-store";
import type { WidgetTemplate, ThemeConfig } from "@/lib/types";
import { Tooltip } from "@/components/shared/Tooltip";
import { WidgetRenderer } from "@/components/preview/WidgetRenderer";

const complexityColors: Record<string, { bg: string; text: string }> = {
  simple: { bg: "#dcfce7", text: "#166534" },
  moderate: { bg: "#fef9c3", text: "#854d0e" },
  complex: { bg: "#fce7f3", text: "#9d174d" },
};

export function WidgetLibraryPanel() {
  const { funnel, selectedStepId, addWidget } = useFunnelStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  // Popular tags
  const popularTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    widgetTemplateList.forEach(w => (w.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    return Object.entries(tagCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag]) => tag);
  }, []);

  // Filter
  const filtered = useMemo(() => {
    let results = searchQuery ? searchWidgets(searchQuery) : widgetTemplateList;
    if (activeCategory !== "all") results = results.filter(t => t.category === activeCategory);
    if (selectedTags.size > 0) results = results.filter(t => Array.from(selectedTags).every(tag => (t.tags || []).includes(tag)));
    return results;
  }, [searchQuery, activeCategory, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const handleAddWidget = useCallback((templateId: string) => {
    if (!selectedStepId) return;
    addWidget(selectedStepId, templateId);
  }, [selectedStepId, addWidget]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search widgets..."
          className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-gray-50"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
            activeCategory === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >All</button>
        {templateCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
              activeCategory === cat.id ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >{cat.label}</button>
        ))}
      </div>

      {/* Tag cloud */}
      {!searchQuery && (
        <div className="flex gap-1 flex-wrap">
          {popularTags.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                selectedTags.has(tag) ? "bg-primary text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100"
              }`}
            >{tag}</button>
          ))}
          {selectedTags.size > 0 && (
            <button onClick={() => setSelectedTags(new Set())} className="px-1.5 py-0.5 rounded text-[9px] font-medium text-red-500 hover:bg-red-50">✕ clear</button>
          )}
        </div>
      )}

      {/* Hint if no step selected */}
      {!selectedStepId && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
          Select a step first, then click a widget to add it
        </div>
      )}

      {/* Widget cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">No widgets match</div>
        ) : (
          filtered.map(template => {
            const cplx = template.complexity || "simple";
            const cColors = complexityColors[cplx] || complexityColors.simple;
            const isExpanded = expandedWidget === template.id;

            return (
              <div key={template.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/widget-template-id", template.id);
                  e.dataTransfer.setData("text/plain", template.name);
                  e.dataTransfer.effectAllowed = "copy";
                  // Custom drag image
                  const ghost = document.createElement("div");
                  ghost.textContent = template.name;
                  ghost.style.cssText = "position:absolute;top:-999px;left:-999px;padding:8px 16px;background:#fff;border:2px solid #006c4b;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.15);white-space:nowrap;";
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
                className="rounded-xl border border-gray-100 overflow-hidden transition-all hover:border-gray-300 cursor-grab active:cursor-grabbing">
                {/* Card header — 3-column layout: Widget | Why Needed | Workaround */}
                <button
                  onClick={() => setExpandedWidget(isExpanded ? null : template.id)}
                  className="w-full text-left p-3 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Widget name + complexity */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="font-semibold text-xs text-gray-900">{template.name}</span>
                    <span className="px-1 py-0.5 rounded text-[8px] font-bold uppercase"
                      style={{ backgroundColor: cColors.bg, color: cColors.text }}>{cplx}</span>
                  </div>

                  {/* 2-column: Why Needed | Workaround */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Why It's Needed</div>
                      <p className="text-[10px] text-gray-600 leading-tight line-clamp-3">
                        {template.whyNeeded || template.description}
                      </p>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Workaround</div>
                      <p className="text-[10px] text-gray-500 leading-tight line-clamp-3">
                        {template.workaround || "No alternative available."}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {template.tags && (
                    <div className="flex gap-0.5 flex-wrap">
                      {template.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="px-1 py-0.5 rounded text-[8px] bg-gray-50 text-gray-400">{tag}</span>
                      ))}
                      {(template.tags.length || 0) > 4 && <span className="text-[8px] text-gray-300">+{(template.tags.length || 0) - 4}</span>}
                    </div>
                  )}
                  {/* Expand arrow */}
                  <svg className={`w-4 h-4 text-gray-300 transition-transform shrink-0 mt-1 ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>

                {/* Expanded: mini preview + add button */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {/* Mini preview */}
                    <div className="p-3 pointer-events-none opacity-80" style={{ transform: "scale(0.85)", transformOrigin: "top left" }}>
                      <MiniWidgetPreview templateId={template.id} theme={funnel?.theme} />
                    </div>
                    {/* Add button */}
                    <div className="px-3 pb-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddWidget(template.id); }}
                        disabled={!selectedStepId}
                        className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-40"
                        style={{ backgroundColor: funnel?.theme.primaryColor || "#006c4b" }}
                      >
                        {selectedStepId ? "Add to Selected Step" : "Select a step first"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-[10px] text-gray-300 text-center pt-2">{filtered.length} widget{filtered.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

// Mini preview using actual WidgetRenderer with default config
function MiniWidgetPreview({ templateId, theme }: { templateId: string; theme?: ThemeConfig }) {
  const defaultTheme: ThemeConfig = theme || {
    primaryColor: "#006c4b",
    secondaryColor: "#795828",
    surfaceColor: "#ffffff",
    headlineFont: "Georgia",
    bodyFont: "Inter",
    borderRadius: 8,
    cardStyle: "elevated",
  };

  // Create a minimal widget instance with default config
  const { widgetTemplateRegistry } = require("@/lib/widget-templates");
  const template = widgetTemplateRegistry[templateId];
  if (!template) return <div className="text-xs text-gray-400">Preview unavailable</div>;

  const defaultConfig: Record<string, unknown> = {};
  template.configFields.forEach((cf: { name: string; defaultValue?: unknown }) => {
    if (cf.defaultValue !== undefined) defaultConfig[cf.name] = cf.defaultValue;
  });

  const widget = {
    instanceId: `preview-${templateId}`,
    templateId,
    variant: "default",
    config: defaultConfig,
    bindings: { inputs: {}, outputs: {} },
    themeOverrides: {} as Record<string, string>,
  };

  return (
    <div style={{ maxHeight: 200, overflow: "hidden" }}>
      <WidgetRenderer
        widget={widget}
        theme={defaultTheme}
        isSelected={false}
        resolvedInputs={{}}
        onOutput={() => {}}
      />
    </div>
  );
}
