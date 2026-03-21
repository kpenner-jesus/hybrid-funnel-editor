"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants: Record<string, string> = {
    primary:
      "bg-primary text-white hover:bg-primary-dark focus:ring-primary",
    secondary:
      "bg-secondary text-white hover:opacity-90 focus:ring-secondary",
    outline:
      "border border-outline-variant text-on-surface hover:bg-surface-dim focus:ring-primary",
    ghost:
      "text-on-surface-variant hover:bg-surface-dim focus:ring-primary",
    danger:
      "bg-error text-white hover:opacity-90 focus:ring-error",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-2.5 text-base gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
