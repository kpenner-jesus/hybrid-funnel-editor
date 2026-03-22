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

  // Auto-scroll the active step into view (vertical rail)
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
    <div className="h-full flex flex-row">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
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

      {/* Vertical step rail — right side */}
      <div
        ref={stepBarRef}
        className="w-14 border-l border-gray-200 bg-gray-50/50 overflow-y-auto flex flex-col items-center gap-1 py-3 shrink-0"
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
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                  isActive
                    ? "text-white"
                    : isPast
                    ? "text-white/90"
                    : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                }`}
                style={
                  isActive
                    ? { backgroundColor: funnel.theme.primaryColor, boxShadow: `0 0 0 2px white, 0 0 0 4px ${funnel.theme.primaryColor}` }
                    : isPast
                    ? { backgroundColor: `${funnel.theme.primaryColor}88` }
                    : {}
                }
              >
                {i + 1}
              </button>
              {i < funnel.steps.length - 1 && (
                <div
                  className="shrink-0 w-0.5 h-2 rounded"
                  style={{
                    backgroundColor: isPast ? funnel.theme.primaryColor : "#e5e7eb",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
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
