import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

// reads ?next= from the url, which needs a suspense boundary
export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
