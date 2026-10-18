# Turning on accounts (Supabase + Google)

Do these once. About 20 minutes. Until you finish, the site keeps working exactly like before in guest mode.

You'll need your Vercel site address. It looks like `https://kana-dojo-xxxx.vercel.app`. Below it's written as **YOUR-SITE**.

---

## Part 1. Create the Supabase project (5 min)

1. Go to **supabase.com** and click **Start your project**. Sign in with GitHub.
2. Click **New project**.
   - **Name:** `kana-dojo`
   - **Database password:** click **Generate a password** and save it somewhere safe (you won't need it for the app, but don't lose it).
   - **Region:** pick the one closest to you (for Seoul: **Northeast Asia (Seoul)**).
   - Click **Create new project** and wait about a minute.

## Part 2. Create the database tables (2 min)

1. In the left sidebar click **SQL Editor**.
2. Click **New query** (or the **+**).
3. Open the file `supabase/migrations/0001_accounts_and_progress.sql` from this repo on GitHub, copy **everything**, and paste it into the editor.
4. Click **Run** (bottom right).
5. You should see **Success. No rows returned**. That's correct.

This creates two tables (`profiles`, `user_progress`) with Row Level Security, so every user can only ever read and change their own data.

## Part 3. Copy your two public keys (2 min)

1. Click the **gear icon (Project Settings)** at the bottom of the left sidebar.
2. Open **API Keys**. Copy the **Publishable key** (starts with `sb_publishable_`).
   - ⚠️ Do **not** copy the **Secret key** (`sb_secret_...`). That one must never go into the website. The site refuses to start accounts if it sees one.
3. Find your **Project URL**: click **Connect** at the top of the dashboard, or go to **Project Settings > Data API**. It looks like `https://abcdefgh.supabase.co`.

## Part 4. Add the keys to Vercel (3 min)

1. Go to **vercel.com**, open the **kana-dojo** project, then **Settings > Environment Variables**.
2. Add the first variable:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** your Project URL
   - Leave all environments ticked, click **Save**.
3. Add the second:
   - **Key:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Value:** your publishable key
   - Click **Save**.
4. These only take effect on the next deploy. Don't redeploy yet; finish the rest first.

## Part 5. Tell Supabase where your site lives (2 min)

1. In Supabase: **Authentication** (left sidebar) **> URL Configuration**.
2. **Site URL:** `https://YOUR-SITE` and click **Save**.
3. Under **Redirect URLs** click **Add URL** and add each of these:
   - `https://YOUR-SITE/**`
   - `http://localhost:3000/**`
   - `https://*-pawanrai100s-projects.vercel.app/**` (lets Vercel preview links log in too; check the exact ending in your Vercel deployment links and adjust)

## Part 6. Email login settings (1 min)

1. **Authentication > Sign In / Providers > Email**. It's on by default. Keep **Confirm email** on.
2. Know this limit: Supabase's free built-in email sender **only delivers to members of your Supabase team, max 2 emails per hour**. So email sign up works when *you* test it, but friends won't receive confirmation emails yet.
   - Google login works for everyone right away.
   - When you want email for other people: create a free account at **resend.com**, then in Supabase go to **Authentication > Emails > SMTP Settings**, turn on custom SMTP and paste Resend's SMTP details. Then everyone gets emails.

## Part 7. Google login (8 min)

### In Google Cloud

1. Go to **console.cloud.google.com**. At the top, click the project picker and choose **New project**. Name it `Kana Dojo`, click **Create**, then make sure it's selected.
2. In the search bar type **Google Auth Platform** and open it. Click **Get started**.
   - **App name:** `Kana Dojo`
   - **User support email:** your email
   - **Audience:** **External**
   - **Contact email:** your email
   - Agree and click **Create**.
3. In the left menu click **Data Access > Add or remove scopes**, tick **openid** (email and profile are already there), **Update**, then **Save**.
4. In the left menu click **Clients > Create client**.
   - **Application type:** Web application
   - **Name:** `Kana Dojo web`
   - **Authorized JavaScript origins:** add `https://YOUR-SITE` and `http://localhost:3000`
   - **Authorized redirect URIs:** add the **Callback URL** from Supabase. Get it from Supabase **Authentication > Sign In / Providers > Google** (it looks like `https://abcdefgh.supabase.co/auth/v1/callback`).
   - Click **Create**. Copy the **Client ID** and **Client secret**.
5. Left menu **Audience**: click **Publish app** so anyone can sign in (otherwise only "test users" you list can).

### In Supabase

1. **Authentication > Sign In / Providers > Google**. Turn it **on**.
2. Paste the **Client ID** and **Client secret**, click **Save**.

The Google secret lives only inside Supabase. It never goes in your code or in Vercel.

## Part 8. Deploy and test

Merge the code (I'll ask you before pushing anything), then in Vercel open **Deployments**, click **...** on the latest one, **Redeploy**. Then try:

- [ ] Log in page loads at `https://YOUR-SITE/login`
- [ ] Sign up with your own email, get the confirmation email, click it
- [ ] Log in with Google
- [ ] Play a round, open the profile page: it says **Saved to cloud**
- [ ] Open the site on your phone, log in, see the same stats
- [ ] Sign out, sign back in, stats are still there
- [ ] Forgot password sends you an email

---

## Optional: email links that work on any device

By default, a confirmation link has to be opened in the same browser you signed up in to log you in automatically. Opened anywhere else it still confirms the email, and the user just logs in normally. To make links log people in on any device:

1. Supabase **Authentication > Emails > Templates**.
2. In **Confirm signup**, replace `{{ .ConfirmationURL }}` with
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
3. In **Reset password**, replace it with
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

## Local development

Copy `.env.example` to `.env.local` and fill in the same two values. `.env.local` is git-ignored, so it never gets uploaded.
