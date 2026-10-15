import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function plural(n: number, word: string, many = word + "s"): string {
  return `${n} ${n === 1 ? word : many}`;
}
