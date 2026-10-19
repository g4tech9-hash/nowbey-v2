import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map — live hazard pins across The Bahamas",
  description: "Browse hazard reports on aerial imagery for The Bahamas. Filter by island and category, confirm what neighbours see.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
