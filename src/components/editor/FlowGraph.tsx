"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import { useFunnelStore } from "@/stores/funnel-store";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import type { Step, FunnelDefinition } from "@/lib/types";

// --- Segment colors for branching paths ---
const SEGMENT_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // purple
  "#db2777", // pink
  "#ea580c", // orange
  "#059669", // emerald
  "#d97706", // amber
  "#6366f1", // indigo
  "#0891b2", // cyan
];

// --- Node shape types ---
type NodeShape = "start" | "end" | "decision" | "step";

// --- Shared node data interface ---
interface FlowNodeData {
  step: Step;
  stepIndex: number;
  isActive: boolean;
  primaryColor: string;
  segmentColor?: string;
  isShared: boolean;
  widgetIcons: string[];
  shape: NodeShape;
  onSelect: (stepId: string) => void;
  [key: string]: unknown;
}

// --- Start/End Node (pill/rounded) ---
function StartEndNode({ data }: { data: FlowNodeData }) {
  const { step, stepIndex, isActive, primaryColor, shape, onSelect } = data;
  const isStart = shape === "start";
  const bgColor = isStart ? primaryColor : "#059669";

  return (
    <div
      onClick={() => onSelect(step.id)}
      className="cursor-pointer transition-all hover:scale-105"
      style={{
        width: 160,
        minHeight: 50,
        backgroundColor: isActive ? bgColor : `${bgColor}dd`,
        borderRadius: 25,
        boxShadow: isActive
          ? `0 0 0 3px white, 0 0 0 5px ${bgColor}, 0 4px 12px rgba(0,0,0,0.2)`
          : "0 2px 8px rgba(0,0,0,0.15)",
        padding: "10px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
      }}
    >
      {!isStart && <Handle type="target" position={Position.Top} style={{ background: "#fff", width: 8, height: 8 }} />}
      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
        {isStart ? "Start" : "End"}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>
        {step.title || (isStart ? "Welcome" : "Complete")}
      </div>
      <div style={{
        position: "absolute", top: -8, left: -8,
        width: 20, height: 20, borderRadius: "50%",
        backgroundColor: "#fff", color: bgColor,
        fontSize: 9, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}>
        {stepIndex + 1}
      </div>
      {!(!isStart && step.title?.toLowerCase().includes("confirm")) && (
        <Handle type="source" position={Position.Bottom} style={{ background: "#fff", width: 8, height: 8 }} />
      )}
      {isStart && <Handle type="source" position={Position.Bottom} style={{ background: "#fff", width: 8, height: 8 }} />}
    </div>
  );
}

// --- Decision Node (diamond) for segment/option pickers ---
function DecisionNode({ data }: { data: FlowNodeData }) {
  const { step, stepIndex, isActive, primaryColor, segmentColor, onSelect } = data;
  const color = segmentColor || primaryColor;

  return (
    <div
      onClick={() => onSelect(step.id)}
      className="cursor-pointer transition-all hover:scale-105"
      style={{
        width: 130,
        height: 130,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8, top: -2 }} />
      {/* Diamond shape */}
      <div
        style={{
          width: 100,
          height: 100,
          transform: "rotate(45deg)",
          backgroundColor: isActive ? color : `${color}18`,
          border: `2.5px solid ${color}`,
          borderRadius: 8,
          boxShadow: isActive
            ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 4px 12px rgba(0,0,0,0.15)`
            : "0 2px 8px rgba(0,0,0,0.1)",
          position: "absolute",
        }}
      />
      {/* Content (not rotated) */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 8px" }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: isActive ? "#fff" : color,
          lineHeight: 1.2,
          maxWidth: 80,
        }}>
          {step.title || "Decision"}
        </div>
      </div>
      {/* Step number badge */}
      <div style={{
        position: "absolute", top: 5, left: 5,
        width: 20, height: 20, borderRadius: "50%",
        backgroundColor: color, color: "#fff",
        fontSize: 9, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2,
      }}>
        {stepIndex + 1}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8, bottom: -2 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: color, width: 8, height: 8 }} />
    </div>
  );
}

// --- Standard Step Node (rectangle) ---
function StepNodeComponent({ data }: { data: FlowNodeData }) {
  const { step, stepIndex, isActive, primaryColor, segmentColor, isShared, widgetIcons, onSelect } = data;
  const borderColor = isActive ? primaryColor : segmentColor || "#cbd5e1";
  const bgColor = isActive ? `${primaryColor}12` : segmentColor ? `${segmentColor}08` : "#ffffff";

  return (
    <div
      onClick={() => onSelect(step.id)}
      className="cursor-pointer transition-all hover:scale-105"
      style={{
        width: 160,
        minHeight: 56,
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        boxShadow: isActive
          ? `0 0 0 2px white, 0 0 0 4px ${primaryColor}, 0 4px 12px rgba(0,0,0,0.12)`
          : "0 1px 4px rgba(0,0,0,0.08)",
        padding: "8px 10px",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: borderColor, width: 8, height: 8 }} />

      {/* Step number badge */}
      <div style={{
        position: "absolute", top: -10, left: -10,
        width: 22, height: 22, borderRadius: "50%",
        backgroundColor: isActive ? primaryColor : segmentColor || "#94a3b8",
        color: "#fff", fontSize: 10, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}>
        {stepIndex + 1}
      </div>

      {/* Shared indicator */}
      {isShared && (
        <div style={{
          position: "absolute", top: -8, right: -8,
          width: 20, height: 20, borderRadius: "50%",
          backgroundColor: "#f59e0b", color: "#fff",
          fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} title="Shared step — multiple paths converge here">
          ⚡
        </div>
      )}

      {/* Title */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: "#1f2937",
        lineHeight: 1.3, marginBottom: 3,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>
        {step.title || "Untitled"}
      </div>

      {/* Widget icons */}
      {widgetIcons.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {widgetIcons.map((icon, i) => (
            <span key={i} style={{ fontSize: 12 }}>{icon}</span>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: borderColor, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  startEnd: StartEndNode,
  decision: DecisionNode,
  stepNode: StepNodeComponent,
};

// --- Determine node shape ---
function getNodeShape(step: Step, index: number, totalSteps: number): NodeShape {
  if (index === 0) return "start";
  if (index === totalSteps - 1) return "end";

  // Check if step contains a segment-picker or option-picker (decision point)
  const hasDecisionWidget = step.widgets.some(
    (w) => w.templateId === "segment-picker" || w.templateId === "option-picker"
  );
  if (hasDecisionWidget) return "decision";

  return "step";
}

// --- Node dimensions for dagre layout ---
function getNodeDimensions(shape: NodeShape): { width: number; height: number } {
  switch (shape) {
    case "start":
    case "end":
      return { width: 160, height: 60 };
    case "decision":
      return { width: 140, height: 140 };
    case "step":
    default:
      return { width: 160, height: 70 };
  }
}

// --- Auto-layout with Dagre ---
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 50,
    ranksep: 70,
    marginx: 30,
    marginy: 30,
  });

  nodes.forEach((node) => {
    const dims = getNodeDimensions((node.data as FlowNodeData).shape);
    g.setNode(node.id, dims);
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const dims = getNodeDimensions((node.data as FlowNodeData).shape);
    return {
      ...node,
      position: {
        x: pos.x - dims.width / 2,
        y: pos.y - dims.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// --- Derive edges from funnel definition ---

interface SegmentOption {
  id?: string;
  label?: string;
  nextStep?: string;
  description?: string;
  icon?: string;
}

function deriveEdges(funnel: FunnelDefinition): { edges: Edge[]; segmentMap: Map<string, string> } {
  const edges: Edge[] = [];
  const segmentMap = new Map<string, string>();
  let segmentColorIndex = 0;

  const stepIdToIndex = new Map<string, number>();
  funnel.steps.forEach((step, i) => stepIdToIndex.set(step.id, i));

  // Build a set of steps that have segment/option pickers to detect decision points
  const decisionStepIndices = new Set<number>();
  funnel.steps.forEach((step, i) => {
    if (step.widgets.some((w) => w.templateId === "segment-picker" || w.templateId === "option-picker")) {
      decisionStepIndices.add(i);
    }
  });

  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];

    // Check for segment picker with branching (nextStep set on options)
    const segmentWidget = step.widgets.find((w) => w.templateId === "segment-picker");
    if (segmentWidget) {
      let options: SegmentOption[] = [];
      try {
        const raw = segmentWidget.config.options;
        if (typeof raw === "string") options = JSON.parse(raw);
        else if (Array.isArray(raw)) options = raw as SegmentOption[];
      } catch { /* ignore */ }

      const branchOptions = options.filter((opt) => opt.nextStep);

      if (branchOptions.length > 0) {
        // Explicit branches
        branchOptions.forEach((opt) => {
          const targetId = opt.nextStep!;
          if (!stepIdToIndex.has(targetId)) return;
          const color = SEGMENT_COLORS[segmentColorIndex % SEGMENT_COLORS.length];
          segmentColorIndex++;

          edges.push({
            id: `${step.id}->${targetId}`,
            source: step.id,
            target: targetId,
            label: opt.label || opt.id || "",
            style: { stroke: color, strokeWidth: 2.5 },
            labelStyle: { fontSize: 9, fill: color, fontWeight: 700 },
            labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
            labelBgPadding: [4, 6] as [number, number],
            labelBgBorderRadius: 4,
            markerEnd: { type: MarkerType.ArrowClosed, color },
            animated: true,
          });

          colorDownstream(funnel, targetId, color, segmentMap, stepIdToIndex);
        });

        // Non-branch options fall through
        const nonBranch = options.filter((opt) => !opt.nextStep);
        if (nonBranch.length > 0 && i < funnel.steps.length - 1) {
          edges.push({
            id: `${step.id}->${funnel.steps[i + 1].id}-default`,
            source: step.id,
            target: funnel.steps[i + 1].id,
            label: "default",
            style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "5,5" },
            labelStyle: { fontSize: 8, fill: "#94a3b8" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
          });
        }
        continue;
      }

      // Segment picker WITHOUT nextStep: create implied branches to next N steps
      // (one per option, each going to the step after this one + offset)
      if (options.length > 1 && i < funnel.steps.length - 1) {
        // Check if the next few steps look like they're one-per-segment
        // (e.g., steps named "Retreat Type", "Conference Type", "Family Gathering Type")
        const possibleTargets = options.length;
        const availableSteps = funnel.steps.length - i - 1;

        if (availableSteps >= possibleTargets) {
          options.forEach((opt, oi) => {
            const targetIdx = i + 1 + oi;
            if (targetIdx >= funnel.steps.length) return;
            const targetStep = funnel.steps[targetIdx];
            const color = SEGMENT_COLORS[oi % SEGMENT_COLORS.length];

            edges.push({
              id: `${step.id}->${targetStep.id}-implied-${oi}`,
              source: step.id,
              target: targetStep.id,
              label: opt.label || opt.id || `Option ${oi + 1}`,
              style: { stroke: color, strokeWidth: 2 },
              labelStyle: { fontSize: 8, fill: color, fontWeight: 600 },
              labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
              labelBgPadding: [3, 5] as [number, number],
              labelBgBorderRadius: 3,
              markerEnd: { type: MarkerType.ArrowClosed, color },
              animated: true,
            });

            segmentMap.set(targetStep.id, color);
          });
          continue;
        }
      }
    }

    // Check for explicit navigation target
    if (step.navigation.next) {
      const targetExists = stepIdToIndex.has(step.navigation.next);
      if (targetExists) {
        edges.push({
          id: `${step.id}->${step.navigation.next}`,
          source: step.id,
          target: step.navigation.next,
          style: { stroke: segmentMap.get(step.id) || "#64748b", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: segmentMap.get(step.id) || "#64748b" },
        });
        continue;
      }
    }

    // Default: flow to next step
    if (i < funnel.steps.length - 1) {
      edges.push({
        id: `${step.id}->${funnel.steps[i + 1].id}`,
        source: step.id,
        target: funnel.steps[i + 1].id,
        style: { stroke: segmentMap.get(step.id) || "#64748b", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: segmentMap.get(step.id) || "#64748b" },
      });
    }
  }

  return { edges, segmentMap };
}

// Color downstream steps from a branch
function colorDownstream(
  funnel: FunnelDefinition,
  startStepId: string,
  color: string,
  segmentMap: Map<string, string>,
  stepIdToIndex: Map<string, number>
) {
  const visited = new Set<string>();
  const queue = [startStepId];

  while (queue.length > 0) {
    const stepId = queue.shift()!;
    if (visited.has(stepId)) continue;
    visited.add(stepId);

    if (!segmentMap.has(stepId)) {
      segmentMap.set(stepId, color);
    }

    const idx = stepIdToIndex.get(stepId);
    if (idx === undefined) continue;
    const step = funnel.steps[idx];

    if (step.navigation.next && stepIdToIndex.has(step.navigation.next)) {
      queue.push(step.navigation.next);
    } else if (idx < funnel.steps.length - 1) {
      if (visited.size < 8) {
        queue.push(funnel.steps[idx + 1].id);
      }
    }
  }
}

// --- Main FlowGraph Component ---

export function FlowGraph() {
  const funnel = useFunnelStore((s) => s.funnel);
  const previewStep = useFunnelStore((s) => s.previewStep);
  const setPreviewStep = useFunnelStore((s) => s.setPreviewStep);
  const selectStep = useFunnelStore((s) => s.selectStep);

  const onStepSelect = useCallback(
    (stepId: string) => {
      setPreviewStep(stepId);
      selectStep(stepId);
    },
    [setPreviewStep, selectStep]
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!funnel || funnel.steps.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const { edges, segmentMap } = deriveEdges(funnel);

    // Count incoming edges per step to detect shared steps
    const incomingCount = new Map<string, number>();
    edges.forEach((e) => {
      incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
    });

    const nodes: Node[] = funnel.steps.map((step, i) => {
      const widgetIcons = step.widgets
        .map((w) => widgetTemplateRegistry[w.templateId]?.icon || "?")
        .slice(0, 5);

      const shape = getNodeShape(step, i, funnel.steps.length);
      const nodeType = shape === "start" || shape === "end" ? "startEnd"
        : shape === "decision" ? "decision"
        : "stepNode";

      return {
        id: step.id,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: {
          step,
          stepIndex: i,
          isActive: step.id === previewStep,
          primaryColor: funnel.theme.primaryColor,
          segmentColor: segmentMap.get(step.id),
          isShared: (incomingCount.get(step.id) || 0) > 1,
          widgetIcons,
          shape,
          onSelect: onStepSelect,
        } satisfies FlowNodeData,
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [funnel, previewStep, onStepSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!funnel || funnel.steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        No steps to display. Add steps to see the flow.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const d = node.data as FlowNodeData;
            if (d.shape === "start") return d.primaryColor;
            if (d.shape === "end") return "#059669";
            if (d.isActive) return d.primaryColor;
            return d.segmentColor || "#cbd5e1";
          }}
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>
    </div>
  );
}
