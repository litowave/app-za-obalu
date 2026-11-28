import { formatDayLong, formatEur, parseEurToCents, zagrebClock, zagrebToday } from "@obala/core";
import type { PaymentMethod } from "@obala/db";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Banner,
  Body,
  Button,
  Card,
  color,
  ErrorText,
  Field,
  fonts,
  Screen,
  SectionHeading,
  space,
  Title,
} from "@/components/ui";
import { useBusiness } from "@/lib/business";
import { errorMessage, isNetworkError, supabase } from "@/lib/supabase";

interface Workday {
  work_date: string;
  opened_at: string;
  closed_at: string | null;
  expected_cash_cents: number | null;
  expected_card_cents: number | null;
  counted_cash_cents: number | null;
  note: string | null;
}

interface TypeTotals {
  id: string;
  name: string;
  sales: number;
  cash: number;
  card: number;
}

/** "Štima", "Manjka 5,00 €" ili "Višak 2,00 €". */
function difference(counted: number, expected: number): { text: string; ok: boolean } {
  const d = counted - expected;
  if (d === 0) return { text: "Blagajna štima", ok: true };
  return d < 0
    ? { text: `Manjka ${formatEur(-d)}`, ok: false }
    : { text: `Višak ${formatEur(d)}`, ok: false };
}

/**
 * Radni dan i blagajna. Svaki dan se otvara novi radni dan. Djelatnik vidi promet
 * današnjeg dana po načinu plaćanja i po predmetu, a na kraju dana izbroji gotovinu
 * i zatvori dan. Izvještaje za prošle dane, mjesece i sezonu vidi samo vlasnik.
 */
export default function RadniDan() {
  const router = useRouter();
  const { active } = useBusiness();
  const businessId = active?.business.id ?? null;
  const today = zagrebToday();
  const [day, setDay] = useState<Workday | null>(null);
  const [types, setTypes] = useState<TypeTotals[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [reclose, setReclose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    const [wd, totals] = await Promise.all([
      supabase.rpc("open_workday", { p_business_id: businessId }),
      supabase.rpc("workday_totals", { p_business_id: businessId }),
    ]);
    const e = wd.error ?? totals.error;
    if (e) {
      setOffline(isNetworkError(e));
      if (!isNetworkError(e)) setError(errorMessage(e));
      setLoaded(true);
      return;
    }
    setOffline(false);
    setDay(wd.data as Workday);
    const byType = new Map<string, TypeTotals>();
    for (const r of totals.data ?? []) {
      const t = byType.get(r.item_type_id) ?? {
        id: r.item_type_id,
        name: r.item_type_name,
        sales: 0,
        cash: 0,
        card: 0,
      };
      t.sales += r.sales;
      const amount = Number(r.amount_cents);
      if ((r.payment_method as PaymentMethod) === "cash") t.cash += amount;
      else t.card += amount;
      byType.set(r.item_type_id, t);
    }
    setTypes([...byType.values()]);
    setLoaded(true);
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const t = setInterval(() => void load(), 30000);
      return () => clearInterval(t);
    }, [load]),
  );

  useEffect(() => {
    if (day?.note && !note) setNote(day.note);
  }, [day?.note, note]);

  const total = useMemo(
    () =>
      types.reduce(
        (a, t) => ({ cash: a.cash + t.cash, card: a.card + t.card, sales: a.sales + t.sales }),
        { cash: 0, card: 0, sales: 0 },
      ),
    [types],
  );
  const countedCents = counted.trim() === "" ? null : parseEurToCents(counted);
  const closed = Boolean(day?.closed_at) && !reclose;

  async function close() {
    if (!businessId) return;
    if (countedCents == null) {
      setError("Upiši koliko je gotovine u blagajni, npr. 420 ili 420,50.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("close_workday", {
      p_business_id: businessId,
      p_counted_cash_cents: countedCents,
      p_note: note.trim() || undefined,
    });
    setBusy(false);
    if (e) {
      setError(
        isNetworkError(e)
          ? "Nema veze. Dan zatvori kad se veza vrati, brojke ostaju iste."
          : errorMessage(e),
      );
      return;
    }
    setDay(data as Workday);
    setReclose(false);
    setCounted("");
    await load();
  }

  const afterClose =
    day?.closed_at && day.expected_cash_cents != null && day.expected_card_cents != null
      ? total.cash + total.card - day.expected_cash_cents - day.expected_card_cents
      : 0;

  return (
    <Screen>
      <Button title="‹ Danas" kind="text" onPress={() => router.back()} />
      <Title>Radni dan</Title>
      <Body muted>
        {formatDayLong(today)}
        {day ? ` · otvoren u ${zagrebClock(day.opened_at)}` : ""}
      </Body>
      {offline ? <Banner>Bez veze. Brojke će se osvježiti kad se veza vrati.</Banner> : null}

      <Card style={s.totals}>
        <Text style={s.small}>Promet danas</Text>
        <Text style={s.big}>{formatEur(total.cash + total.card)}</Text>
        <View style={s.split}>
          <View style={s.splitCell}>
            <Text style={s.small}>Gotovina</Text>
            <Text style={s.mid}>{formatEur(total.cash)}</Text>
          </View>
          <View style={s.splitCell}>
            <Text style={s.small}>Kartica</Text>
            <Text style={s.mid}>{formatEur(total.card)}</Text>
          </View>
          <View style={s.splitCell}>
            <Text style={s.small}>Prodaja</Text>
            <Text style={s.mid}>{total.sales}</Text>
          </View>
        </View>
      </Card>

      <SectionHeading>Po predmetima</SectionHeading>
      {loaded && types.length === 0 ? <Body muted>Danas još nema naplate.</Body> : null}
      {types.map((t) => (
        <View key={t.id} style={s.row} accessible>
          <View style={{ flex: 1 }}>
            <Text style={s.rowName}>{t.name}</Text>
            <Text style={s.rowSub}>
              {t.sales} kom · gotovina {formatEur(t.cash)} · kartica {formatEur(t.card)}
            </Text>
          </View>
          <Text style={s.rowAmount}>{formatEur(t.cash + t.card)}</Text>
        </View>
      ))}
      <Body muted>
        Broji se novac naplaćen danas. Najam za više dana plaćen danas ovdje je u cijelosti.
      </Body>

      <SectionHeading>Kraj dana</SectionHeading>
      {closed && day ? (
        <Card style={s.closed}>
          <Text style={s.rowName}>Dan zatvoren u {zagrebClock(day.closed_at ?? "")}</Text>
          <Text style={s.rowSub}>
            Gotovina prema zapisima {formatEur(day.expected_cash_cents ?? 0)}, izbrojeno{" "}
            {formatEur(day.counted_cash_cents ?? 0)}
          </Text>
          <Text
            style={[
              s.diff,
              difference(day.counted_cash_cents ?? 0, day.expected_cash_cents ?? 0).ok
                ? s.diffOk
                : s.diffOff,
            ]}
          >
            {difference(day.counted_cash_cents ?? 0, day.expected_cash_cents ?? 0).text}
          </Text>
          <Text style={s.rowSub}>Kartica {formatEur(day.expected_card_cents ?? 0)}</Text>
          {day.note ? <Text style={s.rowSub}>Napomena: {day.note}</Text> : null}
          {afterClose !== 0 ? (
            <Text style={s.rowSub}>
              Nakon zatvaranja promet se promijenio za {formatEur(afterClose)}. Zatvori dan ponovno.
            </Text>
          ) : null}
          <Button title="Zatvori ponovno" kind="glass" onPress={() => setReclose(true)} />
        </Card>
      ) : (
        <>
          <Body muted>
            Izbroji gotovinu od današnje prodaje, bez sitniša s kojim je blagajna otvorena, i upiši
            iznos.
          </Body>
          <Field
            label="Gotovina u blagajni (€)"
            value={counted}
            onChangeText={setCounted}
            keyboardType="decimal-pad"
            placeholder={formatEur(total.cash).replace(" €", "")}
          />
          {countedCents != null ? (
            <Text
              style={[s.diff, difference(countedCents, total.cash).ok ? s.diffOk : s.diffOff]}
              accessibilityLiveRegion="polite"
            >
              {difference(countedCents, total.cash).text}
            </Text>
          ) : null}
          <Field
            label="Napomena (neobavezno)"
            value={note}
            onChangeText={setNote}
            placeholder="npr. vraćeno 5 € gostu za L3"
            multiline
          />
          <Button title="Zatvori dan" onPress={close} loading={busy} block />
          {reclose ? (
            <Button title="Odustani" kind="text" onPress={() => setReclose(false)} />
          ) : null}
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const s = StyleSheet.create({
  totals: { gap: 4 },
  small: { fontFamily: fonts.bodyStrong, fontSize: 12.5, color: color.textMuted },
  big: { fontFamily: fonts.heading, fontSize: 34, color: color.text },
  mid: { fontFamily: fonts.heading, fontSize: 18, color: color.text },
  split: { flexDirection: "row", marginTop: space.s, gap: space.m },
  splitCell: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    paddingVertical: space.s,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowName: { fontFamily: fonts.bodyStrong, fontSize: 16, color: color.text },
  rowSub: { fontFamily: fonts.body, fontSize: 14, color: color.textMuted, lineHeight: 20 },
  rowAmount: { fontFamily: fonts.heading, fontSize: 16, color: color.text },
  closed: { gap: 6 },
  diff: { fontFamily: fonts.bodyStrong, fontSize: 17 },
  diffOk: { color: color.buttonText },
  diffOff: { color: color.text },
});
