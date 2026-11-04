import type { LucideIcon } from "lucide-react";
import { BookOpenText, Castle, Ear, Grid3x3, Languages, LayoutDashboard, LineChart, MessageCircle, Settings, Sparkles, Swords, Trophy } from "lucide-react";

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
  { href: "/practice", label: "Kana Practice", icon: Swords },
  { href: "/learn", label: "First Conversations", icon: MessageCircle },
  { href: "/study", label: "Study Studio", icon: BookOpenText },
  { href: "/tower", label: "The Tower", icon: Castle },
  { href: "/chart", label: "Kana Chart", icon: Grid3x3 },
  { href: "/progress", label: "Progress & Stats", icon: LineChart },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const UPCOMING_MODULES: LearningModule[] = [
  { id: "kanji", label: "First Kanji", icon: Languages, status: "live", href: "/study#kanji" },
  { id: "vocab", label: "Vocabulary", icon: BookOpenText, status: "live", href: "/study#words" },
  { id: "listening", label: "Listening & Sounds", icon: Ear, status: "live", href: "/study#sounds" },
  { id: "grammar", label: "Grammar", icon: Sparkles, status: "live", href: "/study#grammar" },
];
