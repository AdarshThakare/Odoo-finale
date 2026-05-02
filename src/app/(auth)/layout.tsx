import { BrandLogo } from "~/components/BrandLogo";
import { AuthLottie } from "~/components/AuthLottie";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#dfdfee] text-gray-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden border-r border-gray-200 bg-white px-10 py-10 lg:flex lg:flex-col">
          <BrandLogo size="md" className="self-start" />

          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-xl">
              <AuthLottie className="mb-8" />

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
            </div>
          </div>
        </section>

        <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-2xl">
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
