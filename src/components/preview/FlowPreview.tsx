"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { WidgetRenderer } from "./WidgetRenderer";
import type { WidgetInstance, ThemeConfig, Step, FunnelDefinition } from "@/lib/types";

// --- Connection arrow data ---
interface Connection {
  fromStepId: string;
  toStepId: string;
  label?: string;
  color: string;
}

const SEGMENT_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c",
  "#059669", "#d97706", "#6366f1", "#0891b2",
];

function deriveConnections(funnel: FunnelDefinition): Connection[] {
  const connections: Connection[] = [];
  const stepIdToIndex = new Map<string, number>();
  funnel.steps.forEach((s, i) => stepIdToIndex.set(s.id, i));

  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];

    // Check segment picker for branches
    const segWidget = step.widgets.find((w) => w.templateId === "segment-picker");
    if (segWidget) {
      let options: Array<{ id?: string; label?: string; nextStep?: string }> = [];
      try {
        const raw = segWidget.config.options;
        if (typeof raw === "string") options = JSON.parse(raw);
        else if (Array.isArray(raw)) options = raw;
      } catch { /* ignore */ }

      const branches = options.filter((o) => o.nextStep && stepIdToIndex.has(o.nextStep!));
      if (branches.length > 0) {
        branches.forEach((opt, oi) => {
          connections.push({
            fromStepId: step.id,
            toStepId: opt.nextStep!,
            label: opt.label || opt.id,
            color: SEGMENT_COLORS[oi % SEGMENT_COLORS.length],
          });
        });
        continue;
      }

      // Implied branches: one per option to next N steps
      if (options.length > 1 && i < funnel.steps.length - 1) {
        const available = funnel.steps.length - i - 1;
        if (available >= options.length) {
          options.forEach((opt, oi) => {
            const targetIdx = i + 1 + oi;
            if (targetIdx < funnel.steps.length) {
              connections.push({
                fromStepId: step.id,
                toStepId: funnel.steps[targetIdx].id,
                label: opt.label || opt.id,
                color: SEGMENT_COLORS[oi % SEGMENT_COLORS.length],
              });
            }
          });
          continue;
        }
      }
    }

    // Explicit nav target
    if (step.navigation.next && stepIdToIndex.has(step.navigation.next)) {
      connections.push({
        fromStepId: step.id,
        toStepId: step.navigation.next,
        color: "#64748b",
      });
      continue;
    }

    // Default: next step
    if (i < funnel.steps.length - 1) {
      connections.push({
        fromStepId: step.id,
        toStepId: funnel.steps[i + 1].id,
        color: "#94a3b8",
      });
    }
  }

  return connections;
}

// --- Main Flow Preview ---

export function FlowPreview() {
  const {
    funnel,
    previewStep,
    setPreviewStep,
    selectedWidgetId,
    selectWidget,
    selectStep,
    setWidgetOutput,
    resolveWidgetInputs,
  } = useFunnelStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Step element refs for drawing connections
  const stepRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [, forceUpdate] = useState(0);

  // Force re-render after mount so connection lines can measure positions
  useEffect(() => {
    const timer = setTimeout(() => forceUpdate((n) => n + 1), 100);
    return () => clearTimeout(timer);
  }, [funnel?.steps.length, zoom]);

  // Zoom with scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((prev) => Math.max(0.15, Math.min(1.5, prev + delta)));
  }, []);

  // Pan with mouse drag on background
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-step-card]")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    document.body.style.cursor = "grabbing";
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    document.body.style.cursor = "";
  }, []);

  if (!funnel || funnel.steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        No steps to preview.
      </div>
    );
  }

  const connections = deriveConnections(funnel);
  const STEP_WIDTH = 420;
  const STEP_GAP = 60;

  // Build connection lines as SVG
  const svgLines: React.ReactNode[] = [];
  connections.forEach((conn, ci) => {
    const fromEl = stepRefs.current.get(conn.fromStepId);
    const toEl = stepRefs.current.get(conn.toStepId);
    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    // Convert to container-relative coordinates, accounting for zoom and pan
    const fromX = (fromRect.left + fromRect.width / 2 - cRect.left - pan.x) / zoom;
    const fromY = (fromRect.bottom - cRect.top - pan.y) / zoom;
    const toX = (toRect.left + toRect.width / 2 - cRect.left - pan.x) / zoom;
    const toY = (toRect.top - cRect.top - pan.y) / zoom;

    const midY = (fromY + toY) / 2;

    svgLines.push(
      <g key={`conn-${ci}`}>
        <path
          d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
          fill="none"
          stroke={conn.color}
          strokeWidth={2 / zoom}
          strokeDasharray={conn.label ? `${6 / zoom},${4 / zoom}` : "none"}
          markerEnd={`url(#arrow-${ci})`}
        />
        {conn.label && (
          <>
            <rect
              x={(fromX + toX) / 2 - (conn.label.length * 3.5) / zoom}
              y={midY - 8 / zoom}
              width={(conn.label.length * 7) / zoom}
              height={16 / zoom}
              rx={4 / zoom}
              fill="white"
              stroke={conn.color}
              strokeWidth={1 / zoom}
            />
            <text
              x={(fromX + toX) / 2}
              y={midY + 3 / zoom}
              textAnchor="middle"
              fontSize={9 / zoom}
              fontWeight={600}
              fill={conn.color}
            >
              {conn.label}
            </text>
          </>
        )}
        <defs>
          <marker
            id={`arrow-${ci}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth={8 / zoom}
            markerHeight={8 / zoom}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={conn.color} />
          </marker>
        </defs>
      </g>
    );
  });

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden relative bg-gray-50"
      style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 px-1 py-0.5">
        <button
          onClick={() => setZoom((z) => Math.max(0.15, z - 0.1))}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 text-lg font-bold"
        >
          −
        </button>
        <span className="text-[10px] text-gray-500 w-10 text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 text-lg font-bold"
        >
          +
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <button
          onClick={() => { setZoom(0.5); setPan({ x: 20, y: 20 }); }}
          className="px-2 h-7 flex items-center justify-center text-[10px] text-gray-500 hover:text-gray-800"
        >
          Fit
        </button>
      </div>

      {/* SVG overlay for connection arrows */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {svgLines}
        </g>
      </svg>

      {/* Zoomable/pannable content */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: STEP_WIDTH + 40,
        }}
      >
        {funnel.steps.map((step, i) => {
          const isActive = step.id === previewStep;

          return (
            <div
              key={step.id}
              data-step-card
              ref={(el) => {
                if (el) stepRefs.current.set(step.id, el);
                else stepRefs.current.delete(step.id);
              }}
              onClick={() => {
                setPreviewStep(step.id);
                selectStep(step.id);
              }}
              className="transition-all"
              style={{
                width: STEP_WIDTH,
                marginBottom: STEP_GAP,
                marginLeft: 20,
                border: isActive
                  ? `3px solid ${funnel.theme.primaryColor}`
                  : "2px solid #e2e8f0",
                borderRadius: 12,
                backgroundColor: funnel.theme.surfaceColor || "#fff",
                boxShadow: isActive
                  ? `0 0 0 3px ${funnel.theme.primaryColor}30, 0 4px 12px rgba(0,0,0,0.1)`
                  : "0 1px 4px rgba(0,0,0,0.06)",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* Step header badge */}
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: 16,
                  backgroundColor: isActive ? funnel.theme.primaryColor : "#64748b",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              >
                <span>Step {i + 1}</span>
                <span style={{ opacity: 0.7, fontWeight: 400 }}>
                  {step.title || "Untitled"}
                </span>
              </div>

              {/* Step content */}
              <div className="p-4 pt-5 space-y-3">
                <h3
                  style={{
                    fontFamily: funnel.theme.headlineFont,
                    color: funnel.theme.primaryColor,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {step.title}
                </h3>

                {step.widgets.length === 0 ? (
                  <div className="text-center py-6 text-gray-300 text-xs border border-dashed border-gray-200 rounded-lg">
                    No widgets
                  </div>
                ) : (
                  step.widgets.map((widget) => (
                    <FlowWidgetRenderer
                      key={widget.instanceId}
                      widget={widget}
                      theme={funnel.theme}
                      isSelected={selectedWidgetId === widget.instanceId}
                      onClick={() => {
                        selectStep(step.id);
                        selectWidget(widget.instanceId);
                      }}
                      resolveWidgetInputs={resolveWidgetInputs}
                      setWidgetOutput={setWidgetOutput}
                    />
                  ))
                )}
              </div>

              {/* Navigation buttons */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                {i > 0 && (
                  <span className="text-[10px] text-gray-400 border border-gray-200 px-2 py-0.5 rounded">
                    {step.navigation.backLabel || "← Back"}
                  </span>
                )}
                <span />
                {i < funnel.steps.length - 1 && (
                  <span
                    className="text-[10px] text-white px-2 py-0.5 rounded"
                    style={{ backgroundColor: funnel.theme.primaryColor }}
                  >
                    {step.navigation.nextLabel || "Continue →"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Widget wrapper for flow preview ---
function FlowWidgetRenderer({
  widget,
  theme,
  isSelected,
  onClick,
  resolveWidgetInputs,
  setWidgetOutput,
}: {
  widget: WidgetInstance;
  theme: ThemeConfig;
  isSelected: boolean;
  onClick: () => void;
  resolveWidgetInputs: (widget: WidgetInstance) => Record<string, unknown>;
  setWidgetOutput: (key: string, outputs: Record<string, unknown>) => void;
}) {
  const resolvedInputs = resolveWidgetInputs(widget);
  const handleOutput = useCallback(
    (outputs: Record<string, unknown>) => {
      setWidgetOutput(widget.instanceId, outputs);
    },
    [widget.instanceId, setWidgetOutput]
  );

  return (
    <WidgetRenderer
      widget={widget}
      theme={theme}
      isSelected={isSelected}
      onClick={onClick}
      resolvedInputs={resolvedInputs}
      onOutput={handleOutput}
    />
  );
}
