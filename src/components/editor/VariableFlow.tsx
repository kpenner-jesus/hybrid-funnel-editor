"use client";

import React from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { getDataFlowGraph } from "@/lib/variable-engine";
import { widgetTemplateRegistry } from "@/lib/widget-templates";

interface VariableFlowProps {
  onNavigateToWidget?: (stepId: string, widgetId: string) => void;
}

export function VariableFlow({ onNavigateToWidget }: VariableFlowProps) {
  // Subscribe to funnel AND step/widget changes to ensure re-render on add/remove/move
  const funnel = useFunnelStore((s) => s.funnel);
  // Force re-compute when widget count changes
  const widgetCount = funnel?.steps.reduce((a, s) => a + s.widgets.length, 0) || 0;

  if (!funnel) {
    return (
      <div className="text-center py-8 text-sm text-on-surface-variant">
        Load a funnel to see the variable flow.
      </div>
    );
  }

  const { nodes, edges } = getDataFlowGraph(funnel);
  const variableNodes = nodes.filter((n) => n.type === "variable");
  const widgetNodes = nodes.filter((n) => n.type === "widget");

  // Group widgets by step
  const stepGroups: Record<string, typeof widgetNodes> = {};
  for (const wn of widgetNodes) {
    const stepId = wn.stepId || "unknown";
    if (!stepGroups[stepId]) stepGroups[stepId] = [];
    stepGroups[stepId].push(wn);
  }

  // Find the first writer widget for a variable
  const findFirstWriter = (varName: string): { stepId: string; widgetId: string } | null => {
    const writerEdges = edges.filter((e) => e.to === `var:${varName}`);
    if (writerEdges.length === 0) return null;
    const writerNodeId = writerEdges[0].from; // e.g., "widget:stepId.widgetId"
    const match = writerNodeId.match(/^widget:(.+)\.(.+)$/);
    if (!match) return null;
    return { stepId: match[1], widgetId: match[2] };
  };

  // Find the first reader widget for a variable
  const findFirstReader = (varName: string): { stepId: string; widgetId: string } | null => {
    const readerEdges = edges.filter((e) => e.from === `var:${varName}`);
    if (readerEdges.length === 0) return null;
    const readerNodeId = readerEdges[0].to;
    const match = readerNodeId.match(/^widget:(.+)\.(.+)$/);
    if (!match) return null;
    return { stepId: match[1], widgetId: match[2] };
  };

  const handleVariableClick = (varName: string) => {
    if (!onNavigateToWidget) return;
    // Navigate to first writer, or first reader if no writers
    const target = findFirstWriter(varName) || findFirstReader(varName);
    if (target) {
      onNavigateToWidget(target.stepId, target.widgetId);
    }
  };

  const handleWidgetClick = (stepId: string, widgetId: string) => {
    if (!onNavigateToWidget) return;
    onNavigateToWidget(stepId, widgetId);
  };

  return (
    <div className="space-y-5">
      <div className="text-xs text-on-surface-variant">
        Shows how variables flow between steps and widgets. <strong>Click any item to navigate to it in the Flow view.</strong>
      </div>

      {/* Variable List */}
      <div>
        <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">
          Variables ({variableNodes.length})
        </div>
        <div className="space-y-1">
          {funnel.variables.map((v) => {
            const connectedEdges = edges.filter(
              (e) => e.from === `var:${v.name}` || e.to === `var:${v.name}`
            );
            const inputEdges = edges.filter((e) => e.to === `var:${v.name}`);
            const outputEdges = edges.filter((e) => e.from === `var:${v.name}`);
            const hasTarget = findFirstWriter(v.name) || findFirstReader(v.name);

            return (
              <div
                key={v.name}
                onClick={() => handleVariableClick(v.name)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  hasTarget ? "cursor-pointer hover:bg-primary/5 hover:border-primary/50" : ""
                } ${
                  connectedEdges.length > 0
                    ? "border-primary/30 bg-primary-light/20"
                    : "border-outline-variant bg-white"
                }`}
                title={hasTarget ? "Click to navigate to this variable in the Flow view" : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium text-xs">{v.label || v.name}</span>
                    <span className="text-[10px] text-outline font-mono">{v.type}</span>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    {inputEdges.length > 0 && (
                      <span className="text-secondary">{inputEdges.length} writer{inputEdges.length !== 1 ? "s" : ""}</span>
                    )}
                    {outputEdges.length > 0 && (
                      <span className="text-primary">{outputEdges.length} reader{outputEdges.length !== 1 ? "s" : ""}</span>
                    )}
                    {connectedEdges.length === 0 && (
                      <span className="text-outline">unused</span>
                    )}
                    {hasTarget && (
                      <span className="text-primary opacity-50">→</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Flow by Step */}
      <div>
        <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">
          Data Flow
        </div>
        <div className="space-y-3">
          {funnel.steps.map((step) => {
            const stepWidgets = stepGroups[step.id] || [];
            return (
              <div key={step.id} className="border border-outline-variant rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-surface-dim text-xs font-medium">
                  {step.title}
                </div>
                {stepWidgets.length > 0 ? (
                  <div className="p-2 space-y-2">
                    {step.widgets.map((widget) => {
                      const template = widgetTemplateRegistry[widget.templateId];
                      const widgetNodeId = `widget:${step.id}.${widget.instanceId}`;
                      const inEdges = edges.filter((e) => e.to === widgetNodeId);
                      const outEdges = edges.filter((e) => e.from === widgetNodeId);

                      return (
                        <div
                          key={widget.instanceId}
                          onClick={() => handleWidgetClick(step.id, widget.instanceId)}
                          className="px-2 py-1.5 rounded bg-white border border-outline-variant/50 cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-colors"
                          title="Click to navigate to this widget in the Flow view"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{template?.icon || "?"}</span>
                            <span className="text-xs font-medium">{template?.name || widget.templateId}</span>
                            <span className="ml-auto text-primary opacity-50 text-[10px]">→</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                            {inEdges.map((e) => (
                              <span key={e.from + e.label} className="text-primary">
                                &#8592; {e.label}
                              </span>
                            ))}
                            {outEdges.map((e) => (
                              <span key={e.to + e.label} className="text-secondary">
                                &#8594; {e.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2 text-[10px] text-outline">No widgets</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
