import Link from "next/link";
import { db } from "@/db";
import { digestPartners } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export default async function PartnersPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/");

  const partners = await db.select().from(digestPartners).orderBy(digestPartners.createdAt);

  return (
    <div className="mx-auto max-w-[1000px] py-6">
      <PageHead title="Digest Partners" blurb="Manage B2B Community Digest subscriptions." />
      
      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="display text-[18px] font-extrabold text-sand-100">Active Partners</h2>
          <Link href="/admin/partners/new" className="rounded-full bg-tide-500 px-3 py-1.5 text-[12px] font-extrabold text-abyss-950">
            + Add Partner
          </Link>
        </div>

        {partners.length ? (
          <div className="overflow-hidden rounded-xl border hairline">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white/5 text-[#6e97a0] font-bold uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2">Organisation</th>
                  <th className="px-4 py-2">Parish</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y hairline">
                {partners.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-semibold text-sand-100">{p.organisation}</td>
                    <td className="px-4 py-3 text-[#a9cdc9]">{p.parish}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p.paymentStatus === 'paid' ? 'bg-tide-500/20 text-tide-300' : 'bg-conch-500/20 text-conch-400'}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/partners/${p.id}`} className="text-tide-300 hover:underline font-bold">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-10 text-[#a9cdc9]">No partners registered yet.</p>
        )}
      </div>
    </div>
  );
}
