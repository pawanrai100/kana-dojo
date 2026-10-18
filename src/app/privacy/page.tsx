import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return (
    <LegalPage title="Privacy Policy" updated="October 18, 2026">
      <p>
        Kana Dojo is a free website for learning to read Japanese. This page explains what information it keeps and why. The
        short version: only what&apos;s needed to save your learning progress, and nothing is sold or shared for advertising.
      </p>

      <section>
        <h2>Without an account</h2>
        <p>
          If you practice as a guest, your progress and settings are stored only in your own browser (local storage). They
          are never sent to us.
        </p>
      </section>

      <section>
        <h2>With an account</h2>
        <p>When you create an account we store:</p>
        <ul>
          <li>your email address, used to sign you in and send account emails like confirmations and password resets</li>
          <li>a username and, if you choose, a display name and avatar</li>
          <li>if you sign in with Google: your name and profile photo from Google, plus your Google email</li>
          <li>your learning progress and settings, such as quiz results, streaks, character mastery and theme</li>
        </ul>
        <p>
          Passwords are handled by our sign in provider and are never stored in readable form. With Google sign in, we never
          see your Google password.
        </p>
      </section>

      <section>
        <h2>How it&apos;s used</h2>
        <p>
          Only to run Kana Dojo: signing you in, syncing your progress between your devices, and showing your stats. No ads,
          no selling or renting your data, and no tracking across other websites.
        </p>
      </section>

      <section>
        <h2>Where it&apos;s stored</h2>
        <p>
          Account data is stored with <a href="https://supabase.com/privacy">Supabase</a>, which provides the database and
          sign in. The website is hosted by <a href="https://vercel.com/legal/privacy-policy">Vercel</a>. Google sign in is
          provided by <a href="https://policies.google.com/privacy">Google</a>. Each account can only read its own data.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can download all your progress from your profile page at any time.</li>
          <li>You can change your username, display name and avatar on your profile page.</li>
          <li>
            To delete your account and all its data, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the
            address on your account. It will be removed within 30 days.
          </li>
        </ul>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, the date at the top will change too. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
