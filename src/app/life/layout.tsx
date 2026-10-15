import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function LifeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!FEATURES.islandLife) notFound();
  return children;
}
