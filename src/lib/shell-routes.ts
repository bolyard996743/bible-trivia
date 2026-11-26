/** Pages that must render before a birthday is saved, including email links. */
export function skipsAgeGate(pathname: string): boolean {
  return pathname === "/privacy" || pathname === "/terms" || pathname === "/donate" || pathname.startsWith("/auth/");
}