"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  "Connecting to Companies House...",
  "Fetching Liverpool businesses...",
  "Geocoding addresses...",
  "Calculating risk scores...",
  "Building your database...",
];

export default function WelcomePage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cycle through the step labels while the seed runs
    const interval = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 4000);

    // Trigger the seed — pull real data from Companies House (skipping crime data for speed)
    fetch("/api/seed?skip_crime=true")
      .then((res) => res.json())
      .then((data) => {
        clearInterval(interval);
        if (data.seeded >= 0) {
          setDone(true);
          // Give user a moment to see the success state, then redirect
          setTimeout(() => router.push("/list"), 1500);
        } else {
          setError("Something went wrong setting up your account. Please refresh.");
        }
      })
      .catch(() => {
        clearInterval(interval);
        setError("Network error during setup. Please refresh the page.");
      });

    return () => clearInterval(interval);
  }, [router]);

  return (
    <main className="min-h-svh bg-[var(--color-bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-[var(--color-accent)]" />
        </div>

        <h1 className="text-2xl font-bold text-white font-display mb-2">
          Welcome to ColdcallR
        </h1>

        {!done && !error && (
          <>
            <p className="text-slate-400 mb-10 leading-relaxed">
              We&apos;re setting up your workspace with Liverpool business intelligence.
              This only happens once.
            </p>

            {/* Animated spinner */}
            <div className="flex justify-center mb-6">
              <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
            </div>

            {/* Step label */}
            <p className="text-sm text-slate-400 h-5 transition-all duration-500">
              {STEPS[stepIndex]}
            </p>
          </>
        )}

        {done && (
          <>
            <p className="text-slate-400 mb-8">Your workspace is ready.</p>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-400 font-medium">Taking you to your leads...</p>
          </>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
