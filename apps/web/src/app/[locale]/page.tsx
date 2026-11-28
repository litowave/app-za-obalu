import { type CrowdLevel, crowdLevel } from "@obala/core";
import { getTranslations, setRequestLocale } from "next-intl/server";

// Privremeni primjer dok ne spojimo kartu i Supabase.
const preview: { name: string; place: string; occupied: number; total: number }[] = [
  { name: "Primošten Cabana", place: "Primošten", occupied: 28, total: 68 },
  { name: "Ležaljke Zaborić", place: "Zaborić", occupied: 12, total: 66 },
  { name: "Jet Ski Vodice", place: "Vodice", occupied: 4, total: 4 },
];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="page">
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <ul className="list">
        {preview.map((b) => {
          const level: CrowdLevel = crowdLevel(b.occupied, b.total);
          return (
            <li key={b.name} className="card">
              <div>
                <strong>{b.name}</strong>
                <span className="muted">{b.place}</span>
              </div>
              <span className={`crowd crowd-${level}`}>{t(`crowd.${level}`)}</span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
