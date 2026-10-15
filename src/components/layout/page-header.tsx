export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded-xl bg-surface-2" />
      <div className="h-40 rounded-[var(--radius-card)] bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-[var(--radius-card)] bg-surface-2" />
        <div className="h-28 rounded-[var(--radius-card)] bg-surface-2" />
        <div className="h-28 rounded-[var(--radius-card)] bg-surface-2" />
      </div>
    </div>
  );
}
