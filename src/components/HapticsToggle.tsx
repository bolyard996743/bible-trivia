"use client";

import { useEffect, useState } from "react";
import { hapticsEnabled, writeHapticsEnabled } from "@/lib/play/haptics";

/** Settings switch. Vibration stays on until the player turns it off on this device. */
export function HapticsToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(hapticsEnabled(window.localStorage));
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    writeHapticsEnabled(window.localStorage, next);
  }

  return (
    <label className="flex items-center justify-between gap-3 text-lg">
      <span>Vibration</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? "Vibration on" : "Vibration off"}
        data-testid="haptics-toggle"
        onClick={toggle}
        className="rounded-full border border-line bg-parchment px-4"
      >
        {on ? "On" : "Off"}
      </button>
    </label>
  );
}
