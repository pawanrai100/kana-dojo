import type { LucideIcon } from "lucide-react";
import { BookOpenText, Castle, Ear, Grid3x3, Languages, LayoutDashboard, LineChart, PenLine, Settings, Sparkles, Swords } from "lucide-react";

// nav + learning module registry. flip status to "live" and add a route
// when a new module ships (katakana, kanji, vocab...)
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface LearningModule {
  id: string;
  label: string;
  icon: LucideIcon;
  status: "live" | "soon";
  href?: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Hiragana Practice", icon: Swords },
  { href: "/tower", label: "The Tower", icon: Castle },
  { href: "/chart", label: "Hiragana Chart", icon: Grid3x3 },
  { href: "/progress", label: "Progress & Stats", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const UPCOMING_MODULES: LearningModule[] = [
  { id: "katakana", label: "Katakana", icon: PenLine, status: "soon" },
  { id: "kanji", label: "Kanji", icon: Languages, status: "soon" },
  { id: "vocab", label: "Vocabulary", icon: BookOpenText, status: "soon" },
  { id: "listening", label: "Listening", icon: Ear, status: "soon" },
  { id: "grammar", label: "Grammar", icon: Sparkles, status: "soon" },
];
