"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

import { type Role } from "../../../generated/prisma";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
  icon: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: "[]",
  },
  {
    label: "My Profile",
    href: "/dashboard/profile",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: "ME",
  },
  {
    label: "Employees",
    href: "/dashboard/employees",
    roles: ["ADMIN", "HR_OFFICER"],
    icon: "ID",
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: "AT",
  },
  {
    label: "Leave",
    href: "/dashboard/leave",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: "LV",
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    roles: ["ADMIN", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: "$",
  },
  {
    label: "Reports",
    href: "/dashboard/payroll/reports",
    roles: ["ADMIN", "PAYROLL_OFFICER"],
    icon: "RP",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    roles: ["ADMIN"],
    icon: "ST",
  },
  {
    label: "Security",
    href: "/dashboard/security/change-password",
    roles: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
    icon: "SC",
  },
];

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const isItemActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <aside className="hidden h-screen w-60 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-xl font-bold text-purple-700">EmPay</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = isItemActive(item.href);

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
                    <span className="min-w-5 text-xs font-semibold">
                      {item.icon}
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
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <span className="text-lg font-bold text-purple-700">EmPay</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
        >
          Sign out
        </button>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-2 py-2 md:hidden">
        <ul className="flex items-center justify-around gap-1">
          {visibleItems.slice(0, 5).map((item) => {
            const isActive = isItemActive(item.href);
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
                  <span>{item.icon}</span>
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
