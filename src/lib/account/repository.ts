import { createVerseMarkStore, type StorageLike, type VerseMark } from "../bible/marks";
import { readLocalState, writeLocalState, type StoredState } from "../storage";

export interface PlayerRepository {
  readonly kind: "local" | "supabase";
  load(): Promise<StoredState | null>;
  save(state: StoredState): Promise<void>;
  loadMarks(): Promise<VerseMark[]>;
  saveMarks(marks: VerseMark[]): Promise<void>;
}

function browserStorage(): StorageLike {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    };
  }
  return window.localStorage;
}

export function createLocalPlayerRepository(storage: StorageLike = browserStorage()): PlayerRepository {
  const marks = createVerseMarkStore(storage);
  return {
    kind: "local",
    async load() {
      return readLocalState(storage);
    },
    async save(state) {
      writeLocalState(state, storage);
    },
    async loadMarks() {
      return marks.list();
    },
    async saveMarks(next) {
      marks.replace(next);
    },
  };
}

/** Writes the device copy first, then the account, so a failed upload does not erase local progress. */
export function createSyncingRepository(
  local: PlayerRepository,
  remote: PlayerRepository | null,
  allowRemote: boolean,
): PlayerRepository {
  return {
    kind: allowRemote && remote ? "supabase" : "local",
    async load() {
      if (!allowRemote || !remote) return local.load();
      try {
        const remoteState = await remote.load();
        if (remoteState) return remoteState;
      } catch {
        return local.load();
      }
      return local.load();
    },
    async save(state) {
      await local.save(state);
      if (!allowRemote || !remote || state.ageGroup === "child") return;
      await remote.save(state);
    },
    async loadMarks() {
      if (!allowRemote || !remote) return local.loadMarks();
      try {
        return await remote.loadMarks();
      } catch {
        return local.loadMarks();
      }
    },
    async saveMarks(marks) {
      await local.saveMarks(marks);
      if (!allowRemote || !remote) return;
      await remote.saveMarks(marks);
    },
  };
}

let active: PlayerRepository = createLocalPlayerRepository();

export function getPlayerRepository(): PlayerRepository {
  return active;
}

export function setPlayerRepository(repository: PlayerRepository) {
  active = repository;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bible-trivia-storage"));
  }
}

export function savePlayerState(state: StoredState): void {
  void getPlayerRepository()
    .save(state)
    .then(() => {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("bible-trivia-storage"));
    });
}
