"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { WidgetRenderer } from "./WidgetRenderer";

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

  if (!funnel) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">
        No funnel loaded.
      </div>
    );
  }

  const currentStepIndex = funnel.steps.findIndex((s) => s.id === previewStep);
  const currentStep = currentStepIndex !== -1 ? funnel.steps[currentStepIndex] : funnel.steps[0];

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">
        No steps in this funnel. Add a step to start building.
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

  const stepBarRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the active step into view
  useEffect(() => {
    if (activeStepRef.current && stepBarRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentStepIndex]);

  const manySteps = funnel.steps.length > 8;

  return (
    <div className="h-full flex flex-col">
      {/* Step progress indicator — scrollable for large funnels */}
      <div
        ref={stepBarRef}
        className="flex items-center gap-1 px-4 pt-4 pb-3 overflow-x-auto scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {funnel.steps.map((step, i) => {
          const isActive = step.id === currentStep.id;
          const isPast = i < currentStepIndex;
          return (
            <React.Fragment key={step.id}>
              <button
                ref={isActive ? activeStepRef : undefined}
                onClick={() => {
                  setPreviewStep(step.id);
                  selectStep(step.id);
                }}
                title={step.title}
                className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "text-white"
                    : isPast
                    ? "text-white/80"
                    : "text-gray-400 bg-gray-100"
                }`}
                style={
                  isActive
                    ? { backgroundColor: funnel.theme.primaryColor }
                    : isPast
                    ? { backgroundColor: `${funnel.theme.primaryColor}99` }
                    : {}
                }
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-current/20">
                  {i + 1}
                </span>
                {/* Show title only when few steps; truncate for many */}
                {!manySteps && (
                  <span className="hidden sm:inline truncate max-w-[80px]">{step.title}</span>
                )}
                {manySteps && isActive && (
                  <span className="inline truncate max-w-[100px]">{step.title}</span>
                )}
              </button>
              {i < funnel.steps.length - 1 && (
                <div
                  className="shrink-0 w-4 h-0.5 rounded"
                  style={{
                    backgroundColor: isPast ? funnel.theme.primaryColor : "#e5e7eb",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div
        className="flex-1 overflow-y-auto px-6 pb-6"
        style={{ backgroundColor: funnel.theme.surfaceColor }}
      >
        <div className="max-w-xl mx-auto space-y-4">
          {/* Step title */}
          <h2
            className="text-2xl font-bold mt-4"
            style={{
              fontFamily: funnel.theme.headlineFont,
              color: funnel.theme.primaryColor,
            }}
          >
            {currentStep.title}
          </h2>

          {/* Widgets */}
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
  );
}

// Wrapper component that resolves inputs and wires output capture
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
