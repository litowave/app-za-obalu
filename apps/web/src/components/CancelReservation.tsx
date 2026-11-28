"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";

/** Otkazivanje u dva koraka na samoj stranici, bez prozora preglednika. */
export function CancelReservation({ token }: { token: string }) {
  const t = useTranslations("my");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    const { error: e } = await supabase().rpc("cancel_reservation", { p_token: token });
    setBusy(false);
    if (e) {
      setError(t("cancelFailed"));
      setAsking(false);
      return;
    }
    router.refresh();
  }

  if (!asking) {
    return (
      <>
        <button type="button" className="lito-btn ghost" onClick={() => setAsking(true)}>
          {t("cancel")}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </>
    );
  }
  return (
    <div className="confirm lito-card" role="alertdialog" aria-label={t("cancelAsk")}>
      <p>{t("cancelAsk")}</p>
      <div className="actions">
        <button type="button" className="lito-btn" onClick={() => void cancel()} disabled={busy}>
          {t("cancelYes")}
        </button>
        <button type="button" className="lito-btn ghost" onClick={() => setAsking(false)}>
          {t("keep")}
        </button>
      </div>
    </div>
  );
}
