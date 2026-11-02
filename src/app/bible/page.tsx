import { Suspense } from "react";
import { BibleScreen } from "@/components/BibleScreen";

export default function BiblePage() {
  return (
    <Suspense fallback={<p className="text-lg text-ink-soft">Opening…</p>}>
      <BibleScreen />
    </Suspense>
  );
}
