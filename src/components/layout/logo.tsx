import { cn } from "@/lib/utils";

// the か mark with its yellow seal, same as the app icon
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      className={cn("relative grid shrink-0 place-items-center rounded-[28%] bg-primary text-white shadow-[0_4px_0_var(--primary-deep)]", className)}
    >
      <span className="font-display leading-none" style={{ transform: "translate(-4%, 2%)" }}>
        か
      </span>
      <span className="absolute rounded-[25%] bg-sun" style={{ width: size * 0.16, height: size * 0.16, right: size * 0.17, bottom: size * 0.2 }} />
    </span>
  );
}
