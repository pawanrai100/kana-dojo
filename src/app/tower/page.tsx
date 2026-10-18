import type { Metadata } from "next";
import { TowerView } from "@/features/tower/tower-view";

export const metadata: Metadata = { title: "The Tower" };

export default function Page() {
  return <TowerView />;
}
