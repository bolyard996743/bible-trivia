"use client";

import { useEffect, useState } from "react";
import {
  ageGateFromAgeGroup,
  ageGateFromBirthDate,
  loadAgeGate,
  loadDeviceBirthDate,
  saveAgeGate,
  writeAgeGate,
  type AgeGate,
} from "./age-gate";
import { savePlayerState } from "./repository";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";
import { loadState } from "../storage";

export function useAgeGate() {
  const [value, setValue] = useState<AgeGate | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      const birth = loadDeviceBirthDate();
      const profile = loadState();
      if (birth) {
        const derived = ageGateFromBirthDate(birth);
        writeAgeGate(derived);
        if (profile && profile.ageGroup !== derived.bracket) {
          savePlayerState({ ...profile, ageGroup: derived.bracket });
        }
        setValue(derived);
        setReady(true);
        return;
      }
      const stored = loadAgeGate();
      if (stored) {
        setValue(stored);
        setReady(true);
        return;
      }
      if (profile) {
        const derived = ageGateFromAgeGroup(profile.ageGroup);
        saveAgeGate(derived);
        setValue(derived);
      }
      setReady(true);
    };
    read();
    window.addEventListener("bible-trivia-age-gate", read);
    return () => window.removeEventListener("bible-trivia-age-gate", read);
  }, []);

  return { value, ready };
}

export function useSignedIn() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { email, ready, configured: isSupabaseConfigured() };
}

