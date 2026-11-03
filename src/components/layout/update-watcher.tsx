"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const CHECK_MS = 5 * 60_000;

// notices when a new version of the site is deployed. progress is saved on every
// answer, so reloading is always safe. a tab you come back to just reloads,
// a tab you're looking at gets a button, and changing pages picks it up too
export function UpdateWatcher() {
  const [fresh, setFresh] = useState(false);
  const stale = useRef(false);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!BUILD_ID) return;
    let busy = false;
    const check = async () => {
      if (busy || stale.current) return;
      busy = true;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        const { id } = (await res.json()) as { id?: string };
        if (id && id !== BUILD_ID) {
          stale.current = true;
          setFresh(true);
        }
      } catch {
        // offline or mid-deploy, try again later
      } finally {
        busy = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // back on the tab and it's out of date: nothing on screen to lose, just reload
      if (stale.current) window.location.reload();
      else void check();
    };
    void check();
    const id = window.setInterval(() => document.visibilityState === "visible" && void check(), CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  // going to another page is a natural moment to pick up the new version
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (stale.current) window.location.reload();
  }, [pathname]);

  if (!fresh) return null;
  return (
    <div role="status" className="animate-pop fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-[0_6px_0_rgb(0_0_0/0.25)] lg:bottom-6">
      <span className="min-w-0 flex-1 text-sm font-bold">Kana Dojo just got an update.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 rounded-xl bg-sun px-3 py-1.5 text-sm font-extrabold text-sun-ink"
      >
        <RefreshCw className="size-4" aria-hidden /> Update
      </button>
    </div>
  );
}
