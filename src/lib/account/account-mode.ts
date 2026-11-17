export type AccountMode = "sign-in" | "sign-up" | "reset";

export function accountModeHref(pathname: string, search: string, mode: AccountMode): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set("mode", mode);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
