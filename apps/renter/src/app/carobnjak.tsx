import type { BusinessCategory } from "@obala/db";
import { useState } from "react";
import { View } from "react-native";
import { ItemForm } from "@/components/ItemForm";
import { LocationPicker, PRECISE_ZOOM } from "@/components/location/LocationPicker";
import type { PickedLocation } from "@/components/location/mapHtml";
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
import { CATEGORIES } from "@/lib/categories";
import { createItemType } from "@/lib/items";
import { errorMessage, supabase } from "@/lib/supabase";

/** Tri koraka nakon registracije (specifikacija 4.1 I1): objekt, lokacija, prva ponuda. */
export default function Carobnjak() {
  const { refresh, setActive } = useBusiness();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("beach");
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState<PickedLocation | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            Ovdje će te turisti vidjeti. Ako si sada na plaži, dodirni "Koristi moju trenutnu
            lokaciju". Kasnije je možeš promijeniti u postavkama.
          </Body>
          <LocationPicker initial={coords} onChange={setCoords} />
          <ErrorText>{error}</ErrorText>
          <Row gap={space.s}>
            <Button title="Natrag" kind="glass" onPress={() => setStep(1)} />
            <Button
              title="Dalje"
              disabled={!coords || coords.zoom < PRECISE_ZOOM}
              loading={busy}
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
