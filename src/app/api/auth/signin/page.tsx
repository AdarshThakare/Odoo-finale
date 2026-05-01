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
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Sign In</h1>

      {/* Google */}
      <button
        onClick={() => handleOAuth("google")}
        className="w-64 rounded border bg-white px-4 py-2"
      >
        {loading === "google" ? "Loading..." : "Continue with Google"}
      </button>

      {/* GitHub */}
      <button
        onClick={() => handleOAuth("github")}
        className="w-64 rounded bg-black px-4 py-2 text-white"
      >
        {loading === "github" ? "Loading..." : "Continue with GitHub"}
      </button>

      {/* Divider */}
      <div className="flex w-64 items-center">
        <hr className="flex-grow" />
        <span className="px-2 text-sm text-gray-500">or</span>
        <hr className="flex-grow" />
      </div>

      {/* Email (Resend) */}
      <form onSubmit={handleEmailSignIn} className="flex w-64 flex-col gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          className="rounded border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button className="rounded bg-blue-500 py-2 text-white">
          {loading === "email" ? "Sending link..." : "Continue with Email"}
        </button>
      </form>
    </div>
  );
}
