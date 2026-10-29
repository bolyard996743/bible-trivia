"use client";

import { useEffect, useState } from "react";
import {
  ageGateFromBirthDate,
  ageGroupFromBirthDate,
  birthDateIso,
  saveAgeGate,
  saveDeviceBirthDate,
  type CalendarDate,
} from "@/lib/account/age-gate";
import { getSupabaseBrowserClient, signOut } from "@/lib/account/supabase";
import { useSignedIn } from "@/lib/account/use-access";
import { BirthdayForm } from "@/components/BirthdayForm";

const ASKED_PREFIX = "bible-trivia-birth-asked-";

export function BirthDatePrompt() {
  const auth = useSignedIn();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.ready || !auth.email) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id;
      if (!id || !active) return;
      if (window.localStorage.getItem(ASKED_PREFIX + id) === "done") return;
      const row = await supabase.from("profiles").select("birth_date").eq("user_id", id).maybeSingle();
      if (!active || row.error || !row.data || row.data.birth_date) return;
      setUserId(id);
    });
    return () => {
      active = false;
    };
  }, [auth.ready, auth.email]);

  if (!userId) return null;

  async function finish(date: CalendarDate) {
    const group = ageGroupFromBirthDate(date);
    const supabase = getSupabaseBrowserClient();
    saveDeviceBirthDate(date);
    if (group === "child") {
      saveAgeGate(ageGateFromBirthDate(date));
      window.localStorage.setItem(ASKED_PREFIX + userId, "done");
      await signOut();
      setUserId(null);
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.from("profiles").update({ birth_date: birthDateIso(date) }).eq("user_id", userId);
    if (error) return;
    saveAgeGate(ageGateFromBirthDate(date));
    window.localStorage.setItem(ASKED_PREFIX + userId, "done");
    setUserId(null);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-parchment px-4 py-10" data-testid="birth-date-prompt">
      <section className="grid w-full max-w-3xl gap-5">
        <h1 className="text-3xl font-semibold text-grove-deep">When is your birthday?</h1>
        <BirthdayForm onContinue={(date) => void finish(date)} />
      </section>
    </div>
  );
}
