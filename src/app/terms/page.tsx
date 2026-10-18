import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Page() {
  return (
    <LegalPage title="Terms of Service" updated="October 18, 2026">
      <p>By using Kana Dojo you agree to these terms. They&apos;re short.</p>

      <section>
        <h2>The service</h2>
        <p>
          Kana Dojo is a free tool for practicing Japanese reading. It&apos;s a personal project, provided as is, without any
          guarantee that it will always be available or error free.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Keep your password private. You&apos;re responsible for activity on your account.</li>
          <li>Pick a username that isn&apos;t offensive or pretending to be someone else.</li>
          <li>Don&apos;t try to break, overload or get into parts of the service or other people&apos;s data you aren&apos;t meant to access.</li>
        </ul>
        <p>Accounts that break these rules may be suspended or removed.</p>
      </section>

      <section>
        <h2>Your data</h2>
        <p>
          Your progress belongs to you. You can download it from your profile, and ask for your account to be deleted at any
          time. See the <Link href="/privacy">Privacy Policy</Link> for details.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          These terms may be updated as Kana Dojo grows. The date at the top shows the latest version. Continuing to use the
          site after a change means you accept it.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
