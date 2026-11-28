import type { PublicBusiness } from "@obala/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackIcon } from "@/components/icons";
import { ReserveForm } from "@/components/ReserveForm";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ReservePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { data } = await supabase().rpc("business_public", { p_slug: slug });
  const b = data as unknown as PublicBusiness | null;

  return (
    <main className="page">
      <Link href={b ? `/o/${b.slug}` : "/karta"} className="back">
        <BackIcon /> {b?.name ?? t("business.back")}
      </Link>
      <h1>{t("reserve.title")}</h1>
      {b?.reservations_enabled ? (
        <ReserveForm business={b} />
      ) : (
        <p className="lead">{t("reserve.unavailable")}</p>
      )}
    </main>
  );
}
