import type { Business } from "@obala/db";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Body,
  Button,
  Card,
  Chip,
  color,
  ErrorText,
  Field,
  fonts,
  Row,
  Screen,
  SectionHeading,
  space,
  Title,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useBusiness } from "@/lib/business";
import { errorMessage, supabase } from "@/lib/supabase";

interface Member {
  user_id: string;
  role: "owner" | "staff";
  profile: { full_name: string | null } | null;
}

interface Invite {
  id: string;
  email: string;
  accepted_at: string | null;
}

function publicationStatus(b: Business): string {
  if (b.is_demo) return "Demo objekt nikad nije na karti.";
  if (!b.is_published) return "Objekt nije na karti.";
  if (!b.approved_at)
    return "Zahtjev za objavu je poslan. Objekt se pojavljuje turistima nakon odobrenja.";
  if (!b.subscription_until || b.subscription_until < new Date().toISOString().slice(0, 10)) {
    return "Pretplata je istekla, objekt nije na karti. Tvoji podaci ostaju.";
  }
  return `Na karti. Pretplata vrijedi do ${b.subscription_until.split("-").reverse().join(". ")}.`;
}

export default function Postavke() {
  const { session, isAnonymous } = useAuth();
  const { active, memberships, setActive, isOwner, refresh } = useBusiness();
  const b = active?.business;
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    place: "",
    description: "",
    website: "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!b) return;
    setForm({
      name: b.name,
      phone: b.phone ?? "",
      address: b.address ?? "",
      place: b.place ?? "",
      description: b.description ?? "",
      website: b.website ?? "",
    });
  }, [b]);

  const loadTeam = useCallback(async () => {
    if (!b || !isOwner) return;
    const [m, i] = await Promise.all([
      supabase
        .from("business_members")
        .select("user_id, role, profile:profiles(full_name)")
        .eq("business_id", b.id),
      supabase
        .from("business_invites")
        .select("id, email, accepted_at")
        .eq("business_id", b.id)
        .is("accepted_at", null),
    ]);
    if (m.data) setMembers(m.data as unknown as Member[]);
    if (i.data) setInvites(i.data);
  }, [b, isOwner]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  if (!b) return null;

  async function update(key: string, patch: Partial<Business>) {
    if (!b) return;
    setBusy(key);
    setError(null);
    const { error: e } = await supabase
      .from("businesses")
      .update(patch as never)
      .eq("id", b.id);
    setBusy(null);
    if (e) {
      setError(errorMessage(e));
      return false;
    }
    await refresh();
    return true;
  }

  async function saveProfile() {
    const ok = await update("profile", {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      place: form.place.trim() || null,
      description: form.description.trim() || null,
      website: form.website.trim() || null,
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function relocate() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      setError("Dozvoli lokaciju u postavkama mobitela.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await update("location", {
      location: `SRID=4326;POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
    } as never);
  }

  async function invite() {
    if (!b) return;
    setBusy("invite");
    setError(null);
    const { error: e } = await supabase
      .from("business_invites")
      .insert({ business_id: b.id, email: inviteEmail.trim().toLowerCase() });
    setBusy(null);
    if (e) {
      setError(e.code === "23505" ? "Taj e-mail je već pozvan." : errorMessage(e));
      return;
    }
    setInviteEmail("");
    await loadTeam();
  }

  async function removeMember(userId: string) {
    if (!b) return;
    const { error: e } = await supabase
      .from("business_members")
      .delete()
      .eq("business_id", b.id)
      .eq("user_id", userId);
    if (e) setError(errorMessage(e));
    await loadTeam();
  }

  return (
    <Screen>
      <Title>Postavke</Title>

      {memberships.length > 1 ? (
        <View style={s.block}>
          <SectionHeading>Objekt</SectionHeading>
          <Row>
            {memberships.map((m) => (
              <Chip
                key={m.business.id}
                label={m.business.name}
                selected={m.business.id === b.id}
                onPress={() => setActive(m.business.id)}
              />
            ))}
          </Row>
        </View>
      ) : null}

      {isOwner ? (
        <>
          <View style={s.block}>
            <SectionHeading>Profil objekta</SectionHeading>
            <Field
              label="Naziv"
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
            />
            <Field
              label="Mjesto"
              value={form.place}
              onChangeText={(place) => setForm({ ...form, place })}
            />
            <Field
              label="Adresa"
              value={form.address}
              onChangeText={(address) => setForm({ ...form, address })}
            />
            <Field
              label="Telefon"
              value={form.phone}
              onChangeText={(phone) => setForm({ ...form, phone })}
              keyboardType="phone-pad"
            />
            <Field
              label="Web ili Instagram"
              value={form.website}
              onChangeText={(website) => setForm({ ...form, website })}
              autoCapitalize="none"
            />
            <Field
              label="Kratak opis za turiste"
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
              multiline
            />
            <Button
              title={saved ? "Spremljeno" : "Spremi profil"}
              onPress={saveProfile}
              loading={busy === "profile"}
              block
            />
            <Button
              title="Postavi lokaciju na mjesto gdje sad stojim"
              kind="glass"
              onPress={relocate}
              loading={busy === "location"}
              block
            />
          </View>

          <View style={s.block}>
            <SectionHeading>Karta za turiste</SectionHeading>
            <Body>{publicationStatus(b)}</Body>
            {!b.is_demo ? (
              <Button
                title={b.is_published ? "Makni s karte" : "Pošalji zahtjev za objavu"}
                kind={b.is_published ? "glass" : "primary"}
                onPress={() => void update("publish", { is_published: !b.is_published })}
                loading={busy === "publish"}
                block
              />
            ) : null}
          </View>

          <View style={s.block}>
            <SectionHeading>Tim</SectionHeading>
            <Body muted>
              Djelatnik bilježi prodaju i rezervacije. Ne vidi prihode ni izvještaje i ne mijenja
              cijene.
            </Body>
            {members.map((m) => (
              <Card key={m.user_id} style={s.member}>
                <Text style={s.memberName}>
                  {m.profile?.full_name || (m.user_id === session?.user.id ? "Ti" : "Djelatnik")}
                </Text>
                <Text style={s.memberRole}>{m.role === "owner" ? "vlasnik" : "djelatnik"}</Text>
                {m.role === "staff" ? (
                  <Button title="Makni" kind="text" onPress={() => void removeMember(m.user_id)} />
                ) : null}
              </Card>
            ))}
            {invites.map((i) => (
              <Body key={i.id} muted>
                Pozvan: {i.email} (čeka prvu prijavu)
              </Body>
            ))}
            {!b.is_demo ? (
              <>
                <Field
                  label="E-mail djelatnika"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  hint="Djelatnik instalira aplikaciju i registrira se s tim e-mailom. Odmah vidi ovaj objekt."
                />
                <Button
                  title="Pozovi"
                  kind="glass"
                  disabled={!inviteEmail.includes("@")}
                  onPress={invite}
                  loading={busy === "invite"}
                />
              </>
            ) : null}
          </View>
        </>
      ) : (
        <Body muted>Ti si djelatnik u objektu {b.name}. Postavke mijenja vlasnik.</Body>
      )}

      <ErrorText>{error}</ErrorText>

      <View style={s.block}>
        <SectionHeading>Račun</SectionHeading>
        <Body muted>{isAnonymous ? "Demo bez registracije" : session?.user.email}</Body>
        <Body muted>
          Aplikacija nije fiskalna blagajna: račune i dalje izdaješ kroz svoju blagajnu.
        </Body>
        <Button title="Odjava" kind="glass" onPress={() => void supabase.auth.signOut()} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  block: { gap: space.m },
  member: { flexDirection: "row", alignItems: "center", gap: space.m },
  memberName: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 15, color: color.text },
  memberRole: { fontFamily: fonts.body, fontSize: 13, color: color.textMuted },
});
