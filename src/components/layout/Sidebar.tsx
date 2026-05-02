"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconCalendarCheck,
  IconChartBar,
  IconLayoutDashboard,
  IconLockCheck,
  IconLogout,
  IconSettings,
  IconUsersGroup,
  IconWallet,
  IconWritingSign,
  type TablerIcon,
} from "@tabler/icons-react";

import { type Role } from "../../../generated/prisma";
import { BrandLogo } from "~/components/BrandLogo";

// Use the absolute app URL so sign-out works correctly on production too.
// Falls back to /login (relative) which works for local dev.
const SIGNOUT_CALLBACK =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? `${window.location.origin}/login`
    : "/login";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
  icon: TablerIcon;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: IconLayoutDashboard,
  },
  {
    label: "Employees",
    href: "/dashboard/employees",
    roles: ["ADMIN", "HR_OFFICER"],
    icon: IconUsersGroup,
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: IconCalendarCheck,
  },
  {
    label: "Leave",
    href: "/dashboard/leave",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: IconWritingSign,
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    roles: ["ADMIN", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: IconWallet,
  },
  {
    label: "Reports",
    href: "/dashboard/payroll/reports",
    roles: ["ADMIN", "PAYROLL_OFFICER"],
    icon: IconChartBar,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    roles: ["ADMIN"],
    icon: IconSettings,
  },
  {
    label: "Security",
    href: "/dashboard/security/change-password",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: IconLockCheck,
  },
];

interface SidebarProps {
  role: Role;
  userAvatarUrl?: string | null;
  userName: string;
}

export function Sidebar({ role, userAvatarUrl, userName }: SidebarProps) {
  const pathname = usePathname();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const initials = getInitials(userName);
  const isItemActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) &&
        !visibleItems.some(
          (other) =>
            other.href !== href &&
            other.href.startsWith(`${href}/`) &&
            (pathname === other.href || pathname.startsWith(`${other.href}/`)),
        ))
    );
  };
  const handleConfirmSignOut = () => {
    setIsSignOutOpen(false);
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "/login";
    void signOut({ callbackUrl });
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-60 flex-col overflow-hidden border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <BrandLogo size="sm" />
        </div>

        <nav className="flex-1 overflow-hidden px-3 py-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = isItemActive(item.href);
              const NavIcon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      <NavIcon
                        size={20}
                        stroke={1.9}
                        aria-hidden="true"
                        className={isActive ? "text-purple-700" : "text-gray-500"}
                      />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-3">
          <Link
            href="/dashboard/profile"
            className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-gray-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-sm font-bold text-purple-700 ring-2 ring-purple-50">
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatarUrl}
                  alt={userName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900">
                {userName}
              </span>
              <span className="block truncate text-xs font-semibold tracking-[0.08em] text-gray-500 uppercase">
                {formatRole(role)}
              </span>
            </span>
          </Link>
          <button
            onClick={() => setIsSignOutOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <IconLogout size={18} stroke={1.9} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <BrandLogo size="sm" />
        <button
          onClick={() => setIsSignOutOpen(true)}
          className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
        >
          Sign out
        </button>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-2 py-2 md:hidden">
        <ul className="flex items-center justify-around gap-1">
          {visibleItems.slice(0, 5).map((item) => {
            const isActive = isItemActive(item.href);
            const NavIcon = item.icon;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <NavIcon size={20} stroke={1.9} aria-hidden="true" />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {isSignOutOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
          onClick={() => setIsSignOutOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <IconLogout size={20} stroke={1.8} aria-hidden="true" />
              </span>
              <div>
                <h2 id="signout-title" className="text-base font-semibold text-gray-900">
                  Sign out?
                </h2>
                <p className="text-sm text-gray-500">
                  You can sign back in anytime.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsSignOutOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "EP";
}

function formatRole(role: Role) {
  return role.replaceAll("_", " ");
}
