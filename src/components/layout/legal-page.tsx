// shared layout for privacy + terms, plain readable text
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl rounded-[var(--radius-card)] bg-surface p-6 shadow-card sm:p-10">
      <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  );
}

export const CONTACT_EMAIL = "shotzy99100@gmail.com";
