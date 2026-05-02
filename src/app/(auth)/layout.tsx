export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center">
        {/* Left: visual hero (hidden on small screens) */}
        <div
          className="hidden md:block md:w-1/2 h-full"
          aria-hidden="true"
          style={{
            backgroundImage: "url('/auth-hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="w-full h-full bg-gradient-to-t from-black/60 via-transparent to-black/10" />
        </div>

        {/* Right: content column */}
        <div className="w-full md:w-1/2 p-6 md:p-12">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-purple-700">EmPay</h1>
              <p className="mt-1 text-sm text-gray-500">Smart HR & Payroll Management</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
