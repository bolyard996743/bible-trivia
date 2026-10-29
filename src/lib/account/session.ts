import { createVerseMarkStore } from "../bible/marks";
import type { StoredState } from "../storage";
import {
  ageGateFromBracket,
  ageGroupFromBirthDate,
  calendarToday,
  loadDeviceBirthDate,
  stateWithBirthAge,
  writeAgeGate,
} from "./age-gate";
import { hasDeviceProgress, mergeAccountProgress } from "./merge";
import { canOfferAccount } from "./policy";
import {
  createLocalPlayerRepository,
  createSyncingRepository,
  getPlayerRepository,
  setPlayerRepository,
  type PlayerRepository,
} from "./repository";
import { createSupabasePlayerRepository } from "./supabase-db";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";

const DECLINED_KEY = "bible-trivia-merge-declined";

export type MergeOffer = {
  userId: string;
  local: StoredState;
  remote: StoredState | null;
};

type Listener = () => void;
const listeners = new Set<Listener>();
let offer: MergeOffer | null = null;

export function getMergeOffer(): MergeOffer | null {
  return offer;
}

export function subscribeAccount(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("bible-trivia-storage"));
}

function declinedUser(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DECLINED_KEY);
}

function localMarks() {
  if (typeof window === "undefined") return [];
  return createVerseMarkStore(window.localStorage).list();
}

export async function acceptMerge(): Promise<void> {
  const pending = offer;
  if (!pending || typeof window === "undefined") return;
  const localRepo = createLocalPlayerRepository(window.localStorage);
  const remote = createSupabasePlayerRepository(getSupabaseBrowserClient()!, pending.userId);
  const merged = mergeAccountProgress(pending.local, pending.remote, localMarks(), await remote.loadMarks());
  if (merged.state && merged.upload) {
    await remote.save(merged.state);
    await remote.saveMarks(merged.marks);
    await localRepo.save(merged.state);
    await localRepo.saveMarks(merged.marks);
  }
  window.localStorage.removeItem(DECLINED_KEY);
  offer = null;
  setPlayerRepository(
    createSyncingRepository(localRepo, remote, Boolean(merged.state && canOfferAccount(merged.state.ageGroup))),
  );
  notify();
}

export function declineMerge() {
  if (!offer || typeof window === "undefined") return;
  window.localStorage.setItem(DECLINED_KEY, offer.userId);
  offer = null;
  setPlayerRepository(createLocalPlayerRepository(window.localStorage));
  notify();
}

function alignLocalAge(local: StoredState | null): StoredState | null {
  const birth = loadDeviceBirthDate();
  if (!birth) return local;
  const today = calendarToday();
  const group = ageGroupFromBirthDate(birth, today);
  writeAgeGate(ageGateFromBracket(group));
  if (!local) return local;
  return stateWithBirthAge(local, birth, today);
}

async function adoptSession(userId: string) {
  if (typeof window === "undefined") return;
  const localRepo = createLocalPlayerRepository(window.localStorage);
  const local = alignLocalAge(await localRepo.load());
  if (local) await localRepo.save(local);
  if (local && !canOfferAccount(local.ageGroup)) {
    offer = null;
    setPlayerRepository(localRepo);
    return;
  }
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const remoteRepo = createSupabasePlayerRepository(client, userId);
  let remote: StoredState | null = null;
  try {
    remote = await remoteRepo.load();
  } catch {
    remote = null;
  }
  const marks = localMarks();
  const shouldOffer = Boolean(local && declinedUser() !== userId && (hasDeviceProgress(local, marks) || remote));
  if (shouldOffer && local) {
    offer = { userId, local, remote };
    setPlayerRepository(localRepo);
    notify();
    return;
  }
  if (remote) {
    await localRepo.save(remote);
    await localRepo.saveMarks(await remoteRepo.loadMarks());
  }
  offer = null;
  setPlayerRepository(createSyncingRepository(localRepo, remoteRepo, true));
  notify();
}

export function startAccountSync(): () => void {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return () => {};
  let active = true;
  void supabase.auth.getSession().then(({ data }) => {
    if (!active) return;
    const userId = data.session?.user.id;
    if (userId) void adoptSession(userId);
  });
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      offer = null;
      setPlayerRepository(createLocalPlayerRepository(window.localStorage));
      notify();
      return;
    }
    void adoptSession(session.user.id);
  });
  return () => {
    active = false;
    data.subscription.unsubscribe();
  };
}

export function currentRepository(): PlayerRepository {
  return getPlayerRepository();
}
