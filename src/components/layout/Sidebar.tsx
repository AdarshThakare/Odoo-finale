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
    roles: ["ADMIN", "PAYROLL_OFFICER"],
    icon: "$",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    roles: ["ADMIN"],
    icon: "ST",
  },
];

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-xl font-bold text-purple-700">EmPay</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

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
  );
}
