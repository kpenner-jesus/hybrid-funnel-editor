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

// --- Custom Step Node ---

interface StepNodeData {
  step: Step;
  stepIndex: number;
  isActive: boolean;
  primaryColor: string;
  segmentColor?: string;
  isShared: boolean; // receives edges from multiple paths
  widgetIcons: string[];
  onSelect: (stepId: string) => void;
  [key: string]: unknown;
}

function StepNodeComponent({ data }: { data: StepNodeData }) {
  const { step, stepIndex, isActive, primaryColor, segmentColor, isShared, widgetIcons, onSelect } = data;

  const borderColor = isActive
    ? primaryColor
    : segmentColor || "#d1d5db";

  return (
    <div
      onClick={() => onSelect(step.id)}
      className="cursor-pointer transition-all hover:scale-105"
      style={{
        width: 160,
        minHeight: 60,
        backgroundColor: isActive ? `${primaryColor}10` : "#ffffff",
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: isActive
          ? `0 0 0 3px ${primaryColor}40, 0 2px 8px rgba(0,0,0,0.12)`
          : "0 1px 4px rgba(0,0,0,0.08)",
        padding: "8px 10px",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#94a3b8", width: 8, height: 8 }} />

      {/* Step number badge */}
      <div
        style={{
          position: "absolute",
          top: -10,
          left: -10,
          width: 22,
          height: 22,
          borderRadius: "50%",
          backgroundColor: isActive ? primaryColor : segmentColor || "#94a3b8",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {stepIndex + 1}
      </div>

      {/* Shared indicator */}
      {isShared && (
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: "#f59e0b",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Shared step — multiple paths lead here"
        >
          ⚡
        </div>
      )}

      {/* Title */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#1f2937",
          lineHeight: 1.3,
          marginBottom: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
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

      <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8", width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  stepNode: StepNodeComponent,
};

// --- Auto-layout with Dagre ---

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 60,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 160, height: 80 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 80,
        y: nodeWithPosition.y - 40,
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
}

function deriveEdges(funnel: FunnelDefinition): { edges: Edge[]; segmentMap: Map<string, string> } {
  const edges: Edge[] = [];
  const segmentMap = new Map<string, string>(); // stepId -> segment color
  let segmentColorIndex = 0;

  const stepIdToIndex = new Map<string, number>();
  funnel.steps.forEach((step, i) => stepIdToIndex.set(step.id, i));

  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];

    // Check for segment picker with branching
    const segmentWidget = step.widgets.find((w) => w.templateId === "segment-picker");
    if (segmentWidget) {
      let options: SegmentOption[] = [];
      try {
        const raw = segmentWidget.config.options;
        if (typeof raw === "string") {
          options = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          options = raw as SegmentOption[];
        }
      } catch { /* ignore */ }

      const branchOptions = options.filter((opt) => opt.nextStep);
      if (branchOptions.length > 0) {
        // Create edges for each branch
        branchOptions.forEach((opt) => {
          const targetId = opt.nextStep!;
          const color = SEGMENT_COLORS[segmentColorIndex % SEGMENT_COLORS.length];
          segmentColorIndex++;

          edges.push({
            id: `${step.id}->${targetId}`,
            source: step.id,
            target: targetId,
            label: opt.label || opt.id || "",
            style: { stroke: color, strokeWidth: 2 },
            labelStyle: { fontSize: 9, fill: color, fontWeight: 600 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
            animated: true,
          });

          // Color downstream steps until they hit a shared step
          colorDownstream(funnel, targetId, color, segmentMap, stepIdToIndex);
        });

        // Also handle options without nextStep (default: fall through to next step)
        const nonBranchOptions = options.filter((opt) => !opt.nextStep);
        if (nonBranchOptions.length > 0 && i < funnel.steps.length - 1) {
          edges.push({
            id: `${step.id}->${funnel.steps[i + 1].id}-default`,
            source: step.id,
            target: funnel.steps[i + 1].id,
            style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
          });
        }
        continue;
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
          style: { stroke: segmentMap.get(step.id) || "#94a3b8", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: segmentMap.get(step.id) || "#94a3b8" },
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
        style: { stroke: segmentMap.get(step.id) || "#94a3b8", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: segmentMap.get(step.id) || "#94a3b8" },
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

    // Don't override if already colored (shared step)
    if (!segmentMap.has(stepId)) {
      segmentMap.set(stepId, color);
    }

    const idx = stepIdToIndex.get(stepId);
    if (idx === undefined) continue;
    const step = funnel.steps[idx];

    // Follow explicit nav
    if (step.navigation.next && stepIdToIndex.has(step.navigation.next)) {
      queue.push(step.navigation.next);
    } else if (idx < funnel.steps.length - 1) {
      // Default: next step (only follow for a few steps to avoid coloring the whole funnel)
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

      return {
        id: step.id,
        type: "stepNode",
        position: { x: 0, y: 0 }, // will be set by dagre
        data: {
          step,
          stepIndex: i,
          isActive: step.id === previewStep,
          primaryColor: funnel.theme.primaryColor,
          segmentColor: segmentMap.get(step.id),
          isShared: (incomingCount.get(step.id) || 0) > 1,
          widgetIcons,
          onSelect: onStepSelect,
        } satisfies StepNodeData,
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, "TB");
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [funnel, previewStep, onStepSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when funnel changes
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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={20} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const d = node.data as StepNodeData;
            if (d.isActive) return d.primaryColor;
            return d.segmentColor || "#d1d5db";
          }}
          style={{ width: 120, height: 80 }}
        />
      </ReactFlow>
    </div>
  );
}
