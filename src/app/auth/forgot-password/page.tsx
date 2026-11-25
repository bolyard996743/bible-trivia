import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/ForgotPasswordScreen";

export const metadata: Metadata = {
  title: "Forgot password · Noble Bereans",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
