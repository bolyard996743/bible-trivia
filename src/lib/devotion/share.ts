export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

/** Reference, a short title, and the home link. The verse wording is not included. */
export function devotionSharePayload(input: { referenceLabel: string; url: string }): SharePayload {
  return {
    title: "Daily Devotion",
    text: input.referenceLabel,
    url: input.url,
  };
}

export type ShareDeps = {
  share?: (data: SharePayload) => Promise<void>;
  writeText?: (value: string) => Promise<void>;
};

function dismissed(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && (error as { name: unknown }).name === "AbortError";
}

/**
 * Uses the Web Share API when it is available.
 * A missing API or a failed share copies the home link. Dismissing the sheet does not.
 */
export async function shareDevotion(
  payload: SharePayload,
  deps: ShareDeps,
): Promise<"shared" | "copied" | "dismissed" | "failed"> {
  if (deps.share) {
    try {
      await deps.share(payload);
      return "shared";
    } catch (error) {
      if (dismissed(error)) return "dismissed";
    }
  }
  if (!deps.writeText) return "failed";
  try {
    await deps.writeText(payload.url);
    return "copied";
  } catch {
    return "failed";
  }
}
