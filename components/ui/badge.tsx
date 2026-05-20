import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const variants: Record<Variant, string> = {
  default: "bg-stone-100 text-stone-700 border border-stone-200",
  primary: "bg-ieee-50 text-ieee-700 border border-ieee-100",
  secondary: "bg-petra-50 text-petra-700 border border-petra-100",
  success: "bg-green-50 text-green-800 border border-green-100",
  warning: "bg-amber-50 text-amber-800 border border-amber-100",
  danger: "bg-red-50 text-red-800 border border-red-100",
  muted: "bg-stone-50 text-stone-600 border border-stone-200",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
