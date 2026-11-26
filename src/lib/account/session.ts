import { createVerseMarkStore, VERSE_MARKS_KEY } from "../bible/marks";
import { BADGE_SEEN_KEY } from "../game/badge-seen";
import { legacyProgressKeys, STORAGE_KEY, type LocalBucket, type StoredState } from "../storage";
import {
  accountBirth,
  ageGateFromBracket,
  ageGroupFromBirthDate,
  birthDateIso,
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
import { createProfileForNewAccount, getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";

const DECLINED_KEY = "bible-trivia-merge-declined";
const PENDING_CARRY_KEY = "bible-trivia-pending-carry-email";

const carriedUsers = new Set<string>();
const settling = new Map<string, Promise<void>>();
let removalGeneration = 0;

function removalStill(generation: number): boolean {
  return removalGeneration === generation;
}

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

/** Stops an in-flight sync from writing this device's progress back onto a new account. */
export function beginAccountRemoval(): void {
  removalGeneration += 1;
  offer = null;
  carriedUsers.clear();
  settling.clear();
}

export function clearStoredProgress(storage: LocalBucket): void {
  const keys = new Set<string>([
    STORAGE_KEY,
    VERSE_MARKS_KEY,
    BADGE_SEEN_KEY,
    DECLINED_KEY,
    PENDING_CARRY_KEY,
    ...legacyProgressKeys(storage),
  ]);
  for (const key of keys) storage.removeItem?.(key);
}

/** Drops guest progress on this device so it cannot attach to another account. */
export function discardLocalProgress(): void {
  beginAccountRemoval();
  if (typeof window === "undefined") return;
  clearStoredProgress(window.localStorage);
  setPlayerRepository(createLocalPlayerRepository());
  notify();
}

function declinedUser(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DECLINED_KEY);
}

function localMarks() {
  if (typeof window === "undefined") return [];
  return createVerseMarkStore(window.localStorage).list();
}

export function rememberPendingCarry(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_CARRY_KEY, email.trim().toLowerCase());
}

export function clearPendingCarry(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_CARRY_KEY);
}

export function pendingCarryEmail(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(PENDING_CARRY_KEY);
  return value ? value : null;
}

/** Clears in-memory carry bookkeeping so tests do not leak across cases. */
export function resetAccountCarryForTests(): void {
  carriedUsers.clear();
  settling.clear();
  offer = null;
}

async function commitMerge(userId: string, local: StoredState, remoteState: StoredState | null): Promise<void> {
  const generation = removalGeneration;
  const client = getSupabaseBrowserClient();
  if (!client || typeof window === "undefined" || !removalStill(generation)) return;
  const localRepo = createLocalPlayerRepository(window.localStorage);
  const remote = createSupabasePlayerRepository(client, userId);
  const merged = mergeAccountProgress(local, remoteState, localMarks(), await remote.loadMarks());
  if (!removalStill(generation)) return;
  if (merged.state && merged.upload) {
    await remote.save(merged.state);
    if (!removalStill(generation)) return;
    await remote.saveMarks(merged.marks);
    if (!removalStill(generation)) return;
    await localRepo.save(merged.state);
    await localRepo.saveMarks(merged.marks);
  }
  if (!removalStill(generation)) return;
  window.localStorage.removeItem(DECLINED_KEY);
  carriedUsers.add(userId);
  clearPendingCarry();
  offer = null;
  setPlayerRepository(
    createSyncingRepository(localRepo, remote, Boolean(merged.state && canOfferAccount(merged.state.ageGroup))),
  );
  notify();
}

async function saveBirthThenCarry(userId: string, local: StoredState, remoteState: StoredState | null): Promise<void> {
  const birth = accountBirth();
  if (birth) {
    const client = getSupabaseBrowserClient();
    const user = client ? (await client.auth.getUser()).data.user : null;
    const metaName = user?.user_metadata?.username;
    const username = local.username || (typeof metaName === "string" ? metaName : "");
    await createProfileForNewAccount({
      username,
      ageGroup: birth.age,
      birthDate: birthDateIso(birth.birth),
      mascot: local.mascot,
    });
  }
  await commitMerge(userId, local, remoteState);
}

export async function acceptMerge(): Promise<void> {
  const pending = offer;
  if (!pending || typeof window === "undefined") return;
  await commitMerge(pending.userId, pending.local, pending.remote);
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
  const generation = removalGeneration;
  if (typeof window === "undefined" || !removalStill(generation)) return;
  const localRepo = createLocalPlayerRepository(window.localStorage);
  const local = alignLocalAge(await localRepo.load());
  if (!removalStill(generation)) return;
  if (local) await localRepo.save(local);
  if (!removalStill(generation)) return;
  if (local && !canOfferAccount(local.ageGroup)) {
    offer = null;
    clearPendingCarry();
    setPlayerRepository(localRepo);
    return;
  }
  const client = getSupabaseBrowserClient();
  if (!client || !removalStill(generation)) return;
  if (carriedUsers.has(userId)) {
    offer = null;
    setPlayerRepository(createSyncingRepository(localRepo, createSupabasePlayerRepository(client, userId), true));
    notify();
    return;
  }
  const remoteRepo = createSupabasePlayerRepository(client, userId);
  let remote: StoredState | null = null;
  let remoteUnreadable = false;
  try {
    remote = await remoteRepo.load();
  } catch {
    remote = null;
    remoteUnreadable = true;
  }
  if (!removalStill(generation)) return;
  const pending = pendingCarryEmail();
  if (pending && local && !remoteUnreadable) {
    const user = (await client.auth.getUser()).data.user;
    if (!removalStill(generation)) return;
    const sessionEmail = user?.email?.trim().toLowerCase() ?? "";
    if (sessionEmail && sessionEmail === pending) {
      await saveBirthThenCarry(userId, local, remote);
      return;
    }
  }
  if (!removalStill(generation)) return;
  if (pending && !local) clearPendingCarry();
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
    if (!removalStill(generation)) return;
    await localRepo.saveMarks(await remoteRepo.loadMarks());
    if (!removalStill(generation)) return;
  }
  offer = null;
  setPlayerRepository(createSyncingRepository(localRepo, remoteRepo, true));
  notify();
}

export function settleSignedInPlayer(userId: string): Promise<void> {
  const current = settling.get(userId);
  if (current) return current;
  const job = adoptSession(userId).finally(() => {
    settling.delete(userId);
  });
  settling.set(userId, job);
  return job;
}

/** Moves this device's progress after a sign-up that already has a session. */
export async function carryGuestProgress(): Promise<void> {
  if (typeof window === "undefined") return;
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const { data } = await client.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await settleSignedInPlayer(userId);
}

export function startAccountSync(): () => void {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return () => {};
  let active = true;
  void supabase.auth.getSession().then(({ data }) => {
    if (!active) return;
    const userId = data.session?.user.id;
    if (userId) void settleSignedInPlayer(userId);
  });
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      offer = null;
      carriedUsers.clear();
      setPlayerRepository(createLocalPlayerRepository(window.localStorage));
      notify();
      return;
    }
    void settleSignedInPlayer(session.user.id);
  });
  return () => {
    active = false;
    data.subscription.unsubscribe();
  };
}

export function currentRepository(): PlayerRepository {
  return getPlayerRepository();
}
