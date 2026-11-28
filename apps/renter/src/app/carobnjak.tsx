import type { BusinessCategory } from "@obala/db";
import * as Location from "expo-location";
import { useState } from "react";
import { View } from "react-native";
import { ItemForm } from "@/components/ItemForm";
import {
  Body,
  Button,
  Chip,
  ErrorText,
  Field,
  Label,
  Row,
  Screen,
  space,
  Title,
} from "@/components/ui";
import { useBusiness } from "@/lib/business";
import { createItemType } from "@/lib/items";
import { errorMessage, supabase } from "@/lib/supabase";

const CATEGORIES: { key: BusinessCategory; label: string }[] = [
  { key: "beach", label: "Plaža" },
  { key: "watersports", label: "Vodeni sportovi" },
  { key: "aquapark", label: "Aquapark" },
  { key: "massage", label: "Masaža na plaži" },
  { key: "diving", label: "Škola ronjenja" },
  { key: "self_service", label: "Automat za najam" },
  { key: "other", label: "Ostalo" },
];

/** Tri koraka nakon registracije (specifikacija 4.1 I1): objekt, lokacija, prva ponuda. */
export default function Carobnjak() {
  const { refresh, setActive } = useBusiness();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("beach");
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function locate() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setError(
          "Bez dozvole za lokaciju ne možemo postaviti pribadaču. Dozvoli lokaciju u postavkama mobitela.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError("Lokacija trenutno nije dostupna. Pokušaj vani, uz bolji signal.");
    } finally {
      setBusy(false);
    }
  }

  async function createBusiness() {
    if (!coords) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("businesses")
      .insert({
        name: name.trim(),
        category,
        place: place.trim() || null,
        location: `SRID=4326;POINT(${coords.lng} ${coords.lat})`,
      } as never)
      .select("id")
      .single();
    setBusy(false);
    if (e) {
      setError(errorMessage(e));
      return;
    }
    setBusinessId(data.id);
    setActive(data.id);
    setStep(3);
  }

  return (
    <Screen>
      <Body muted>Korak {step} od 3</Body>
      {step === 1 ? (
        <>
          <Title>Tvoj objekt</Title>
          <Field
            label="Naziv"
            value={name}
            onChangeText={setName}
            placeholder="npr. Primošten Cabana"
          />
          <View>
            <Label>Što nudiš</Label>
            <Row>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  selected={category === c.key}
                  onPress={() => setCategory(c.key)}
                />
              ))}
            </Row>
          </View>
          <Field
            label="Mjesto"
            value={place}
            onChangeText={setPlace}
            placeholder="npr. Primošten"
          />
          <ErrorText>{error}</ErrorText>
          <Button
            title="Dalje"
            block
            disabled={name.trim().length < 2}
            onPress={() => setStep(2)}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Title>Gdje si na karti</Title>
          <Body>
            Najlakše je dok stojiš na svojoj plaži ili pultu: dodirni gumb i lokacija se upiše sama.
            Kasnije je možeš promijeniti u postavkama.
          </Body>
          <Button
            title="Koristi moju trenutnu lokaciju"
            onPress={locate}
            loading={busy && !coords}
            block
          />
          {coords ? (
            <Body>
              Lokacija spremljena: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </Body>
          ) : null}
          <ErrorText>{error}</ErrorText>
          <Row gap={space.s}>
            <Button title="Natrag" kind="glass" onPress={() => setStep(1)} />
            <Button
              title="Dalje"
              disabled={!coords}
              loading={busy && Boolean(coords)}
              onPress={createBusiness}
            />
          </Row>
        </>
      ) : null}

      {step === 3 && businessId ? (
        <>
          <Title>Prva ponuda</Title>
          <Body>
            Odaberi što iznajmljuješ. Sustav sam numerira, a svaku oznaku možeš promijeniti.
          </Body>
          <ItemForm
            businessId={businessId}
            saveLabel={(n) => `Spremi ${n} kom i otvori bilježnicu`}
            onSave={async (input) => {
              await createItemType(input);
              await refresh();
            }}
          />
          <Button title="Preskoči, dodat ću kasnije" kind="text" onPress={() => void refresh()} />
        </>
      ) : null}
    </Screen>
  );
}
