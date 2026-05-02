"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type Profile = RouterOutputs["employee"]["getMyProfile"];
type Employee = NonNullable<Profile["employee"]>;
type Tab = "resume" | "private" | "salary" | "security";

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
    return <div className="text-sm text-gray-600">Loading profile...</div>;
  }

  const employee = profile.employee;
  const displayName =
    employee ? `${employee.firstName} ${employee.lastName}` : profile.user.name;
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
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        displayName={displayName ?? "EMPAY User"}
        initials={initials}
        avatarUrl={form.avatarUrl}
        uploading={avatarUploading}
        onAvatarUpload={(file) => void uploadAvatar(file)}
      />

      <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
              tab === item.id
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
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
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="flex flex-col items-center gap-3">
          <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-purple-100 text-3xl font-bold text-purple-700 ring-4 ring-purple-50 transition hover:ring-purple-200">
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
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 px-3 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {uploading ? "Uploading..." : "Upload photo"}
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
          <p className="text-center text-xs text-gray-500">
            Click the photo to upload
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-purple-700 uppercase">
            My Profile
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            {displayName}
          </h1>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
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
          <InfoLine label="Department" value={employee?.department.name ?? "-"} />
          <InfoLine label="Manager" value={employee?.managerName ?? "-"} />
          <InfoLine label="Location" value={employee?.workLocation ?? "-"} />
        </div>
      </div>
    </section>
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
      <section className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
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
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Account details</h2>
        <p className="mt-1 text-sm text-gray-500">
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
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      {bankMissing && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Warning: bank account details are incomplete. Payroll warnings will
          include this employee until account number and IFSC are filled.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold text-gray-900">Personal information</h2>
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
          <h2 className="font-semibold text-gray-900">Bank details</h2>
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
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-sm text-gray-500">
          Salary information is available for employee profiles.
        </p>
      </section>
    );
  }

  const basic = employee.salaryStructure?.basicSalary ?? 0;
  const hra = employee.salaryStructure?.hra ?? 0;
  const monthlyWage =
    basic +
    hra +
    employee.employeeSalaryComponents
      .filter((component) => component.salaryComponent.type === "EARNING")
      .reduce((sum, component) => sum + component.amount, 0);
  const yearlyWage = monthlyWage * 12;
  const pf = basic * 0.12;

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Salary Info</h2>
      <p className="mt-1 text-sm text-gray-500">
        Visible to Admin and Payroll Officer only.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <SalaryLine label="Month Wage" value={`${money(monthlyWage)} / Month`} />
          <SalaryLine label="Yearly wage" value={`${money(yearlyWage)} / Yearly`} />
          <div className="pt-3">
            <h3 className="font-semibold text-gray-900">Salary Components</h3>
            <SalaryLine label="Basic Salary" value={money(basic)} detail="50.00%" />
            <SalaryLine label="House Rent Allowance" value={money(hra)} detail="50.00%" />
            {employee.employeeSalaryComponents
              .filter((component) => component.salaryComponent.type === "EARNING")
              .map((component) => (
                <SalaryLine
                  key={component.id}
                  label={component.salaryComponent.name}
                  value={money(component.amount)}
                />
              ))}
          </div>
        </div>

        <div className="space-y-4">
          <SalaryLine label="No of working days" value="Auto calculated" />
          <SalaryLine label="Break time" value="1 hrs" />
          <div className="pt-3">
            <h3 className="font-semibold text-gray-900">
              Provident Fund Contribution
            </h3>
            <SalaryLine label="Employee" value={`${money(pf)} / month`} detail="12.00%" />
            <SalaryLine label="Employer" value={`${money(pf)} / month`} detail="12.00%" />
          </div>
          <div className="pt-3">
            <h3 className="font-semibold text-gray-900">Tax Deductions</h3>
            {employee.employeeSalaryComponents
              .filter((component) => component.salaryComponent.type === "DEDUCTION")
              .map((component) => (
                <SalaryLine
                  key={component.id}
                  label={component.salaryComponent.name}
                  value={money(component.amount)}
                />
              ))}
            <SalaryLine label="Professional Tax" value={money(200)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityTab() {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Password Management</h2>
      <p className="mt-1 text-sm text-gray-500">
        Change the system-generated or current password from the secure password
        page.
      </p>
      <Link
        href="/change-password"
        className="mt-5 inline-flex rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
      >
        Change Password
      </Link>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-1 border-b border-gray-200 pb-1 font-medium text-gray-900">
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
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
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
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <textarea
        rows={5}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200">
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
      className="mt-5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
    >
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
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700"
          >
            {item}
          </span>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No {title.toLowerCase()} yet.</p>
        )}
      </div>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
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
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 text-sm">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
      </div>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}
