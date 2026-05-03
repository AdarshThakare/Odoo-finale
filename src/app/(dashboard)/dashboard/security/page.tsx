import { ChangePasswordForm } from "~/app/(auth)/change-password/ChangePasswordForm";

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

export default function SecurityPage() {
  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              Security
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Account protection
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Update your password and keep the sign-in path for your dashboard
              account healthy.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            Secure session
          </span>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <SecurityMetric
            label="Password"
            value="Active"
            detail="Use a private, unique password"
            delay="80ms"
          />
          <SecurityMetric
            label="Session"
            value="Protected"
            detail="Refreshes after password change"
            delay="120ms"
          />
          <SecurityMetric
            label="Access"
            value="Dashboard"
            detail="Company account credentials"
            delay="160ms"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={cardAnimation} style={{ animationDelay: "200ms" }}>
            <ChangePasswordForm
              title="Update password"
              description="Choose a new password with at least eight characters, one uppercase letter, and one number."
              submitLabel="Update password"
              currentPasswordLabel="Current password"
              successRedirect="/dashboard/security"
            />
          </div>

          <aside
            className={`${cardAnimation} rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-5 shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "240ms" }}
          >
            <p className="text-sm font-semibold text-slate-900">
              Good password habits
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/70">
                Avoid reusing passwords from payroll, banking, or email tools.
              </p>
              <p className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/70">
                Do not share credentials with managers or teammates.
              </p>
              <p className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/70">
                After updating, your session is refreshed with the new login
                credential.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function SecurityMetric({
  label,
  value,
  detail,
  delay,
}: {
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
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
