"use client";

import { useEffect } from "react";
import { startAccountSync } from "@/lib/account/session";

export function AccountSync() {
  useEffect(() => startAccountSync(), []);
  return null;
}
