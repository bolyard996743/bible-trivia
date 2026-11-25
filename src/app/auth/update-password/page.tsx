import type { Metadata } from "next";
import { UpdatePasswordScreen } from "@/components/UpdatePasswordScreen";

export const metadata: Metadata = {
  title: "Choose a new password · Noble Bereans",
};

export default function UpdatePasswordPage() {
  return <UpdatePasswordScreen />;
}
