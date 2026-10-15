import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "New password" };

export default function Page() {
  return <ResetPasswordForm />;
}
