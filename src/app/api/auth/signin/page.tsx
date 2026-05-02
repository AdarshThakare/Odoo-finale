"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { BrandLogo, BrandName } from "~/components/BrandLogo";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7fb] px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <BrandLogo size="md" className="mx-auto" />
          <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-purple-700 uppercase">
            Secure sign in
          </p>
          <h1 className="mt-3 text-2xl font-bold text-gray-950">
            Continue to <BrandName />
          </h1>
          <p className="mt-2 text-sm text-gray-500">Choose a sign-in method.</p>
        </div>

        <div className="mt-7 space-y-3">
          <button
            onClick={() => handleOAuth("google")}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-4 focus:ring-purple-100 focus:outline-none"
          >
            {loading === "google" ? "Loading..." : "Continue with Google"}
          </button>

          <button
            onClick={() => handleOAuth("github")}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-4 focus:ring-purple-100 focus:outline-none"
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
            className="block h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button className="h-11 w-full rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 focus:ring-4 focus:ring-purple-100 focus:outline-none">
            {loading === "email" ? "Sending link..." : "Continue with Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
