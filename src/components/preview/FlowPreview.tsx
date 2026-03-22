"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { WidgetRenderer } from "./WidgetRenderer";
import type { WidgetInstance, ThemeConfig, Step, FunnelDefinition } from "@/lib/types";

// --- Connection data ---
interface Connection {
  fromStepId: string;
  toStepId: string;
  label?: string;
  color: string;
  segmentOptionId?: string; // For wired mode: the segment option element to source from
}

const SEGMENT_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c",
  "#059669", "#d97706", "#6366f1", "#0891b2",
];

// --- Layout row: either a single step or parallel columns ---
interface LayoutRow {
  type: "single" | "parallel" | "orphan";
  stepIds: string[]; // single: [id], parallel: [id1, id2, ...], orphan: [id1, id2, ...]
  colors?: string[]; // segment colors for parallel columns
  labels?: string[]; // segment labels for parallel columns
}

// --- Derive connections ---
function deriveConnections(funnel: FunnelDefinition): {
  connections: Connection[];
  branchMap: Map<string, { targets: string[]; labels: string[]; colors: string[] }>;
} {
  const connections: Connection[] = [];
  const branchMap = new Map<string, { targets: string[]; labels: string[]; colors: string[] }>();
  const stepIdToIndex = new Map<string, number>();
  funnel.steps.forEach((s, i) => stepIdToIndex.set(s.id, i));

  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];
    const segWidget = step.widgets.find((w) => w.templateId === "segment-picker");

    if (segWidget) {
      let options: Array<{ id?: string; label?: string; nextStep?: string }> = [];
      try {
        const raw = segWidget.config.options;
        if (typeof raw === "string") options = JSON.parse(raw);
        else if (Array.isArray(raw)) options = raw;
      } catch { /* ignore */ }

      // Explicit branches
      const branches = options.filter((o) => o.nextStep && stepIdToIndex.has(o.nextStep!));
      if (branches.length > 0) {
        const targets: string[] = [];
        const labels: string[] = [];
        const colors: string[] = [];
        branches.forEach((opt, oi) => {
          const color = SEGMENT_COLORS[oi % SEGMENT_COLORS.length];
          targets.push(opt.nextStep!);
          labels.push(opt.label || opt.id || `Option ${oi + 1}`);
          colors.push(color);
          connections.push({ fromStepId: step.id, toStepId: opt.nextStep!, label: opt.label || opt.id, color, segmentOptionId: opt.id });
        });
        branchMap.set(step.id, { targets, labels, colors });
        continue;
      }

      // Implied branches
      if (options.length > 1 && i < funnel.steps.length - 1) {
        const available = funnel.steps.length - i - 1;
        if (available >= options.length) {
          const targets: string[] = [];
          const labels: string[] = [];
          const colors: string[] = [];
          options.forEach((opt, oi) => {
            const targetIdx = i + 1 + oi;
            if (targetIdx < funnel.steps.length) {
              const color = SEGMENT_COLORS[oi % SEGMENT_COLORS.length];
              const target = funnel.steps[targetIdx];
              targets.push(target.id);
              labels.push(opt.label || opt.id || `Option ${oi + 1}`);
              colors.push(color);
              connections.push({ fromStepId: step.id, toStepId: target.id, label: opt.label || opt.id, color, segmentOptionId: opt.id });
            }
          });
          branchMap.set(step.id, { targets, labels, colors });
          continue;
        }
      }
    }

    // Explicit nav
    if (step.navigation.next && stepIdToIndex.has(step.navigation.next)) {
      connections.push({ fromStepId: step.id, toStepId: step.navigation.next, color: "#64748b" });
      continue;
    }

    // Default: next step
    if (i < funnel.steps.length - 1) {
      connections.push({ fromStepId: step.id, toStepId: funnel.steps[i + 1].id, color: "#94a3b8" });
    }
  }

  return { connections, branchMap };
}

// --- Build layout rows with full path tracing ---
// Traces ALL paths through the funnel (not just segment-picker branches)
// to detect which steps are branch-exclusive vs shared convergence points
function buildLayoutRows(
  funnel: FunnelDefinition,
  branchMap: Map<string, { targets: string[]; labels: string[]; colors: string[] }>
): LayoutRow[] {
  if (funnel.steps.length === 0) return [];

  const stepIdToIdx = new Map<string, number>();
  funnel.steps.forEach((s, i) => stepIdToIdx.set(s.id, i));

  // 1. Build adjacency: for each step, where does it go?
  const nextMap = new Map<string, string>(); // stepId → next stepId
  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];
    // Check navigation.next first
    if (step.navigation.next && stepIdToIdx.has(step.navigation.next)) {
      nextMap.set(step.id, step.navigation.next);
    } else if (i < funnel.steps.length - 1) {
      // Default: next step in list (unless this step has segment-picker branches)
      const hasBranch = branchMap.has(step.id);
      if (!hasBranch) {
        nextMap.set(step.id, funnel.steps[i + 1].id);
      }
    }
  }

  // 2. Find the first branching point (segment-picker with multiple targets)
  let branchStepId: string | null = null;
  let branchInfo: { targets: string[]; labels: string[]; colors: string[] } | null = null;
  for (const [stepId, info] of branchMap) {
    if (info.targets.length > 1) {
      branchStepId = stepId;
      branchInfo = info;
      break;
    }
  }

  // 3. If no branching, just list all steps linearly
  if (!branchStepId || !branchInfo) {
    return funnel.steps.map((s) => ({ type: "single" as const, stepIds: [s.id] }));
  }

  // 4. Trace each branch path to find which steps are branch-exclusive
  // Tag each step with which branch indices can reach it
  const stepBranches = new Map<string, Set<number>>(); // stepId → set of branch indices
  const branchTargets = branchInfo.targets;

  for (let bi = 0; bi < branchTargets.length; bi++) {
    let current = branchTargets[bi];
    const visited = new Set<string>();
    while (current && !visited.has(current)) {
      visited.add(current);
      if (!stepBranches.has(current)) stepBranches.set(current, new Set());
      stepBranches.get(current)!.add(bi);
      current = nextMap.get(current) || "";
    }
  }

  // 4b. Reverse propagation for orphan steps:
  // Build reverse map (who navigates TO each step?)
  const incomingMap = new Map<string, string[]>();
  for (const [from, to] of nextMap) {
    if (!incomingMap.has(to)) incomingMap.set(to, []);
    incomingMap.get(to)!.push(from);
  }
  // Also add segment picker branch targets
  for (const target of branchTargets) {
    if (!incomingMap.has(target)) incomingMap.set(target, []);
    incomingMap.get(target)!.push(branchStepId);
  }

  // For steps with no branch tags, try to inherit from incoming connections
  // Repeat until stable
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    for (const step of funnel.steps) {
      if (step.id === branchStepId) continue;
      const existing = stepBranches.get(step.id);
      if (existing && existing.size > 0) continue; // already tagged

      // Check incoming connections
      const sources = incomingMap.get(step.id) || [];
      for (const srcId of sources) {
        const srcBranches = stepBranches.get(srcId);
        if (srcBranches && srcBranches.size > 0) {
          if (!stepBranches.has(step.id)) stepBranches.set(step.id, new Set());
          for (const b of srcBranches) stepBranches.get(step.id)!.add(b);
          changed = true;
        }
      }
    }
    // Forward propagate from newly tagged steps
    if (changed) {
      for (const step of funnel.steps) {
        const tags = stepBranches.get(step.id);
        if (!tags || tags.size === 0) continue;
        const nextId = nextMap.get(step.id);
        if (nextId) {
          if (!stepBranches.has(nextId)) stepBranches.set(nextId, new Set());
          const nextTags = stepBranches.get(nextId)!;
          for (const b of tags) {
            if (!nextTags.has(b)) { nextTags.add(b); changed = true; }
          }
        }
      }
    }
  }

  // 5. Build layout rows by processing steps in order
  const rows: LayoutRow[] = [];
  const placed = new Set<string>();

  // Place steps BEFORE the branch point
  for (const step of funnel.steps) {
    if (step.id === branchStepId) break;
    if (placed.has(step.id)) continue;
    rows.push({ type: "single", stepIds: [step.id] });
    placed.add(step.id);
  }

  // Place the branch point itself
  rows.push({ type: "single", stepIds: [branchStepId] });
  placed.add(branchStepId);

  // 6. Process remaining steps, grouping by branch membership
  // Collect steps that haven't been placed yet
  const remaining = funnel.steps.filter((s) => !placed.has(s.id));

  // Group steps into parallel columns based on branch membership
  // A step NOT reachable from ALL branches is branch-specific and should be
  // placed side-by-side with steps from other branches at the same "level"
  let i = 0;
  while (i < remaining.length) {
    const step = remaining[i];
    if (placed.has(step.id)) { i++; continue; }
    const branches = stepBranches.get(step.id);

    if (!branches || branches.size === 0) {
      // NOT reachable from ANY branch = ORPHAN step
      // Collect consecutive orphans into one orphan group
      const orphanGroup: string[] = [step.id];
      placed.add(step.id);
      for (let j = i + 1; j < remaining.length; j++) {
        const ns = remaining[j];
        if (placed.has(ns.id)) continue;
        const nb = stepBranches.get(ns.id);
        if (!nb || nb.size === 0) {
          orphanGroup.push(ns.id);
          placed.add(ns.id);
        } else {
          break;
        }
      }
      rows.push({ type: "orphan", stepIds: orphanGroup });
      i++;
    } else if (branches.size === branchTargets.length) {
      // Reachable from ALL branches = convergence point → single row
      rows.push({ type: "single", stepIds: [step.id] });
      placed.add(step.id);
      i++;
    } else {
      // This step is branch-specific (reachable from SOME but not ALL branches)
      // Collect nearby unplaced steps that cover DIFFERENT branches for parallel layout
      // Use the "primary branch" = lowest branch index in the set
      const primaryBranch = Math.min(...branches);
      const parallelGroup: { stepId: string; branchSet: Set<number>; primaryBranch: number }[] = [
        { stepId: step.id, branchSet: branches, primaryBranch }
      ];
      placed.add(step.id);

      // Look ahead for steps covering different branches
      for (let j = i + 1; j < remaining.length; j++) {
        const nextStep = remaining[j];
        if (placed.has(nextStep.id)) continue;
        const nb = stepBranches.get(nextStep.id);
        if (!nb || nb.size === 0 || nb.size === branchTargets.length) {
          break; // Hit convergence, stop collecting
        }
        const nextPrimary = Math.min(...nb);
        // Check if this step covers different branches than already collected
        const overlaps = parallelGroup.some((g) => {
          for (const b of nb) { if (g.branchSet.has(b)) return true; }
          return false;
        });
        if (!overlaps) {
          // Non-overlapping branch set — add to parallel group
          parallelGroup.push({ stepId: nextStep.id, branchSet: nb, primaryBranch: nextPrimary });
          placed.add(nextStep.id);
        }
      }

      if (parallelGroup.length > 1) {
        // Sort by primary branch for consistent ordering
        parallelGroup.sort((a, b) => a.primaryBranch - b.primaryBranch);
        rows.push({
          type: "parallel",
          stepIds: parallelGroup.map((g) => g.stepId),
          colors: parallelGroup.map((g) => branchInfo!.colors[g.primaryBranch] || "#94a3b8"),
          labels: parallelGroup.map((g) => branchInfo!.labels[g.primaryBranch] || ""),
        });
      } else {
        // Only one step with this branch set — place as single with branch color
        rows.push({ type: "single", stepIds: [step.id] });
      }
      i++;
    }
  }

  // 7. Add any steps that weren't placed (shouldn't happen but safety)
  for (const step of funnel.steps) {
    if (!placed.has(step.id)) {
      rows.push({ type: "single", stepIds: [step.id] });
    }
  }

  return rows;
}

// --- Step Card Component ---
function StepCard({
  step,
  stepIndex,
  isActive,
  theme,
  selectedWidgetId,
  borderColor,
  onStepClick,
  onWidgetClick,
  onWidgetDoubleClick,
  resolveWidgetInputs,
  setWidgetOutput,
  stepRef,
}: {
  step: Step;
  stepIndex: number;
  isActive: boolean;
  theme: ThemeConfig;
  selectedWidgetId: string | null;
  borderColor?: string;
  onStepClick: () => void;
  onWidgetClick: (widgetId: string) => void;
  onWidgetDoubleClick?: (widgetId: string) => void;
  resolveWidgetInputs: (widget: WidgetInstance) => Record<string, unknown>;
  setWidgetOutput: (key: string, outputs: Record<string, unknown>) => void;
  stepRef: (el: HTMLDivElement | null) => void;
}) {
  const cardBorder = isActive ? theme.primaryColor : borderColor || "#e2e8f0";

  return (
    <div
      data-step-card
      ref={stepRef}
      onClick={onStepClick}
      style={{
        width: 380,
        border: `${isActive ? 3 : 2}px solid ${cardBorder}`,
        borderRadius: 12,
        backgroundColor: theme.surfaceColor || "#fff",
        boxShadow: isActive
          ? `0 0 0 3px ${theme.primaryColor}30, 0 4px 12px rgba(0,0,0,0.1)`
          : "0 1px 4px rgba(0,0,0,0.06)",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Badge */}
      <div
        style={{
          position: "absolute", top: -14, left: 16,
          backgroundColor: isActive ? theme.primaryColor : borderColor || "#64748b",
          color: "#fff", fontSize: 11, fontWeight: 700,
          padding: "2px 10px", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          maxWidth: 300, overflow: "hidden",
        }}
      >
        <span>Step {stepIndex + 1}</span>
        <span style={{ opacity: 0.7, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {step.title || "Untitled"}
        </span>
      </div>

      <div className="p-4 pt-5 space-y-3">
        <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor, fontSize: 15, fontWeight: 700 }}>
          {step.title}
        </h3>
        {step.widgets.length === 0 ? (
          <div className="text-center py-4 text-gray-300 text-xs border border-dashed border-gray-200 rounded-lg">No widgets</div>
        ) : (
          step.widgets.map((widget) => (
            <div
              key={widget.instanceId}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onWidgetDoubleClick?.(widget.instanceId);
              }}
            >
              <FlowWidgetRenderer
                widget={widget}
                theme={theme}
                isSelected={selectedWidgetId === widget.instanceId}
                onClick={() => onWidgetClick(widget.instanceId)}
                resolveWidgetInputs={resolveWidgetInputs}
                setWidgetOutput={setWidgetOutput}
              />
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
        {stepIndex > 0 ? (
          <span className="text-[10px] text-gray-400 border border-gray-200 px-2 py-0.5 rounded">
            {step.navigation.backLabel || "← Back"}
          </span>
        ) : <span />}
        <span className="text-[10px] text-white px-2 py-0.5 rounded" style={{ backgroundColor: theme.primaryColor }}>
          {step.navigation.nextLabel || "Continue →"}
        </span>
      </div>
    </div>
  );
}

// --- Main Flow Preview ---
export function FlowPreview({ onEditWidget }: { onEditWidget?: (stepId: string, widgetId: string) => void } = {}) {
  const {
    funnel, previewStep, setPreviewStep, selectedWidgetId,
    selectWidget, selectStep, setWidgetOutput, resolveWidgetInputs,
  } = useFunnelStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.25);
  const [pan, setPan] = useState({ x: 0, y: 20 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasInitialized = useRef(false);
  const stepRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [renderKey, setRenderKey] = useState(0);
  const [wiredMode, setWiredMode] = useState(false); // Lines from segment option buttons

  // Re-render for SVG after layout settles
  useEffect(() => {
    const t = setTimeout(() => setRenderKey((n) => n + 1), 150);
    return () => clearTimeout(t);
  }, [funnel?.steps.length, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.05, Math.min(1.5, prev + (e.deltaY > 0 ? -0.05 : 0.05))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-step-card]")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    document.body.style.cursor = "grabbing";
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan({ x: panStart.current.panX + e.clientX - panStart.current.x, y: panStart.current.panY + e.clientY - panStart.current.y });
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; document.body.style.cursor = ""; }, []);

  const { layoutRows, connections, stepIndexMap } = useMemo(() => {
    if (!funnel || funnel.steps.length === 0) return { layoutRows: [], connections: [], stepIndexMap: new Map<string, number>() };
    const { connections: conns, branchMap } = deriveConnections(funnel);
    const rows = buildLayoutRows(funnel, branchMap);
    const idxMap = new Map<string, number>();
    funnel.steps.forEach((s, i) => idxMap.set(s.id, i));
    return { layoutRows: rows, connections: conns, stepIndexMap: idxMap };
  }, [funnel]);

  // Calculate content width from layout rows (used for centering + explicit width)
  const CARD_W = 380;
  const PARALLEL_GAP = 30;
  const contentWidth = useMemo(() => {
    let maxW = CARD_W;
    for (const row of layoutRows) {
      if (row.type === "parallel") {
        const rowW = row.stepIds.length * CARD_W + (row.stepIds.length - 1) * PARALLEL_GAP;
        if (rowW > maxW) maxW = rowW;
      }
    }
    // Add 15% buffer — rendered content is wider than card math due to
    // segment labels, borders, badge overflows, and flex gap rounding
    return Math.round(maxW * 1.15);
  }, [layoutRows]);

  // Center on initial load
  useEffect(() => {
    if (hasInitialized.current || !containerRef.current || !funnel?.steps.length) return;
    hasInitialized.current = true;

    const cw = containerRef.current.clientWidth;
    // Zoom to fill 85% of viewport width, cap at 80%
    const targetZoom = Math.min(0.80, (cw * 0.85) / contentWidth);
    const scaledW = contentWidth * targetZoom;
    const centerX = (cw - scaledW) / 2;

    setZoom(targetZoom);
    setPan({ x: Math.max(10, centerX), y: 15 });
    // centering confirmed working — viewport, contentWidth, zoom, pan all verified
  }, [funnel?.steps.length, contentWidth, layoutRows.length]);

  if (!funnel || funnel.steps.length === 0) {
    return <div className="h-full flex items-center justify-center text-sm text-gray-400">No steps to preview.</div>;
  }

  // Build SVG connection lines
  const svgLines: React.ReactNode[] = [];
  connections.forEach((conn, ci) => {
    const fromStepEl = stepRefs.current.get(conn.fromStepId);
    const toEl = stepRefs.current.get(conn.toStepId);
    if (!fromStepEl || !toEl || !containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();

    // In wired mode, try to find the actual segment option button element
    let fromEl = fromStepEl;
    if (wiredMode && conn.segmentOptionId) {
      const optEl = fromStepEl.querySelector(`[data-segment-option="${conn.segmentOptionId}"]`) as HTMLDivElement | null;
      if (optEl) fromEl = optEl;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // Source point: right edge of button in wired mode, bottom center of step otherwise
    let fromX: number, fromY: number;
    if (wiredMode && conn.segmentOptionId && fromEl !== fromStepEl) {
      fromX = (fromRect.right - cRect.left - pan.x) / zoom;
      fromY = (fromRect.top + fromRect.height / 2 - cRect.top - pan.y) / zoom;
    } else {
      fromX = (fromRect.left + fromRect.width / 2 - cRect.left - pan.x) / zoom;
      fromY = (fromRect.bottom - cRect.top - pan.y) / zoom;
    }

    const toX = (toRect.left + toRect.width / 2 - cRect.left - pan.x) / zoom;
    const toY = (toRect.top - cRect.top - pan.y) / zoom;

    // Different curve for wired mode (horizontal-first) vs normal (vertical)
    let pathD: string;
    if (wiredMode && conn.segmentOptionId && fromEl !== fromStepEl) {
      // Horizontal exit, then curve down to target
      const exitX = fromX + 30;
      pathD = `M ${fromX} ${fromY} L ${exitX} ${fromY} C ${exitX + 60} ${fromY}, ${toX} ${toY - 40}, ${toX} ${toY}`;
    } else {
      const midY = (fromY + toY) / 2;
      pathD = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
    }

    svgLines.push(
      <g key={`conn-${ci}-${renderKey}-${wiredMode}`}>
        <path
          d={pathD}
          fill="none" stroke={conn.color} strokeWidth={wiredMode ? 2 : 2.5}
          strokeDasharray={conn.label ? "8,4" : "none"}
          markerEnd={`url(#arrow-${ci})`}
        />
        {/* Only show labels in non-wired mode (wired mode labels are on the buttons) */}
        {!wiredMode && conn.label && (
          <>
            <rect
              x={(fromX + toX) / 2 - Math.min(conn.label.length * 4, 60)}
              y={(fromY + toY) / 2 - 10}
              width={Math.min(conn.label.length * 8, 120)}
              height={20} rx={4}
              fill="white" stroke={conn.color} strokeWidth={1}
            />
            <text x={(fromX + toX) / 2} y={(fromY + toY) / 2 + 4}
              textAnchor="middle" fontSize={10} fontWeight={600} fill={conn.color}>
              {conn.label}
            </text>
          </>
        )}
        <defs>
          <marker id={`arrow-${ci}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={8} markerHeight={8} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={conn.color} />
          </marker>
        </defs>
      </g>
    );
  });

  const ROW_GAP = 50;

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden relative bg-gray-50"
      style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
      onWheel={handleWheel} onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
    >
      {/* Zoom controls + Wired toggle — top-left so always visible */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 px-1 py-0.5">
        <button onClick={() => setZoom((z) => Math.max(0.05, z - 0.1))} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 text-lg font-bold">−</button>
        <span className="text-[10px] text-gray-500 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 text-lg font-bold">+</button>
        <div className="w-px h-5 bg-gray-200" />
        <button
          onClick={() => { setWiredMode((w) => !w); setTimeout(() => setRenderKey((n) => n + 1), 50); }}
          className={`px-2 h-7 flex items-center justify-center text-[10px] transition-colors ${
            wiredMode ? "text-blue-600 font-bold" : "text-gray-500 hover:text-gray-800"
          }`}
          title="Wired: show connection lines from actual buttons"
        >🔌 Wired</button>
        <div className="w-px h-5 bg-gray-200" />
        <button
          onClick={() => {
            if (!containerRef.current || !contentRef.current) return;
            const ch = containerRef.current.clientHeight;
            const cw = containerRef.current.clientWidth;
            const sw = contentRef.current.scrollWidth || 800;
            const sh = contentRef.current.scrollHeight || 4000;
            const fitZoom = Math.max(0.05, Math.min(0.6, Math.min(ch / sh, cw / sw) * 0.85));
            const centerX = (cw - sw * fitZoom) / 2;
            setZoom(fitZoom);
            setPan({ x: Math.max(10, centerX), y: 10 });
          }}
          className="px-2 h-7 flex items-center justify-center text-[10px] text-gray-500 hover:text-gray-800"
        >Fit</button>
      </div>

      {/* SVG overlay */}
      <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>{svgLines}</g>
      </svg>

      {/* Content — explicit width so centering works correctly */}
      <div
        ref={contentRef}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: ROW_GAP,
          paddingTop: 20,
          paddingBottom: 100,
          width: contentWidth,
        }}
      >
        {layoutRows.map((row, ri) => {
          if (row.type === "single") {
            const stepId = row.stepIds[0];
            const step = funnel.steps.find((s) => s.id === stepId);
            if (!step) return null;
            const idx = stepIndexMap.get(stepId) ?? 0;
            return (
              <StepCard
                key={stepId}
                step={step}
                stepIndex={idx}
                isActive={previewStep === stepId}
                theme={funnel.theme}
                selectedWidgetId={selectedWidgetId}
                onStepClick={() => { setPreviewStep(stepId); selectStep(stepId); }}
                onWidgetClick={(wid) => { selectStep(stepId); selectWidget(wid); }}
                onWidgetDoubleClick={(wid) => { onEditWidget?.(stepId, wid); }}
                resolveWidgetInputs={resolveWidgetInputs}
                setWidgetOutput={setWidgetOutput}
                stepRef={(el) => { if (el) stepRefs.current.set(stepId, el); else stepRefs.current.delete(stepId); }}
              />
            );
          }

          // Orphan row — disconnected steps, offset to the right with warning
          if (row.type === "orphan") {
            return (
              <div key={`orphan-${ri}`} style={{ display: "flex", gap: 20, alignItems: "flex-start", marginLeft: 120 }}>
                {/* Warning label */}
                <div style={{
                  writingMode: "vertical-rl", textOrientation: "mixed",
                  fontSize: 10, fontWeight: 700, color: "#dc2626",
                  padding: "8px 4px", backgroundColor: "#fef2f2",
                  border: "2px dashed #fca5a5", borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: 80,
                }}>
                  ⚠️ DISCONNECTED
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                  {row.stepIds.map((stepId) => {
                    const step = funnel.steps.find((s) => s.id === stepId);
                    if (!step) return null;
                    const idx = stepIndexMap.get(stepId) ?? 0;
                    return (
                      <StepCard
                        key={stepId}
                        step={step}
                        stepIndex={idx}
                        isActive={previewStep === stepId}
                        theme={funnel.theme}
                        selectedWidgetId={selectedWidgetId}
                        borderColor="#dc2626"
                        onStepClick={() => { setPreviewStep(stepId); selectStep(stepId); }}
                        onWidgetClick={(wid) => { selectStep(stepId); selectWidget(wid); }}
                        onWidgetDoubleClick={(wid) => { onEditWidget?.(stepId, wid); }}
                        resolveWidgetInputs={resolveWidgetInputs}
                        setWidgetOutput={setWidgetOutput}
                        stepRef={(el) => { if (el) stepRefs.current.set(stepId, el); else stepRefs.current.delete(stepId); }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          }

          // Parallel row
          return (
            <div key={`parallel-${ri}`} style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
              {row.stepIds.map((stepId, ci) => {
                const step = funnel.steps.find((s) => s.id === stepId);
                if (!step) return null;
                const idx = stepIndexMap.get(stepId) ?? 0;
                const color = row.colors?.[ci];
                return (
                  <div key={stepId} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {/* Segment label above the card */}
                    {row.labels?.[ci] && (
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: color || "#64748b",
                        marginBottom: 8, padding: "2px 10px",
                        border: `2px solid ${color || "#e2e8f0"}`,
                        borderRadius: 12, backgroundColor: `${color}10`,
                      }}>
                        {row.labels[ci]}
                      </div>
                    )}
                    <StepCard
                      step={step}
                      stepIndex={idx}
                      isActive={previewStep === stepId}
                      theme={funnel.theme}
                      selectedWidgetId={selectedWidgetId}
                      borderColor={color}
                      onStepClick={() => { setPreviewStep(stepId); selectStep(stepId); }}
                      onWidgetClick={(wid) => { selectStep(stepId); selectWidget(wid); }}
                      onWidgetDoubleClick={(wid) => { onEditWidget?.(stepId, wid); }}
                      resolveWidgetInputs={resolveWidgetInputs}
                      setWidgetOutput={setWidgetOutput}
                      stepRef={(el) => { if (el) stepRefs.current.set(stepId, el); else stepRefs.current.delete(stepId); }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* SVG z-order note: kept before content so lines go behind cards */}
    </div>
  );
}

// --- Widget wrapper ---
function FlowWidgetRenderer({
  widget, theme, isSelected, onClick, resolveWidgetInputs, setWidgetOutput,
}: {
  widget: WidgetInstance; theme: ThemeConfig; isSelected: boolean; onClick: () => void;
  resolveWidgetInputs: (widget: WidgetInstance) => Record<string, unknown>;
  setWidgetOutput: (key: string, outputs: Record<string, unknown>) => void;
}) {
  const resolvedInputs = resolveWidgetInputs(widget);
  const handleOutput = useCallback(
    (outputs: Record<string, unknown>) => { setWidgetOutput(widget.instanceId, outputs); },
    [widget.instanceId, setWidgetOutput]
  );
  return (
    <WidgetRenderer widget={widget} theme={theme} isSelected={isSelected}
      onClick={onClick} resolvedInputs={resolvedInputs} onOutput={handleOutput} />
  );
}
