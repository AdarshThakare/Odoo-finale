"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  IconBriefcase,
  IconBuilding,
  IconDeviceFloppy,
  IconLock,
  IconUpload,
  IconUserCircle,
  type TablerIcon,
} from "@tabler/icons-react";

import { api, type RouterOutputs } from "~/trpc/react";

type Profile = RouterOutputs["employee"]["getMyProfile"];
type Employee = NonNullable<Profile["employee"]>;
type Tab = "resume" | "private" | "salary" | "security";

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

const initialProfileForm = {
  name: "",
  phone: "",
  avatarUrl: "",
  resumeUrl: "",
  dateOfBirth: "",
  address: "",
  personalEmail: "",
  nationality: "",
  maritalStatus: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  managerName: "",
  workLocation: "",
  about: "",
  jobInterests: "",
  skills: "",
  certifications: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  panNumber: "",
  uanNumber: "",
};

type ProfileForm = typeof initialProfileForm;

type UploadResponse = { url: string } | { error: string };

function isUploadResponse(value: unknown): value is UploadResponse {
  if (!value || typeof value !== "object") return false;
  if ("url" in value && typeof value.url === "string") return true;
  if ("error" in value && typeof value.error === "string") return true;
  return false;
}

function asDateInput(value: Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function splitList(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProfileWorkspace() {
  const utils = api.useUtils();
  const router = useRouter();
  const { data: profile, isLoading } = api.employee.getMyProfile.useQuery();
  const [tab, setTab] = useState<Tab>("resume");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState<ProfileForm>(initialProfileForm);

  useEffect(() => {
    if (!profile) return;
    const employee = profile.employee;
    setForm({
      name: profile.user.name ?? "",
      phone: employee?.phone ?? "",
      avatarUrl: employee?.avatarUrl ?? profile.user.avatarUrl ?? "",
      resumeUrl: employee?.resumeUrl ?? "",
      dateOfBirth: asDateInput(employee?.dateOfBirth),
      address: employee?.address ?? "",
      personalEmail: employee?.personalEmail ?? "",
      nationality: employee?.nationality ?? "",
      maritalStatus: employee?.maritalStatus ?? "",
      emergencyContactName: employee?.emergencyContactName ?? "",
      emergencyContactPhone: employee?.emergencyContactPhone ?? "",
      managerName: employee?.managerName ?? "",
      workLocation: employee?.workLocation ?? "",
      about: employee?.about ?? "",
      jobInterests: employee?.jobInterests ?? "",
      skills: employee?.skills ?? "",
      certifications: employee?.certifications ?? "",
      bankName: employee?.bankName ?? "",
      bankAccountNumber: employee?.bankAccountNumber ?? "",
      bankIfsc: employee?.bankIfsc ?? "",
      panNumber: employee?.panNumber ?? "",
      uanNumber: employee?.uanNumber ?? "",
    });
  }, [profile]);

  const updateProfile = api.employee.updateMyProfile.useMutation({
    onSuccess: async () => {
      setError("");
      setMessage("Profile saved.");
      await utils.employee.getMyProfile.invalidate();
      router.refresh();
    },
    onError: (mutationError) => {
      setMessage("");
      setError(mutationError.message);
    },
  });

  const tabs = useMemo(() => {
    const visibleTabs: Array<{ id: Tab; label: string }> = [
      { id: "resume", label: "Resume" },
      { id: "private", label: "Private Info" },
    ];
    if (profile?.canViewSalary) {
      visibleTabs.push({ id: "salary", label: "Salary Info" });
    }
    visibleTabs.push({ id: "security", label: "Security" });
    return visibleTabs;
  }, [profile?.canViewSalary]);

  if (isLoading || !profile) {
    return (
      <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
        <div className="h-44 animate-pulse rounded-3xl bg-slate-100" />
        <div className="mt-6 h-12 max-w-xl animate-pulse rounded-full bg-slate-100" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  const employee = profile.employee;
  const displayName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : profile.user.name;
  const initials = (displayName ?? "EU")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bankMissing =
    !!employee && (!employee.bankAccountNumber || !employee.bankIfsc);

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    updateProfile.mutate(form);
  }

  async function uploadAvatar(file: File) {
    setMessage("");
    setError("");
    setAvatarUploading(true);

    try {
      const uploadForm = new FormData();
      uploadForm.set("file", file);

      const response = await fetch("/api/upload/profile-avatar", {
        method: "POST",
        body: uploadForm,
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isUploadResponse(payload) || !("url" in payload)) {
        const errorMessage =
          isUploadResponse(payload) && "error" in payload
            ? payload.error
            : "Profile image upload failed";
        throw new Error(errorMessage);
      }

      setForm((current) => ({ ...current, avatarUrl: payload.url }));
      updateProfile.mutate({ avatarUrl: payload.url });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Profile image upload failed",
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <ProfileHeader
          profile={profile}
          displayName={displayName ?? "EMPAY User"}
          initials={initials}
          avatarUrl={form.avatarUrl}
          uploading={avatarUploading}
          onAvatarUpload={(file) => void uploadAvatar(file)}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <ProfileStatCard
            icon={IconUserCircle}
            label="Access role"
            value={profile.user.role.replace("_", " ")}
            delay="80ms"
          />
          <ProfileStatCard
            icon={IconBriefcase}
            label="Job title"
            value={employee?.designation.name ?? "Company user"}
            delay="100ms"
          />
          <ProfileStatCard
            icon={IconBuilding}
            label="Department"
            value={employee?.department.name ?? profile.company?.name ?? "-"}
            delay="120ms"
          />
        </section>

        <div
          className={`${cardAnimation} flex flex-wrap gap-2 rounded-full bg-slate-100 p-1`}
          style={{ animationDelay: "140ms" }}
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold transition ${
                tab === item.id
                  ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200/70"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        <form onSubmit={saveProfile}>
          {tab === "resume" && (
            <ResumeTab
              employee={employee}
              form={form}
              setField={(field, value) =>
                setForm((current) => ({ ...current, [field]: value }))
              }
              saving={updateProfile.isPending}
            />
          )}
          {tab === "private" && (
            <PrivateInfoTab
              profile={profile}
              form={form}
              bankMissing={bankMissing}
              setField={(field, value) =>
                setForm((current) => ({ ...current, [field]: value }))
              }
              saving={updateProfile.isPending}
            />
          )}
          {tab === "salary" && profile.canViewSalary && (
            <SalaryInfoTab employee={employee} />
          )}
          {tab === "security" && <SecurityTab />}
        </form>
      </div>
    </div>
  );
}

function ProfileHeader({
  profile,
  displayName,
  initials,
  avatarUrl,
  uploading,
  onAvatarUpload,
}: {
  profile: Profile;
  displayName: string;
  initials: string;
  avatarUrl: string;
  uploading: boolean;
  onAvatarUpload: (file: File) => void;
}) {
  const employee = profile.employee;

  return (
    <section
      className={`${cardAnimation} rounded-3xl bg-linear-to-br from-white via-white to-violet-50/70 p-6 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: "40ms" }}
    >
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="flex flex-col items-center gap-3">
          <label className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-violet-100 text-3xl font-bold text-violet-700 ring-4 ring-white transition hover:ring-violet-200">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/50 px-3 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {uploading ? (
                "Uploading..."
              ) : (
                <span className="inline-flex items-center gap-1">
                  <IconUpload size={14} />
                  Upload
                </span>
              )}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onAvatarUpload(file);
                event.target.value = "";
              }}
            />
          </label>
          <p className="text-center text-xs text-slate-500">
            Click the photo to upload
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
            My Profile
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
            {displayName}
          </h1>
          <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <InfoLine label="Login ID" value={profile.user.loginId ?? "-"} />
            <InfoLine label="Email" value={profile.user.email} />
            <InfoLine label="Mobile" value={employee?.phone ?? "-"} />
            <InfoLine
              label="Job position"
              value={employee?.designation.name ?? profile.user.role}
            />
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-1">
          <InfoLine label="Company" value={profile.company?.name ?? "-"} />
          <InfoLine
            label="Department"
            value={employee?.department.name ?? "-"}
          />
          <InfoLine label="Manager" value={employee?.managerName ?? "-"} />
          <InfoLine label="Location" value={employee?.workLocation ?? "-"} />
        </div>
      </div>
    </section>
  );
}

function ProfileStatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: TablerIcon;
  label: string;
  value: string;
  delay: string;
}) {
  return (
    <div
      className={`${cardAnimation} rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-5 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {label}
          </p>
          <p className="truncate font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ResumeTab({
  employee,
  form,
  setField,
  saving,
}: {
  employee: Employee | null;
  form: ProfileForm;
  setField: (field: keyof ProfileForm, value: string) => void;
  saving: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section
        className={`${cardAnimation} space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70`}
        style={{ animationDelay: "160ms" }}
      >
        <TextArea
          label="About"
          value={form.about}
          onChange={(value) => setField("about", value)}
          placeholder="A short professional summary."
        />
        <TextArea
          label="What I love about my job"
          value={form.jobInterests}
          onChange={(value) => setField("jobInterests", value)}
          placeholder="Work interests, strengths, and motivations."
        />
        <Field
          label="Resume URL"
          value={form.resumeUrl}
          onChange={(value) => setField("resumeUrl", value)}
          placeholder="https://..."
        />
        <SaveButton saving={saving} />
      </section>

      <aside className="space-y-6">
        <ListPanel
          title="Skills"
          value={form.skills}
          items={splitList(employee?.skills)}
          onChange={(value) => setField("skills", value)}
          placeholder="React, Payroll, Employee Relations"
        />
        <ListPanel
          title="Certifications"
          value={form.certifications}
          items={splitList(employee?.certifications)}
          onChange={(value) => setField("certifications", value)}
          placeholder="SHRM-CP, AWS Cloud Practitioner"
        />
      </aside>
    </div>
  );
}

function PrivateInfoTab({
  profile,
  form,
  bankMissing,
  setField,
  saving,
}: {
  profile: Profile;
  form: ProfileForm;
  bankMissing: boolean;
  setField: (field: keyof ProfileForm, value: string) => void;
  saving: boolean;
}) {
  const employee = profile.employee;

  if (!employee) {
    return (
      <section
        className={`${cardAnimation} rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70`}
        style={{ animationDelay: "160ms" }}
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Account details
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Admin accounts are company-level users and do not require employee
          private information.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="Name"
            value={form.name}
            onChange={(value) => setField("name", value)}
          />
          <ReadOnly label="Email" value={profile.user.email} />
          <ReadOnly label="Role" value={profile.user.role.replace("_", " ")} />
          <ReadOnly label="Company" value={profile.company?.name ?? "-"} />
        </div>
        <SaveButton saving={saving} />
      </section>
    );
  }

  return (
    <section
      className={`${cardAnimation} rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: "160ms" }}
    >
      {bankMissing && (
        <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
          Warning: bank account details are incomplete. Payroll warnings will
          include this employee until account number and IFSC are filled.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold text-slate-900">Personal information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(value) => setField("dateOfBirth", value)}
            />
            <ReadOnly
              label="Date of Joining"
              value={asDateInput(employee.dateOfJoining)}
            />
            <Field
              label="Residential Address"
              value={form.address}
              onChange={(value) => setField("address", value)}
            />
            <Field
              label="Nationality"
              value={form.nationality}
              onChange={(value) => setField("nationality", value)}
            />
            <Field
              label="Personal Email"
              value={form.personalEmail}
              onChange={(value) => setField("personalEmail", value)}
            />
            <Field
              label="Mobile"
              value={form.phone}
              onChange={(value) => setField("phone", value)}
            />
            <ReadOnly label="Gender" value={employee.gender} />
            <Field
              label="Marital Status"
              value={form.maritalStatus}
              onChange={(value) => setField("maritalStatus", value)}
            />
            <Field
              label="Manager"
              value={form.managerName}
              onChange={(value) => setField("managerName", value)}
            />
            <Field
              label="Work Location"
              value={form.workLocation}
              onChange={(value) => setField("workLocation", value)}
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">Bank details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label="Account Number"
              value={form.bankAccountNumber}
              onChange={(value) => setField("bankAccountNumber", value)}
            />
            <Field
              label="Bank Name"
              value={form.bankName}
              onChange={(value) => setField("bankName", value)}
            />
            <Field
              label="IFSC Code"
              value={form.bankIfsc}
              onChange={(value) => setField("bankIfsc", value)}
            />
            <Field
              label="PAN No"
              value={form.panNumber}
              onChange={(value) => setField("panNumber", value)}
            />
            <Field
              label="UAN No"
              value={form.uanNumber}
              onChange={(value) => setField("uanNumber", value)}
            />
            <ReadOnly label="Emp Code" value={employee.employeeCode} />
          </div>
        </div>
      </div>
      <SaveButton saving={saving} />
    </section>
  );
}

function SalaryInfoTab({ employee }: { employee: Employee | null }) {
  if (!employee) {
    return (
      <section
        className={`${cardAnimation} rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70`}
        style={{ animationDelay: "160ms" }}
      >
        <p className="text-sm text-slate-500">
          Salary information is available for employee profiles.
        </p>
      </section>
    );
  }

  const basic = employee.salaryStructure?.basicSalary ?? 0;
  const hra = employee.salaryStructure?.hra ?? 0;
  const earningComponents = employee.employeeSalaryComponents.filter(
    (c) => c.salaryComponent.type === "EARNING",
  );
  const deductionComponents = employee.employeeSalaryComponents.filter(
    (c) => c.salaryComponent.type === "DEDUCTION",
  );
  const monthlyWage =
    basic + hra + earningComponents.reduce((sum, c) => sum + c.amount, 0);
  const yearlyWage = monthlyWage * 12;
  const pf = basic * 0.12;

  function pct(amount: number) {
    if (!monthlyWage) return "—";
    return `${((amount / monthlyWage) * 100).toFixed(2)}%`;
  }

  return (
    <section
      className={`${cardAnimation} rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: "160ms" }}
    >
      <h2 className="text-lg font-semibold text-slate-900">Salary Info</h2>
      <p className="mt-1 text-sm text-slate-500">
        Visible to Admin and Payroll Officer only.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <SalaryLine
            label="Month Wage"
            value={`${money(monthlyWage)} / Month`}
          />
          <SalaryLine
            label="Yearly wage"
            value={`${money(yearlyWage)} / Yearly`}
          />
          <div className="pt-3">
            <h3 className="font-semibold text-slate-900">Salary Components</h3>
            <SalaryLine
              label="Basic Salary"
              value={`${money(basic)} / month`}
              detail={pct(basic)}
            />
            <SalaryLine
              label="House Rent Allowance"
              value={`${money(hra)} / month`}
              detail={pct(hra)}
            />
            {earningComponents.map((c) => (
              <SalaryLine
                key={c.id}
                label={c.salaryComponent.name}
                value={`${money(c.amount)} / month`}
                detail={pct(c.amount)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <SalaryLine label="No of working days in a week" value="5 days" />
          <SalaryLine label="Break time" value="1 hr" />
          <div className="pt-3">
            <h3 className="font-semibold text-slate-900">
              Provident Fund (PF) Contribution
            </h3>
            <SalaryLine
              label="Employee"
              value={`${money(pf)} / month`}
              detail="12.00%"
            />
            <p className="pl-1 text-xs text-slate-400">
              PF is calculated based on the basic salary
            </p>
            <SalaryLine
              label="Employer"
              value={`${money(pf)} / month`}
              detail="12.00%"
            />
          </div>
          <div className="pt-3">
            <h3 className="font-semibold text-slate-900">Tax Deductions</h3>
            {deductionComponents.map((c) => (
              <SalaryLine
                key={c.id}
                label={c.salaryComponent.name}
                value={`${money(c.amount)} / month`}
                detail={pct(c.amount)}
              />
            ))}
            <SalaryLine label="Professional Tax" value="₹200 / month" />
            <p className="pl-1 text-xs text-slate-400">
              Professional Tax deducted from the Gross salary
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityTab() {
  return (
    <section
      className={`${cardAnimation} grid gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 lg:grid-cols-[minmax(0,1fr)_320px]`}
      style={{ animationDelay: "160ms" }}
    >
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <IconLock size={22} />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-slate-900">
          Password management
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Change the system-generated or current password from the secure
          password page.
        </p>
        <Link
          href="/dashboard/security/change-password"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          Change password
        </Link>
      </div>
      <div className="rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-5 ring-1 ring-slate-200/70">
        <p className="text-sm font-semibold text-slate-900">Account safety</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Password changes refresh your active session and keep your dashboard
          access aligned with the newest credential.
        </p>
      </div>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 border-b border-slate-200 pb-1 font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        rows={5}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-2 min-h-11 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200">
        {value || "-"}
      </p>
    </div>
  );
}

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <IconDeviceFloppy size={16} />
      {saving ? "Saving..." : "Save profile"}
    </button>
  );
}

function ListPanel({
  title,
  value,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  value: string;
  items: string[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <section
      className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: title === "Skills" ? "200ms" : "240ms" }}
    >
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100"
          >
            {item}
          </span>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-500">
            No {title.toLowerCase()} yet.
          </p>
        )}
      </div>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-4 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </section>
  );
}

function SalaryLine({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        {detail && <p className="text-xs text-slate-500">{detail}</p>}
      </div>
      <p className="font-semibold whitespace-nowrap text-slate-900">{value}</p>
    </div>
  );
}
