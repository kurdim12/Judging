"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/actions/auth";

export function LogoutButton({ label }: { label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => await signOutAction())}
      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
