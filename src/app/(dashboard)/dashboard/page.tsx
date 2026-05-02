import { auth } from "~/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome back, {session?.user.name ?? "there"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Role:{" "}
        <span className="font-medium text-purple-700">
          {session?.user.role}
        </span>
      </p>
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-gray-500">Dashboard analytics coming in Stage 5.</p>
      </div>
    </div>
  );
}
