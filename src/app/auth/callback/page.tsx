"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LINK_UNUSABLE } from "@/lib/account/auth-errors";
import { completeAuthRedirect } from "@/lib/account/complete-auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void completeAuthRedirect(window.location.search, window.location.hash)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          router.replace(result.next);
          return;
        }
        setMessage(result.message);
      })
      .catch(() => {
        if (active) setMessage(LINK_UNUSABLE);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!message) return <p className="text-lg text-ink-soft">Signing you in…</p>;

  return (
    <section className="grid gap-4" data-testid="auth-callback-error">
      <h1 className="text-3xl font-semibold text-grove-deep">We couldn&apos;t open that link</h1>
      <p className="text-lg text-ink" role="alert">
        {message}
      </p>
      <Link href="/account?mode=sign-in" className="tap inline-flex items-center text-lg text-grove-deep">
        Sign in
      </Link>
      <Link href="/auth/forgot-password" className="tap inline-flex items-center text-lg text-grove-deep">
        Forgot password?
      </Link>
    </section>
  );
}
