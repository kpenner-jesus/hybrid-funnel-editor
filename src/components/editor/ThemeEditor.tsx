"use client";

import React, { useState } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { THEME_PRESETS, PRESET_CATEGORIES, type ThemePreset } from "@/lib/theme-presets";

function PresetSwatch({ preset, isActive, onClick }: {
  preset: ThemePreset;
  isActive: boolean;
  onClick: () => void;
}) {
  const { theme } = preset;
  return (
    <button
      onClick={onClick}
      title={preset.name}
      className={`group relative rounded-lg border-2 transition-all duration-150 overflow-hidden ${
        isActive
          ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
          : "border-outline-variant hover:border-primary/50 hover:shadow-sm"
      }`}
      style={{ minHeight: 72 }}
    >
      {/* Surface background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: theme.surfaceColor }}
      />

      {/* Content */}
      <div className="relative p-2.5 flex flex-col gap-1.5">
        {/* Color dots */}
        <div className="flex gap-1.5">
          <div
            className="w-5 h-5 rounded-full shadow-sm"
            style={{ backgroundColor: theme.primaryColor }}
          />
          <div
            className="w-5 h-5 rounded-full shadow-sm"
            style={{ backgroundColor: theme.secondaryColor }}
          />
          <div
            className="w-5 h-5 rounded-full border border-black/10"
            style={{ backgroundColor: theme.surfaceColor }}
          />
        </div>

        {/* Mini card preview */}
        <div
          className="w-full h-5 rounded"
          style={{
            backgroundColor: theme.primaryColor,
            borderRadius: `${Math.min(theme.borderRadius, 8)}px`,
            opacity: 0.15,
          }}
        />

        {/* Name */}
        <div className="text-[10px] font-medium text-on-surface-variant leading-tight truncate text-left">
          {preset.name}
        </div>
      </div>

      {/* Active checkmark */}
      {isActive && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

export function ThemeEditor() {
  const { funnel, setTheme } = useFunnelStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [presetsExpanded, setPresetsExpanded] = useState(true);

  if (!funnel) return null;
  const { theme } = funnel;

  // Find currently active preset (if any)
  const activePreset = THEME_PRESETS.find(
    (p) =>
      p.theme.primaryColor === theme.primaryColor &&
      p.theme.secondaryColor === theme.secondaryColor &&
      p.theme.surfaceColor === theme.surfaceColor
  );

  const filteredPresets =
    activeCategory === "all"
      ? THEME_PRESETS
      : THEME_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-5">
      {/* --- Theme Presets Section --- */}
      <div>
        <button
          onClick={() => setPresetsExpanded(!presetsExpanded)}
          className="flex items-center justify-between w-full text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3"
        >
          <span>Quick Themes{activePreset ? ` \u2014 ${activePreset.name}` : ""}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`transform transition-transform ${presetsExpanded ? "rotate-180" : ""}`}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {presetsExpanded && (
          <>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "bg-primary text-white"
                      : "bg-surface-dim text-on-surface-variant hover:bg-primary/10"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Preset grid */}
            <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => (
                <PresetSwatch
                  key={preset.id}
                  preset={preset}
                  isActive={activePreset?.id === preset.id}
                  onClick={() => setTheme(preset.theme)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-outline-variant pt-4">
        <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-4">
          Custom Colors
        </div>

        {/* Primary Color */}
        <div className="mb-3">
          <label className="block text-xs text-on-surface-variant mb-1.5">Primary Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => setTheme({ primaryColor: e.target.value })}
              className="w-8 h-8 rounded border border-outline-variant cursor-pointer"
            />
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) => setTheme({ primaryColor: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div className="mb-3">
          <label className="block text-xs text-on-surface-variant mb-1.5">Secondary Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={theme.secondaryColor}
              onChange={(e) => setTheme({ secondaryColor: e.target.value })}
              className="w-8 h-8 rounded border border-outline-variant cursor-pointer"
            />
            <input
              type="text"
              value={theme.secondaryColor}
              onChange={(e) => setTheme({ secondaryColor: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono"
            />
          </div>
        </div>

        {/* Surface Color */}
        <div>
          <label className="block text-xs text-on-surface-variant mb-1.5">Surface Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={theme.surfaceColor}
              onChange={(e) => setTheme({ surfaceColor: e.target.value })}
              className="w-8 h-8 rounded border border-outline-variant cursor-pointer"
            />
            <input
              type="text"
              value={theme.surfaceColor}
              onChange={(e) => setTheme({ surfaceColor: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-outline-variant pt-4">
        <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-4">
          Typography
        </div>

        {/* Headline Font */}
        <div className="mb-3">
          <label className="block text-xs text-on-surface-variant mb-1.5">Headline Font</label>
          <select
            value={theme.headlineFont}
            onChange={(e) => setTheme({ headlineFont: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
          >
            <option value="Noto Serif">Noto Serif</option>
            <option value="Georgia">Georgia</option>
            <option value="Playfair Display">Playfair Display</option>
            <option value="Inter">Inter</option>
            <option value="system-ui">System Default</option>
          </select>
        </div>

        {/* Body Font */}
        <div>
          <label className="block text-xs text-on-surface-variant mb-1.5">Body Font</label>
          <select
            value={theme.bodyFont}
            onChange={(e) => setTheme({ bodyFont: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
          >
            <option value="Inter">Inter</option>
            <option value="system-ui">System Default</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
          </select>
        </div>
      </div>

      <div className="border-t border-outline-variant pt-4">
        <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-4">
          Shape
        </div>

        {/* Border Radius */}
        <div className="mb-3">
          <label className="block text-xs text-on-surface-variant mb-1.5">
            Border Radius: {theme.borderRadius}px
          </label>
          <input
            type="range"
            min="0"
            max="24"
            step="1"
            value={theme.borderRadius}
            onChange={(e) => setTheme({ borderRadius: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-outline mt-1">
            <span>Sharp</span>
            <span>Rounded</span>
          </div>
        </div>

        {/* Card Style */}
        <div>
          <label className="block text-xs text-on-surface-variant mb-1.5">Card Style</label>
          <div className="grid grid-cols-3 gap-2">
            {(["flat", "elevated", "outlined"] as const).map((style) => (
              <button
                key={style}
                onClick={() => setTheme({ cardStyle: style })}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  theme.cardStyle === style
                    ? "border-primary bg-primary-light text-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-primary/50"
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview swatch */}
      <div className="border-t border-outline-variant pt-4">
        <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
          Preview
        </div>
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: theme.surfaceColor,
            borderRadius: `${theme.borderRadius}px`,
            borderColor: theme.cardStyle === "outlined" ? "#c3c6cf" : "transparent",
            boxShadow: theme.cardStyle === "elevated" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-base font-semibold mb-1">
            Headline Preview
          </h3>
          <p style={{ fontFamily: theme.bodyFont }} className="text-xs text-on-surface-variant">
            Body text preview with the selected font family and theme colors.
          </p>
          <div className="flex gap-2 mt-3">
            <div
              className="px-3 py-1.5 text-white text-xs rounded-md font-medium"
              style={{ backgroundColor: theme.primaryColor, borderRadius: `${theme.borderRadius / 2}px` }}
            >
              Primary
            </div>
            <div
              className="px-3 py-1.5 text-white text-xs rounded-md font-medium"
              style={{ backgroundColor: theme.secondaryColor, borderRadius: `${theme.borderRadius / 2}px` }}
            >
              Secondary
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ NAVIGATION LAYOUT ═══════ */}
      <NavigationLayoutEditor />
    </div>
  );
}

// --- Navigation Layout Editor ---
function NavigationLayoutEditor() {
  const { funnel, setTheme } = useFunnelStore();
  if (!funnel) return null;

  const layout = funnel.theme.layout || {
    desktopHeader: "journey-icons" as const,
    tabletHeader: "auto" as const,
    mobileHeader: "progress-bar" as const,
    footerStyle: "frosted-glass" as const,
    showRunningTotal: false,
    showTrustBadges: true,
    showTimeEstimate: true,
    showStepCounter: true,
    useContextualNextLabels: true,
    showMicroCelebrations: true,
  };

  const updateLayout = (updates: Record<string, unknown>) => {
    setTheme({ layout: { ...layout, ...updates } as import("@/lib/types").FunnelLayout });
  };

  const headerOptions = [
    { value: "journey-icons", label: "Journey Icons", desc: "Emoji icons per step with progress line", icon: "🗺️" },
    { value: "sticky-bar", label: "Sticky Bar", desc: "Logo + progress dots, always visible", icon: "📌" },
    { value: "hero-banner", label: "Hero Banner", desc: "Full-width image with overlay text", icon: "🖼️" },
    { value: "sidebar-nav", label: "Sidebar Nav", desc: "Vertical step list on the left (wide screens)", icon: "📋" },
    { value: "immersive", label: "Immersive", desc: "No header — floating progress pill only", icon: "✨" },
    { value: "magazine", label: "Magazine", desc: "Editorial style with large venue name", icon: "📰" },
  ];

  const footerOptions = [
    { value: "frosted-glass", label: "Frosted Glass", desc: "Blur backdrop with rounded top", icon: "🧊" },
    { value: "action-bar", label: "Action Bar", desc: "Bold full-width button, prominent CTA", icon: "🎯" },
    { value: "floating-buttons", label: "Floating", desc: "Pill buttons in bottom-right corner", icon: "💊" },
    { value: "progress-footer", label: "Progress Bar", desc: "Gradient fill bar above navigation", icon: "📊" },
  ];

  const mobileHeaderOptions = [
    { value: "progress-bar", label: "Progress Bar", desc: "Gradient fill bar" },
    { value: "dots", label: "Step Dots", desc: "Dot indicators per step" },
    { value: "minimal", label: "Minimal", desc: "Just step count text" },
    { value: "hidden", label: "Hidden", desc: "No header on mobile" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
        Navigation Layout
      </div>

      {/* Desktop Header */}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-2">Desktop Header</label>
        <div className="grid grid-cols-2 gap-2">
          {headerOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateLayout({ desktopHeader: opt.value })}
              className={`text-left p-2.5 rounded-lg border-2 transition-all ${
                layout.desktopHeader === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{opt.icon}</span>
                <span className="text-xs font-semibold text-on-surface">{opt.label}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-0.5 leading-tight">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Header */}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-2">Mobile Header</label>
        <div className="grid grid-cols-2 gap-2">
          {mobileHeaderOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateLayout({ mobileHeader: opt.value })}
              className={`text-left p-2 rounded-lg border-2 transition-all ${
                layout.mobileHeader === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant hover:border-primary/40"
              }`}
            >
              <span className="text-xs font-semibold text-on-surface">{opt.label}</span>
              <p className="text-[10px] text-on-surface-variant leading-tight">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Style */}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-2">Footer Style</label>
        <div className="grid grid-cols-2 gap-2">
          {footerOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateLayout({ footerStyle: opt.value })}
              className={`text-left p-2.5 rounded-lg border-2 transition-all ${
                layout.footerStyle === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{opt.icon}</span>
                <span className="text-xs font-semibold text-on-surface">{opt.label}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-0.5 leading-tight">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-2">Features</label>
        <div className="space-y-2">
          {[
            { key: "useContextualNextLabels", label: "Smart Next labels", desc: "Auto 'Choose Your Rooms →' based on next step" },
            { key: "showRunningTotal", label: "Running total", desc: "Show estimated price in footer" },
            { key: "showTrustBadges", label: "Trust badges", desc: "Security badges on payment step" },
            { key: "showTimeEstimate", label: "Time estimate", desc: "'~3 min left' in header" },
            { key: "showStepCounter", label: "Step counter", desc: "'Step 3 of 22' in header" },
            { key: "showMicroCelebrations", label: "Celebrations", desc: "Pulse animation on step complete" },
          ].map(toggle => (
            <label key={toggle.key} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={!!(layout as unknown as Record<string, unknown>)[toggle.key]}
                onChange={(e) => updateLayout({ [toggle.key]: e.target.checked })}
                className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <div className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors">{toggle.label}</div>
                <div className="text-[10px] text-on-surface-variant leading-tight">{toggle.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
