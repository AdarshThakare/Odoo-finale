"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState("");

  const handleOAuth = async (provider: string) => {
    setLoading(provider);
    await signIn(provider, { callbackUrl: "/" });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("email");

    await signIn("email", {
      email,
      callbackUrl: "/",
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-purple-700">EmPay</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => handleOAuth("google")}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {loading === "google" ? "Loading..." : "Continue with Google"}
          </button>

          <button
            onClick={() => handleOAuth("github")}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {loading === "github" ? "Loading..." : "Continue with GitHub"}
          </button>
        </div>

        <div className="my-5 flex items-center">
          <hr className="flex-grow border-gray-200" />
          <span className="px-2 text-sm text-gray-500">or</span>
          <hr className="flex-grow border-gray-200" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <input
            type="email"
            placeholder="Enter your email"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800">
            {loading === "email" ? "Sending link..." : "Continue with Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
