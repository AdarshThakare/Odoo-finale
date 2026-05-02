import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-3 text-xl font-semibold text-gray-900">
        Registration is managed by HR
      </h2>
      <p className="text-sm leading-6 text-gray-600">
        Employee accounts are created by an Admin or HR Officer. Your Login ID
        and temporary password will be shared after your profile is created.
      </p>
      <Link
        href="/login"
        className="mt-6 block rounded-lg bg-purple-700 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-purple-800"
      >
        Back to sign in
      </Link>
    </div>
  );
}
