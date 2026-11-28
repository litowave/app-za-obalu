import { setRequestLocale } from "next-intl/server";
import { Welcome } from "@/components/Welcome";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Welcome path="/" />;
}
