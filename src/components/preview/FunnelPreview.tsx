"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { WidgetRenderer } from "./WidgetRenderer";
import { FlowPreview } from "./FlowPreview";
import { widgetTemplateRegistry } from "@/lib/widget-templates";

// Width thresholds for step rail modes
const RAIL_MIN = 48;
const RAIL_THUMB = 140; // show thumbnails above this
const RAIL_MAX = 240;

export function FunnelPreview() {
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

  // Resizable step rail width — persisted to localStorage
  const [railWidth, setRailWidth] = useState(() => {
    if (typeof window === "undefined") return RAIL_MIN;
    try {
      const saved = localStorage.getItem("step-rail-width");
      if (saved) {
        const n = parseInt(saved, 10);
        if (n >= RAIL_MIN && n <= RAIL_MAX) return n;
      }
    } catch {}
    return RAIL_MIN;
  });

  const isDraggingRail = useRef(false);

  const handleRailDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRail.current = true;
      const startX = e.clientX;
      const startWidth = railWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDraggingRail.current) return;
        // Dragging left edge = moving left makes it wider
        const delta = startX - ev.clientX;
        const newWidth = Math.min(RAIL_MAX, Math.max(RAIL_MIN, startWidth + delta));
        setRailWidth(newWidth);
      };

      const onMouseUp = () => {
        isDraggingRail.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        // Persist
        setRailWidth((prev) => {
          localStorage.setItem("step-rail-width", String(prev));
          return prev;
        });
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [railWidth]
  );

  const showThumbnails = railWidth >= RAIL_THUMB;

  // Preview mode: "step" (single step) or "flow" (all steps with connections)
  const [previewMode, setPreviewMode] = useState<"step" | "flow">("flow");

  // --- Preview mode toggle bar (always visible) ---
  const modeToggle = (
    <div className="flex items-center justify-center gap-1 py-1.5 px-3 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setPreviewMode("step")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            previewMode === "step"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Step
        </button>
        <button
          onClick={() => setPreviewMode("flow")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            previewMode === "flow"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Flow
        </button>
      </div>
    </div>
  );

  // --- Flow mode (works even with no steps — FlowPreview handles empty state) ---
  if (previewMode === "flow") {
    return (
      <div className="h-full flex flex-col">
        {modeToggle}
        <div className="flex-1 overflow-hidden">
          <FlowPreview onEditWidget={(stepId, widgetId) => {
            setPreviewStep(stepId);
            selectStep(stepId);
            selectWidget(widgetId);
            setPreviewMode("step");
          }} />
        </div>
      </div>
    );
  }

  // --- Step mode early returns ---
  if (!funnel) {
    return (
      <div className="h-full flex flex-col">
        {modeToggle}
        <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
          No funnel loaded.
        </div>
      </div>
    );
  }

  const currentStepIndex = funnel.steps.findIndex((s) => s.id === previewStep);
  const currentStep = currentStepIndex !== -1 ? funnel.steps[currentStepIndex] : funnel.steps[0];

  if (!currentStep) {
    return (
      <div className="h-full flex flex-col">
        {modeToggle}
        <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
          No steps in this funnel. Add a step to start building.
        </div>
      </div>
    );
  }

  const isFirst = currentStepIndex <= 0;
  const isLast = currentStepIndex >= funnel.steps.length - 1;

  const goNext = () => {
    if (!isLast) {
      const nextStep = funnel.steps[currentStepIndex + 1];
      setPreviewStep(nextStep.id);
      selectStep(nextStep.id);
    }
  };

  const goBack = () => {
    if (!isFirst) {
      const prevStep = funnel.steps[currentStepIndex - 1];
      setPreviewStep(prevStep.id);
      selectStep(prevStep.id);
    }
  };

  // --- Step mode (default) ---
  return (
    <div className="h-full flex flex-col">
      {modeToggle}
      <div className="flex-1 flex flex-row min-h-0">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Step content */}
        <div
          className="flex-1 overflow-y-auto px-6 pb-6"
          style={{ backgroundColor: funnel.theme.surfaceColor }}
        >
          <div className="max-w-xl mx-auto space-y-4">
            <h2
              className="text-2xl font-bold mt-4"
              style={{
                fontFamily: funnel.theme.headlineFont,
                color: funnel.theme.primaryColor,
              }}
            >
              {currentStep.title}
            </h2>

            {currentStep.widgets.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No widgets in this step. Add widgets from the editor panel.
              </div>
            ) : (
              currentStep.widgets.map((widget) => (
                <WidgetRendererWithBindings
                  key={widget.instanceId}
                  widget={widget}
                  theme={funnel.theme}
                  isSelected={selectedWidgetId === widget.instanceId}
                  onClick={() => {
                    selectStep(currentStep.id);
                    selectWidget(widget.instanceId);
                  }}
                  resolveWidgetInputs={resolveWidgetInputs}
                  setWidgetOutput={setWidgetOutput}
                />
              ))
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={isFirst}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: `${funnel.theme.borderRadius / 2}px` }}
          >
            {currentStep.navigation.backLabel || "Back"}
          </button>

          <span className="text-xs text-gray-400">
            Step {currentStepIndex + 1} of {funnel.steps.length}
          </span>

          <button
            onClick={goNext}
            disabled={isLast}
            className="px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: funnel.theme.primaryColor,
              borderRadius: `${funnel.theme.borderRadius / 2}px`,
            }}
          >
            {currentStep.navigation.nextLabel || "Continue"}
          </button>
        </div>
      </div>

      {/* Drag handle — left edge of step rail */}
      <div
        onMouseDown={handleRailDragStart}
        className="w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors shrink-0"
        title="Drag to resize step panel"
      />

      {/* Vertical step rail — right side */}
      <StepRail
        steps={funnel.steps}
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        primaryColor={funnel.theme.primaryColor}
        railWidth={railWidth}
        showThumbnails={showThumbnails}
        onStepClick={(step) => {
          setPreviewStep(step.id);
          selectStep(step.id);
        }}
      />
      </div>
    </div>
  );
}

// --- Step Rail Component ---

function StepRail({
  steps,
  currentStep,
  currentStepIndex,
  primaryColor,
  railWidth,
  showThumbnails,
  onStepClick,
}: {
  steps: import("@/lib/types").Step[];
  currentStep: import("@/lib/types").Step;
  currentStepIndex: number;
  primaryColor: string;
  railWidth: number;
  showThumbnails: boolean;
  onStepClick: (step: import("@/lib/types").Step) => void;
}) {
  const stepBarRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeStepRef.current && stepBarRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [currentStepIndex]);

  return (
    <div
      ref={stepBarRef}
      className="border-l border-gray-200 bg-gray-50/50 overflow-y-auto flex flex-col items-center gap-1 py-3 shrink-0"
      style={{ width: railWidth, scrollbarWidth: "thin" }}
    >
      {steps.map((step, i) => {
        const isActive = step.id === currentStep.id;
        const isPast = i < currentStepIndex;

        if (showThumbnails) {
          // Thumbnail card mode
          const widgetIcons = step.widgets
            .map((w) => widgetTemplateRegistry[w.templateId]?.icon || "?")
            .slice(0, 4);

          return (
            <button
              key={step.id}
              ref={isActive ? activeStepRef : undefined}
              onClick={() => onStepClick(step)}
              title={step.title}
              className={`w-full mx-2 px-2 py-2 rounded-lg text-left shrink-0 transition-all ${
                isActive
                  ? "text-white shadow-md"
                  : isPast
                  ? "text-white/90"
                  : "text-gray-500 bg-white hover:bg-gray-100 border border-gray-200"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: primaryColor,
                      boxShadow: `0 0 0 2px white, 0 0 0 3px ${primaryColor}`,
                    }
                  : isPast
                  ? { backgroundColor: `${primaryColor}88` }
                  : {}
              }
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                    isActive || isPast ? "bg-white/20" : "bg-gray-100"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-[10px] font-semibold truncate leading-tight">
                  {step.title || "Untitled"}
                </span>
              </div>
              {/* Widget icons row */}
              {widgetIcons.length > 0 && (
                <div className="flex items-center gap-1 pl-6">
                  {widgetIcons.map((icon, wi) => (
                    <span key={wi} className="text-[11px]" title={step.widgets[wi]?.templateId}>
                      {icon}
                    </span>
                  ))}
                  {step.widgets.length > 4 && (
                    <span className={`text-[9px] ${isActive || isPast ? "text-white/60" : "text-gray-400"}`}>
                      +{step.widgets.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        }

        // Compact circle mode
        return (
          <React.Fragment key={step.id}>
            <button
              ref={isActive ? activeStepRef : undefined}
              onClick={() => onStepClick(step)}
              title={step.title}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                isActive
                  ? "text-white"
                  : isPast
                  ? "text-white/90"
                  : "text-gray-400 bg-gray-100 hover:bg-gray-200"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: primaryColor,
                      boxShadow: `0 0 0 2px white, 0 0 0 4px ${primaryColor}`,
                    }
                  : isPast
                  ? { backgroundColor: `${primaryColor}88` }
                  : {}
              }
            >
              {i + 1}
            </button>
            {i < steps.length - 1 && (
              <div
                className="shrink-0 w-0.5 h-2 rounded"
                style={{
                  backgroundColor: isPast ? primaryColor : "#e5e7eb",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// --- Widget Renderer Wrapper ---

function WidgetRendererWithBindings({
  widget,
  theme,
  isSelected,
  onClick,
  resolveWidgetInputs,
  setWidgetOutput,
}: {
  widget: import("@/lib/types").WidgetInstance;
  theme: import("@/lib/types").ThemeConfig;
  isSelected: boolean;
  onClick: () => void;
  resolveWidgetInputs: (widget: import("@/lib/types").WidgetInstance) => Record<string, unknown>;
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
