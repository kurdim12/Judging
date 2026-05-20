import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhase(phase: string) {
  return phase.replace(/_/g, " ");
}

export function nextDisplayCode(existing: string[]): string {
  let max = 0;
  for (const code of existing) {
    const match = code.match(/^T-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `T-${String(max + 1).padStart(3, "0")}`;
}
