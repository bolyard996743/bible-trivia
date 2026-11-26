"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { deleteMyAccount } from "@/app/account/delete-account";
import {
  ACCOUNT_DELETED_HREF,
  DELETE_ACCOUNT_UNAVAILABLE,
} from "@/lib/account/delete-account-copy";
import { discardLocalProgress } from "@/lib/account/session";
import { getSupabaseBrowserClient, signOut } from "@/lib/account/supabase";

export function DeleteAccountControl() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setError(null);
    setOpen(false);
  }

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const result = await deleteMyAccount({
        accessToken: session?.access_token ?? null,
        userId: session?.user?.id ?? null,
      });
      if (!result.ok) {
        setError(result.message);
        setPending(false);
        return;
      }
      discardLocalProgress();
      try {
        await signOut();
      } catch {
        // The account is already gone. Clearing this device still finishes the sign-out.
      }
      discardLocalProgress();
      router.push(ACCOUNT_DELETED_HREF);
    } catch {
      setError(DELETE_ACCOUNT_UNAVAILABLE);
      setPending(false);
    }
  }

  return (
    <section className="grid gap-3 border-t border-line pt-8" data-testid="delete-account-section">
      <button
        type="button"
        data-testid="delete-account"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="delete-account w-full rounded-2xl px-4 text-lg font-semibold"
      >
        Delete account
      </button>
      {open ? <DeleteAccountDialog pending={pending} error={error} onYes={() => void confirm()} onNo={close} /> : null}
    </section>
  );
}
