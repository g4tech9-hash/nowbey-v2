import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a hazard — four steps",
  description: "File a hazard report in four steps. Add a category, location, details and check before sending.",
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
