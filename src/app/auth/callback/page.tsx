"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/account/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/");
      return;
    }
    const code = new URLSearchParams(window.location.search).get("code");
    const finish = () => router.replace("/account");
    if (!code) {
      finish();
      return;
    }
    void supabase.auth.exchangeCodeForSession(code).finally(finish);
  }, [router]);

  return <p className="text-lg text-ink-soft">Signing you in…</p>;
}
