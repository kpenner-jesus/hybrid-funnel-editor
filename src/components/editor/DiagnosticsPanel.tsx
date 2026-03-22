"use client";

import React, { useState, useCallback } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { useAiStore } from "@/stores/ai-store";
import { useVenueDataStore } from "@/stores/venue-data-store";

type DiagSection = "overview" | "flow" | "selected" | "venue" | "ai" | "full";

export function DiagnosticsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<DiagSection>("overview");
  const [copied, setCopied] = useState(false);

  const funnel = useFunnelStore((s) => s.funnel);
  const selectedStepId = useFunnelStore((s) => s.selectedStepId);
  const selectedWidgetId = useFunnelStore((s) => s.selectedWidgetId);
  const venueData = useVenueDataStore((s) => s.venueData);
  const messages = useAiStore((s) => s.messages);
  const selectedModel = useAiStore((s) => s.selectedModel);
  const accountContext = useAiStore((s) => s.accountContext);

  const buildDiagnostics = useCallback(() => {
    const sections: Record<string, unknown> = {};

    // Overview — always included
    sections["_meta"] = {
      timestamp: new Date().toISOString(),
      aiModel: selectedModel,
      accountContext,
    };

    if (activeSection === "overview" || activeSection === "full") {
      sections["funnel"] = funnel
        ? {
            name: funnel.name,
            totalSteps: funnel.steps.length,
            theme: funnel.theme,
            steps: funnel.steps.map((s, i) => ({
              index: i,
              id: s.id,
              title: s.title,
              layout: s.layout,
              widgetCount: s.widgets.length,
              widgets: s.widgets.map((w, wi) => ({
                index: wi,
                instanceId: w.instanceId,
                templateId: w.templateId,
                config: w.config,
                bindings: w.bindings,
              })),
              navigation: s.navigation,
            })),
          }
        : null;
    }

    if (activeSection === "flow" || activeSection === "full") {
      if (funnel && funnel.steps.length > 0) {
        // Build a text flow map showing connections
        const flowMap: Array<{
          step: string;
          index: number;
          widgets: string[];
          connectsTo: Array<{ target: string; targetIndex: number; label?: string; source: string }>;
        }> = [];

        for (let i = 0; i < funnel.steps.length; i++) {
          const step = funnel.steps[i];
          const entry: typeof flowMap[0] = {
            step: step.title,
            index: i,
            widgets: step.widgets.map((w) => `${w.templateId} (${w.instanceId.slice(-6)})`),
            connectsTo: [],
          };

          // Check for segment picker branching
          const segWidget = step.widgets.find((w) => w.templateId === "segment-picker");
          if (segWidget) {
            let options: Array<{ id?: string; label?: string; nextStep?: string }> = [];
            try {
              const raw = segWidget.config.options;
              if (typeof raw === "string") options = JSON.parse(raw);
              else if (Array.isArray(raw)) options = raw;
            } catch {}

            const explicitBranches = options.filter((o) => o.nextStep);
            if (explicitBranches.length > 0) {
              explicitBranches.forEach((opt) => {
                const targetIdx = funnel.steps.findIndex((s) => s.id === opt.nextStep);
                entry.connectsTo.push({
                  target: targetIdx >= 0 ? funnel.steps[targetIdx].title : `ID:${opt.nextStep}`,
                  targetIndex: targetIdx,
                  label: opt.label,
                  source: "segment-picker (explicit nextStep)",
                });
              });
            } else if (options.length > 1) {
              // Implied branches
              options.forEach((opt, oi) => {
                const targetIdx = i + 1 + oi;
                if (targetIdx < funnel.steps.length) {
                  entry.connectsTo.push({
                    target: funnel.steps[targetIdx].title,
                    targetIndex: targetIdx,
                    label: opt.label,
                    source: "segment-picker (implied: option order → next N steps)",
                  });
                }
              });
            }
          }

          // Check conditional navigation
          if (step.navigation.conditionalNext && step.navigation.conditionalNext.length > 0) {
            for (const rule of step.navigation.conditionalNext) {
              const targetIdx = funnel.steps.findIndex((s) => s.id === rule.targetStepId);
              entry.connectsTo.push({
                target: targetIdx >= 0 ? funnel.steps[targetIdx].title : `ID:${rule.targetStepId}`,
                targetIndex: targetIdx,
                label: rule.label || `${rule.variable}=${rule.value}`,
                source: `conditionalNext (${rule.variable} ${rule.operator} "${rule.value}")`,
              });
            }
            // Add default fallback
            if (step.navigation.next) {
              const targetIdx = funnel.steps.findIndex((s) => s.id === step.navigation.next);
              entry.connectsTo.push({
                target: targetIdx >= 0 ? funnel.steps[targetIdx].title : `ID:${step.navigation.next}`,
                targetIndex: targetIdx,
                label: "default",
                source: "navigation.next (default fallback)",
              });
            }
          }

          // Check explicit navigation (simple next, no conditional)
          if (entry.connectsTo.length === 0 && step.navigation.next) {
            const targetIdx = funnel.steps.findIndex((s) => s.id === step.navigation.next);
            entry.connectsTo.push({
              target: targetIdx >= 0 ? funnel.steps[targetIdx].title : `ID:${step.navigation.next}`,
              targetIndex: targetIdx,
              source: "navigation.next (explicit)",
            });
          }

          // Default: next step
          if (entry.connectsTo.length === 0 && i < funnel.steps.length - 1) {
            entry.connectsTo.push({
              target: funnel.steps[i + 1].title,
              targetIndex: i + 1,
              source: "default (next step in list)",
            });
          }

          flowMap.push(entry);
        }

        // Also generate a compact ASCII flow
        const asciiLines: string[] = ["FLOW MAP:", "========="];
        flowMap.forEach((entry) => {
          asciiLines.push(`[${entry.index}] ${entry.step} (${entry.widgets.join(", ")})`);
          entry.connectsTo.forEach((conn) => {
            asciiLines.push(`    → [${conn.targetIndex}] ${conn.target}${conn.label ? ` (${conn.label})` : ""} via ${conn.source}`);
          });
        });

        // Detect orphan steps (not reachable from step 0)
        const reachableSet = new Set<number>();
        const queue = [0];
        while (queue.length > 0) {
          const idx = queue.shift()!;
          if (reachableSet.has(idx)) continue;
          reachableSet.add(idx);
          const entry = flowMap[idx];
          if (entry) {
            for (const conn of entry.connectsTo) {
              if (conn.targetIndex >= 0 && !reachableSet.has(conn.targetIndex)) {
                queue.push(conn.targetIndex);
              }
            }
          }
        }
        const orphanSteps = flowMap.filter((_, idx) => !reachableSet.has(idx));

        if (orphanSteps.length > 0) {
          asciiLines.push("");
          asciiLines.push("⚠️ DISCONNECTED STEPS (not reachable from Step 0):");
          asciiLines.push("==================================================");
          orphanSteps.forEach((entry) => {
            asciiLines.push(`  [${entry.index}] ${entry.step} — NO incoming navigation path`);
          });
          asciiLines.push("");
          asciiLines.push("FIX: These steps need a navigation.next from another step pointing to them,");
          asciiLines.push("     or a segment-picker option with nextStep targeting their step ID.");
        }

        sections["flowMap"] = {
          ascii: asciiLines.join("\n"),
          connections: flowMap,
          orphanSteps: orphanSteps.map((e) => ({ index: e.index, title: e.step })),
        };
      }
    }

    if (activeSection === "selected" || activeSection === "full") {
      const step = funnel?.steps.find((s) => s.id === selectedStepId);
      const widget = step?.widgets.find((w) => w.instanceId === selectedWidgetId);
      sections["selectedStep"] = step
        ? {
            id: step.id,
            title: step.title,
            layout: step.layout,
            navigation: step.navigation,
            widgets: step.widgets.map((w, i) => ({
              index: i,
              instanceId: w.instanceId,
              templateId: w.templateId,
              config: w.config,
              bindings: w.bindings,
            })),
          }
        : null;
      sections["selectedWidget"] = widget
        ? {
            instanceId: widget.instanceId,
            templateId: widget.templateId,
            config: widget.config,
            bindings: widget.bindings,
          }
        : null;
    }

    if (activeSection === "venue" || activeSection === "full") {
      sections["venueData"] = venueData
        ? {
            venueName: venueData.venueName,
            currency: venueData.currency,
            taxRates: venueData.taxRates,
            roomCount: venueData.rooms.length,
            rooms: venueData.rooms,
            mealCount: venueData.meals.length,
            meals: venueData.meals,
            activityCount: venueData.activities.length,
            activities: venueData.activities,
            genericProductCategories: Object.keys(venueData.genericProducts),
            genericProducts: venueData.genericProducts,
            categories: venueData.categories,
          }
        : "NOT LOADED — no venue data in store";
    }

    if (activeSection === "ai" || activeSection === "full") {
      // Last 10 messages to keep it manageable
      sections["aiMessages"] = messages.slice(-10).map((m, i) => ({
        index: messages.length - 10 + i,
        role: m.role,
        content: m.content?.substring(0, 500) + (m.content && m.content.length > 500 ? "...[truncated]" : ""),
        hasImages: (m.images?.length ?? 0) > 0,
        hasFiles: (m.files?.length ?? 0) > 0,
        toolCalls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          name: tc.name,
          input: tc.input,
          result: tc.result,
          generating: tc.generating,
        })),
      }));
    }

    return JSON.stringify(sections, null, 2);
  }, [activeSection, funnel, selectedStepId, selectedWidgetId, venueData, messages, selectedModel, accountContext]);

  const handleCopy = useCallback(() => {
    const text = buildDiagnostics();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [buildDiagnostics]);

  if (!open) return null;

  const tabs: { id: DiagSection; label: string; desc: string }[] = [
    { id: "overview", label: "Funnel", desc: "All steps, widgets, configs, theme" },
    { id: "flow", label: "Flow Map", desc: "Connection graph: which step connects where and why" },
    { id: "selected", label: "Selected", desc: "Currently selected step & widget" },
    { id: "venue", label: "Venue", desc: "Venue data store (rooms, meals, etc.)" },
    { id: "ai", label: "AI Chat", desc: "Last 10 AI messages & tool calls" },
    { id: "full", label: "Full Dump", desc: "Everything combined" },
  ];

  const diagnosticText = buildDiagnostics();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-w-[90vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">🔧</span>
            <h3 className="text-sm font-semibold text-gray-800">Diagnostics</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
              style={!copied ? { backgroundColor: "#006c4b" } : {}}
            >
              {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2 border-b border-gray-100 flex gap-1 shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              title={tab.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === tab.id
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-[11px] leading-relaxed font-mono text-gray-700 whitespace-pre-wrap break-words">
            {diagnosticText}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-gray-100 shrink-0">
          <p className="text-[10px] text-gray-400">
            Copy the diagnostics above and paste into Claude Code for debugging. Use &quot;Selected&quot; tab for widget-specific issues, &quot;Venue&quot; tab for data issues.
          </p>
        </div>
      </div>
    </div>
  );
}
