"use client";

import type { AiMessage, ToolCallInfo, FileAttachment } from "@/stores/ai-store";

interface AiChatMessageProps {
  message: AiMessage;
  isStreaming?: boolean;
}

function ToolCallCard({ toolCall }: { toolCall: ToolCallInfo }) {
  const toolLabels: Record<string, string> = {
    create_complete_funnel: "Create Funnel",
    add_step: "Add Step",
    remove_step: "Remove Step",
    reorder_steps: "Reorder Steps",
    add_widget: "Add Widget",
    update_widget_config: "Update Widget",
    remove_widget: "Remove Widget",
    set_theme: "Set Theme",
    configure_segment_picker: "Configure Segments",
    suggest_improvements: "Suggestions",
  };

  const label = toolLabels[toolCall.name] || toolCall.name;

  // Generating state — tool input JSON is still being built by Claude
  if (toolCall.generating) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs mt-1.5 bg-amber-50 text-amber-800 border border-amber-200">
        <span className="shrink-0 animate-spin">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" />
          </svg>
        </span>
        <div>
          <div className="font-medium">{label}</div>
          <div className="opacity-70">
            Generating{toolCall.progress ? ` (${Math.round(toolCall.progress / 1000)}k chars)` : "..."}
          </div>
        </div>
      </div>
    );
  }

  const success = toolCall.result?.success ?? true;

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs mt-1.5 ${
        success
          ? "bg-primary-light text-primary-dark"
          : "bg-error-light text-error"
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {success ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M4 4l6 6M10 4l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <div>
        <div className="font-medium">{label}</div>
        {toolCall.result?.message && (
          <div className="opacity-80 mt-0.5">{toolCall.result.message}</div>
        )}
      </div>
    </div>
  );
}

function FileChip({ file }: { file: FileAttachment }) {
  const icon = file.type === "pdf" ? "📄" : file.name.match(/\.(csv|tsv)$/) ? "📊" : "📝";
  const sizeStr = file.size < 1024
    ? `${file.size}B`
    : file.size < 1024 * 1024
      ? `${Math.round(file.size / 1024)}KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)}MB`;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/15 rounded-lg text-xs">
      <span>{icon}</span>
      <span className="truncate max-w-[100px]" title={file.name}>{file.name}</span>
      <span className="text-white/60">{sizeStr}</span>
    </div>
  );
}

export function AiChatMessage({ message, isStreaming }: AiChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          {/* Show attached images */}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-1.5 justify-end mb-1.5 flex-wrap">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img.thumbnailUrl}
                  alt={`Attached ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-xl border border-white/20"
                />
              ))}
            </div>
          )}
          {/* Show attached files */}
          {message.files && message.files.length > 0 && (
            <div className="flex gap-1.5 justify-end mb-1.5 flex-wrap">
              {message.files.map((file, i) => (
                <FileChip key={i} file={file} />
              ))}
            </div>
          )}
          <div className="bg-primary text-white px-3.5 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  if (message.role === "tool_result") {
    return null; // Tool results are shown inline with assistant messages
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%]">
        {message.content && (
          <div className="bg-surface-dim px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed text-on-surface whitespace-pre-wrap">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}
        {message.toolCalls?.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
        {!message.content && isStreaming && (
          <div className="bg-surface-dim px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm">
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
