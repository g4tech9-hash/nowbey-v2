import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function GasLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!FEATURES.gasTracker) notFound();
  return children;
}
