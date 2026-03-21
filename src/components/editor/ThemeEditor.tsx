"use client";

import React from "react";
import { useFunnelStore } from "@/stores/funnel-store";

export function ThemeEditor() {
  const { funnel, setTheme } = useFunnelStore();
  if (!funnel) return null;

  const { theme } = funnel;

  return (
    <div className="space-y-5">
      <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
        Colors
      </div>

      {/* Primary Color */}
      <div>
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
      <div>
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
    </div>
  );
}
