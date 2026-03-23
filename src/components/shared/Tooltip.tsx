"use client";

import React, { useState, useRef, useCallback } from "react";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  maxWidth?: number;
  delay?: number;
}

export function Tooltip({ text, children, position = "top", maxWidth = 220, delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 },
    bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6 },
    left: { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 6 },
    right: { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 6 },
  };

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className="absolute z-[200] px-2.5 py-1.5 rounded-lg text-[11px] leading-tight font-medium text-white shadow-lg pointer-events-none animate-in fade-in-0 duration-150"
          style={{
            ...positionStyles[position],
            backgroundColor: "rgba(30, 30, 30, 0.95)",
            maxWidth,
            whiteSpace: "normal",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

// Inline help icon with tooltip — use next to labels
export function HelpTip({ text, position = "top" }: { text: string; position?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip text={text} position={position}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold cursor-help ml-1 shrink-0"
        style={{ backgroundColor: "#e5e7eb", color: "#6b7280" }}>
        ?
      </span>
    </Tooltip>
  );
}
