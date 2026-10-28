import { ProfileEditor } from "@/components/ProfileEditor";
import { loadCatalog } from "@/lib/content/load";

export default function ProfilePage() {
  const { lines, audioFiles } = loadCatalog();
  return <ProfileEditor lines={lines} audioFiles={audioFiles} mode="setup" />;
}
