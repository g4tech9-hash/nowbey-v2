import { ResetForm } from "@/components/reset-form";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = sp.token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  return (
    <div className="mx-auto max-w-[460px] py-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tide-400">Account help</p>
      <h1 className="display mt-1.5 text-[clamp(1.6rem,4vw,2.1rem)] font-extrabold leading-tight text-sand-100">Choose a new password</h1>
      <ResetForm token={token} />
    </div>
  );
}
