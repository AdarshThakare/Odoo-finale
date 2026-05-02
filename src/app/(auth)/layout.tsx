import { BrandLogo } from "~/components/BrandLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7fb] text-gray-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(440px,520px)]">
        <section className="hidden border-r border-gray-200 bg-white px-10 py-10 lg:flex lg:flex-col">
          <BrandLogo size="md" />

          <div className="flex flex-1 items-center">
            <div className="max-w-xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-purple-700 uppercase">
                Smart HRMS
              </p>
              <h1 className="mt-4 text-5xl font-bold leading-tight text-gray-950">
                People operations with payroll-grade precision.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-gray-600">
                A polished workspace for employee records, attendance, leave,
                payroll, and secure role-based access.
              </p>

              <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-gray-950">01</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Admin setup
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-gray-950">02</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Team access
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-gray-950">03</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Payroll flow
                  </p>
                </div>
              </div>

              <div className="mt-10 rounded-xl border border-purple-100 bg-purple-50/70 p-5">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <span className="text-sm font-semibold text-purple-950">
                    Today
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Secure
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="h-2.5 w-11/12 rounded-full bg-purple-200" />
                  <div className="h-2.5 w-8/12 rounded-full bg-purple-200" />
                  <div className="h-2.5 w-10/12 rounded-full bg-purple-200" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Built for clear records, careful approvals, and confident payroll.
          </p>
        </section>

        <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandLogo size="md" />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
