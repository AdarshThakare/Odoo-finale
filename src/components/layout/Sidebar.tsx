"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  IconCalendarCheck,
  IconChartBar,
  IconLayoutDashboard,
  IconLockCheck,
  IconSettings,
  IconUserCircle,
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
    label: "My Profile",
    href: "/dashboard/profile",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: IconUserCircle,
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
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
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

        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 px-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {userName}
            </p>
            <p className="text-xs text-gray-500">{role.replace("_", " ")}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: SIGNOUT_CALLBACK })}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <BrandLogo size="sm" />
        <button
          onClick={() => signOut({ callbackUrl: SIGNOUT_CALLBACK })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
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
    </>
  );
}
