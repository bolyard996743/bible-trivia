export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let stashedPrompt: InstallPromptEvent | null = null;
let sawInstall = false;
const watchers = new Set<() => void>();

function isInstallPrompt(event: Event): event is InstallPromptEvent {
  return typeof (event as Partial<InstallPromptEvent>).prompt === "function";
}

function notify() {
  for (const watcher of watchers) watcher();
}

export function currentInstallPrompt(): InstallPromptEvent | null {
  return sawInstall ? null : stashedPrompt;
}

export function installWasAccepted(): boolean {
  return sawInstall;
}

export function clearInstallPrompt(): void {
  stashedPrompt = null;
  notify();
}

export function markInstallAccepted(): void {
  sawInstall = true;
  stashedPrompt = null;
  notify();
}

/** Test helper. Production code does not call this. */
export function resetInstallCapture(): void {
  stashedPrompt = null;
  sawInstall = false;
  notify();
}

export function subscribeInstallCapture(listener: () => void): () => void {
  watchers.add(listener);
  return () => {
    watchers.delete(listener);
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    if (!isInstallPrompt(event)) return;
    event.preventDefault();
    stashedPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    markInstallAccepted();
  });
}
