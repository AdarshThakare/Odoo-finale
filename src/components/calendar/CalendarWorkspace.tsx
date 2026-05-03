"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconSearch,
  IconUsersGroup,
  type TablerIcon,
} from "@tabler/icons-react";

import {
  type CalendarDay,
  type CalendarPersonRecord,
  type DashboardCalendarData,
} from "~/server/modules/calendar/calendar.service";

type Status = CalendarPersonRecord["status"];

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

const statusStyles: Record<Status, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  HALF_DAY: "bg-violet-50 text-violet-700 ring-violet-100",
  ABSENT: "bg-rose-50 text-rose-700 ring-rose-100",
  ON_LEAVE: "bg-indigo-50 text-indigo-700 ring-indigo-100",
};

const statusLabels: Record<Status, string> = {
  PRESENT: "Present",
  HALF_DAY: "Half day",
  ABSENT: "Absent",
  ON_LEAVE: "On leave",
};

export function CalendarWorkspace({ data }: { data: DashboardCalendarData }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return data.days.find((day) => day.isToday)?.date ?? data.days[0]?.date;
  });
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState<Status | "ALL">("ALL");

  const selectedDay =
    data.days.find((day) => day.date === selectedDate) ?? data.days[0];
  const isTeam = data.mode === "team";
  const visibleRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (selectedDay?.records ?? []).filter((record) => {
      const matchesSearch =
        search.length === 0 ||
        record.name.toLowerCase().includes(search) ||
        record.employeeCode.toLowerCase().includes(search) ||
        record.department.toLowerCase().includes(search);
      const matchesDepartment =
        department === "ALL" || record.department === department;
      const matchesStatus = status === "ALL" || record.status === status;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [department, query, selectedDay?.records, status]);

  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              Calendar
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              {isTeam ? "Team calendar" : "My calendar"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {isTeam
                ? `Track attendance and leave for everyone at ${data.viewer.companyName}.`
                : "Track your attendance, leave, and work rhythm in one place."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
            <MonthButton
              month={data.month.previousKey}
              icon={IconChevronLeft}
            />
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap text-slate-900 shadow-sm ring-1 ring-slate-200/70">
              {data.month.label}
            </span>
            <MonthButton month={data.month.nextKey} icon={IconChevronRight} />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={IconUsersGroup}
            label={isTeam ? "People tracked" : "Tracked days"}
            value={String(
              isTeam ? (selectedDay?.summary.total ?? 0) : data.totals.total,
            )}
            detail={isTeam ? "Selected day" : "Current month"}
            delay="80ms"
          />
          <MetricCard
            icon={IconCalendarEvent}
            label="Present"
            value={String(data.totals.present)}
            detail="Full attendance"
            delay="120ms"
          />
          <MetricCard
            icon={IconClock}
            label="Half days"
            value={String(data.totals.halfDay)}
            detail="Short work days"
            delay="160ms"
          />
          <MetricCard
            icon={IconCalendarEvent}
            label="Leave"
            value={String(data.totals.onLeave + data.totals.pendingLeave)}
            detail={`${data.totals.pendingLeave} pending`}
            delay="200ms"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div
            className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "240ms" }}
          >
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="px-2 py-3">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {data.days.map((day) => (
                <CalendarCell
                  key={day.date}
                  day={day}
                  mode={data.mode}
                  selected={day.date === selectedDay?.date}
                  onSelect={() => setSelectedDate(day.date)}
                />
              ))}
            </div>
          </div>

          <aside
            className={`${cardAnimation} rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "280ms" }}
          >
            {selectedDay && (
              <>
                <div className="border-b border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    {selectedDay.weekday}
                  </p>
                  <h2 className="font-display mt-1 text-xl font-semibold text-slate-900">
                    {formatDate(selectedDay.date)}
                  </h2>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniStat
                      label="Present"
                      value={selectedDay.summary.present}
                    />
                    <MiniStat
                      label="Leave"
                      value={selectedDay.summary.onLeave}
                    />
                    <MiniStat
                      label="Half day"
                      value={selectedDay.summary.halfDay}
                    />
                    <MiniStat
                      label="Absent"
                      value={selectedDay.summary.absent}
                    />
                  </div>
                </div>

                {isTeam && (
                  <div className="space-y-3 border-b border-slate-100 p-4">
                    <label className="relative block">
                      <IconSearch
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search people"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={department}
                        onChange={(event) => setDepartment(event.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="ALL">All departments</option>
                        {data.filters.departments.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(event.target.value as Status | "ALL")
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="ALL">All statuses</option>
                        {data.filters.statuses.map((item) => (
                          <option key={item} value={item}>
                            {statusLabels[item]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="max-h-[520px] overflow-y-auto p-4">
                  <div className="space-y-3">
                    {visibleRecords.map((record) => (
                      <PersonRecord key={record.employeeId} record={record} />
                    ))}
                    {visibleRecords.length === 0 && (
                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                        No records match the selected filters.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}

function MonthButton({
  month,
  icon: Icon,
}: {
  month: string;
  icon: TablerIcon;
}) {
  return (
    <Link
      href={`/dashboard/calendar?month=${month}`}
      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
    >
      <Icon size={18} aria-hidden="true" />
    </Link>
  );
}

function CalendarCell({
  day,
  mode,
  selected,
  onSelect,
}: {
  day: CalendarDay;
  mode: DashboardCalendarData["mode"];
  selected: boolean;
  onSelect: () => void;
}) {
  const primaryStatus = day.records[0]?.status;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-24 border-r border-b border-slate-100 p-2 text-left transition hover:bg-violet-50/30 ${
        day.isCurrentMonth ? "bg-white" : "bg-slate-50/60 text-slate-400"
      } ${selected ? "bg-violet-50 ring-2 ring-violet-300 ring-inset" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
            day.isToday
              ? "bg-violet-600 text-white"
              : day.isWeekend
                ? "bg-slate-100 text-slate-500"
                : "text-slate-800"
          }`}
        >
          {day.dayNumber}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {mode === "team" ? (
          <div className="flex flex-wrap gap-1 text-[11px]">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700 ring-1 ring-violet-100">
              P {day.summary.present}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 ring-1 ring-slate-200">
              L {day.summary.onLeave}
            </span>
          </div>
        ) : primaryStatus ? (
          <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {statusLabels[primaryStatus]}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">No record</span>
        )}
      </div>
    </button>
  );
}

function PersonRecord({ record }: { record: CalendarPersonRecord }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{record.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {record.department} · {record.designation}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ${statusStyles[record.status]}`}
        >
          {statusLabels[record.status]}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Detail label="In" value={record.checkIn ?? "-"} />
        <Detail label="Out" value={record.checkOut ?? "-"} />
        <Detail
          label="Hours"
          value={record.workingHours ? `${record.workingHours}h` : "-"}
        />
      </div>
      {record.leaveType && (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700 ring-1 ring-indigo-100">
          {record.leaveStatus}: {record.leaveType}
          {record.leaveReason ? ` · ${record.leaveReason}` : ""}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  delay,
}: {
  icon: TablerIcon;
  label: string;
  value: string;
  detail: string;
  delay: string;
}) {
  return (
    <div
      className={`${cardAnimation} rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-5 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/70">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <p className="text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

