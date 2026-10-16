import { redirect } from "next/navigation";
import { PageHead } from "@/components/app-shell";
import { PostForm } from "@/components/life/post-form";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share an experience" };

export default async function NewPostPage() {
  const viewer = await getViewer();
  if (!viewer.signedIn) redirect("/login?mode=signin&next=/life/new");

  return (
    <div className="mx-auto max-w-[860px]">
      <PageHead
        eyebrow="Island Life"
        title="Share an experience"
        blurb="A great meal, a festival, a perfect beach or a tip for visitors. Your handle goes on it, so keep it honest and kind."
      />
      <div className="nb-surface rounded-xl2 p-4 sm:p-5">
        <PostForm defaultParish={viewer.parish} />
      </div>
    </div>
  );
}
