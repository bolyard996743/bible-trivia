import { CompleteClient } from "@/components/CompleteClient";
import { loadCatalog } from "@/lib/content/load";

export default function CompletePage() {
  const { lines } = loadCatalog();
  return <CompleteClient lines={lines} />;
}
