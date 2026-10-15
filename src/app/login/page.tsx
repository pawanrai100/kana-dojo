import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

// reads ?next= from the url, which needs a suspense boundary
export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
