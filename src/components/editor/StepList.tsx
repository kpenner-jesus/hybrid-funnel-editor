"use client";

import React, { useState } from "react";
import { Tooltip } from "@/components/shared/Tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFunnelStore } from "@/stores/funnel-store";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import { createEmptyStep } from "@/lib/schemas";
import { Button } from "@/components/shared/Button";
import { TemplateGallery } from "./TemplateGallery";

function SortableStep({ step }: { step: { id: string; title: string; widgets: { instanceId: string; templateId: string }[] } }) {
  const { selectedStepId, selectStep, selectedWidgetId, selectWidget, removeStep, removeWidget, updateStep } = useFunnelStore();
  const isSelected = selectedStepId === step.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [isLibraryDragOver, setIsLibraryDragOver] = useState(false);
  const addWidget = useFunnelStore((s) => s.addWidget);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const inputCount = step.widgets.reduce((acc, w) => {
    const tpl = widgetTemplateRegistry[w.templateId];
    return acc + (tpl?.inputs.length || 0);
  }, 0);
  const outputCount = step.widgets.reduce((acc, w) => {
    const tpl = widgetTemplateRegistry[w.templateId];
    return acc + (tpl?.outputs.length || 0);
  }, 0);

  return (
    <>
      <div ref={setNodeRef} style={style} className="group">
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/widget-template-id")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setIsLibraryDragOver(true);
            }
          }}
          onDragLeave={() => setIsLibraryDragOver(false)}
          onDrop={(e) => {
            const templateId = e.dataTransfer.getData("application/widget-template-id");
            if (templateId) {
              e.preventDefault();
              setIsLibraryDragOver(false);
              addWidget(step.id, templateId);
            }
          }}
          className={`rounded-lg border-2 transition-all cursor-pointer ${
            isLibraryDragOver
              ? "border-blue-500 bg-blue-50 shadow-md"
              : isSelected
              ? "border-primary bg-primary-light/40"
              : "border-outline-variant hover:border-primary/50 bg-white"
          }`}
        >
          {/* Step header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            onClick={() => selectStep(step.id)}
          >
            {/* Drag handle */}
            <Tooltip text="Drag to reorder this step" position="right">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-outline hover:text-on-surface-variant p-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="4" r="1.2" />
                <circle cx="11" cy="4" r="1.2" />
                <circle cx="5" cy="8" r="1.2" />
                <circle cx="11" cy="8" r="1.2" />
                <circle cx="5" cy="12" r="1.2" />
                <circle cx="11" cy="12" r="1.2" />
              </svg>
            </button>
            </Tooltip>

            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (editTitle.trim()) {
                        updateStep(step.id, { title: editTitle.trim() });
                      }
                      setIsEditingTitle(false);
                    }
                    if (e.key === "Escape") {
                      setEditTitle(step.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onBlur={() => {
                    if (editTitle.trim()) {
                      updateStep(step.id, { title: editTitle.trim() });
                    }
                    setIsEditingTitle(false);
                  }}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium w-full bg-white border border-primary rounded px-1.5 py-0.5 focus:outline-none"
                  autoFocus
                />
              ) : (
                <div
                  className="text-sm font-medium truncate cursor-text border-b border-transparent hover:border-primary/30 hover:text-primary/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectStep(step.id);
                    setEditTitle(step.title);
                    setIsEditingTitle(true);
                  }}
                  title="Click to edit title"
                >
                  {step.title}
                </div>
              )}
              <div className="flex gap-2 mt-0.5 text-[10px] text-on-surface-variant">
                <span>{step.widgets.length} widget{step.widgets.length !== 1 ? "s" : ""}</span>
                {inputCount > 0 && <Tooltip text="Data coming in from other steps" position="bottom"><span className="text-primary">&#8592; {inputCount}</span></Tooltip>}
                {outputCount > 0 && <Tooltip text="Data going out to other steps" position="bottom"><span className="text-secondary">&#8594; {outputCount}</span></Tooltip>}
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirmDelete) {
                  removeStep(step.id);
                  setConfirmDelete(false);
                } else {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }
              }}
              className={`p-1 rounded transition-colors ${
                confirmDelete
                  ? "text-error bg-error-light"
                  : "text-outline opacity-0 group-hover:opacity-100 hover:text-error"
              }`}
              title={confirmDelete ? "Click again to confirm" : "Delete step"}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Expanded widgets */}
          {isSelected && (
            <div className="px-3 pb-3 space-y-1.5">
              <div className="border-t border-outline-variant/50 pt-2 mt-1" />
              {step.widgets.map((widget) => {
                const template = widgetTemplateRegistry[widget.templateId];
                const isWidgetSelected = selectedWidgetId === widget.instanceId;
                return (
                  <div
                    key={widget.instanceId}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectWidget(widget.instanceId);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                      isWidgetSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-surface-dim text-on-surface-variant"
                    }`}
                  >
                    <span className="text-base">{template?.icon || "?"}</span>
                    <span className="flex-1 truncate text-xs">{template?.name || widget.templateId}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWidget(step.id, widget.instanceId);
                      }}
                      className="p-0.5 rounded text-outline hover:text-error transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              <Tooltip text="Add a content block — forms, images, date pickers, and more" position="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddWidget(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed border-outline-variant text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Add Widget
              </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {showAddWidget && (
        <TemplateGallery
          onSelect={(templateId) => {
            addWidget(step.id, templateId);
            setShowAddWidget(false);
          }}
          onClose={() => setShowAddWidget(false)}
        />
      )}
    </>
  );
}

export function StepList() {
  const { funnel, reorderSteps, addStep } = useFunnelStore();
  const [showNewStep, setShowNewStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!funnel) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = funnel.steps.findIndex((s) => s.id === active.id);
    const newIndex = funnel.steps.findIndex((s) => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderSteps(oldIndex, newIndex);
    }
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    addStep(createEmptyStep(newStepTitle.trim()));
    setNewStepTitle("");
    setShowNewStep(false);
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={funnel.steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {funnel.steps.map((step) => (
            <SortableStep key={step.id} step={step} />
          ))}
        </SortableContext>
      </DndContext>

      {funnel.steps.length === 0 && (
        <div className="text-center py-8 text-sm text-on-surface-variant">
          No steps yet. Add your first step below.
        </div>
      )}

      {showNewStep ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newStepTitle}
            onChange={(e) => setNewStepTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
            placeholder="Step title..."
            className="flex-1 px-3 py-2 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
            autoFocus
          />
          <Button size="sm" onClick={handleAddStep}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewStep(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowNewStep(true)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add Step
        </Button>
      )}
    </div>
  );
}
