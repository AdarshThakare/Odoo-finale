"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function ProfileMenu({ userName }: { userName: string }) {
  const initials = getInitials(userName);

  return (
    <details className="relative">
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm ring-1 ring-slate-200/60">
          {initials}
        </span>
      </summary>
      <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg">
        <Link
          href="/dashboard/profile"
          className="block rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100"
        >
          My Profile
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="block w-full rounded-lg px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100"
        >
          Log Out
        </button>
      </div>
    </details>
  );
}
