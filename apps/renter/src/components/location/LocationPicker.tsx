import * as Location from "expo-location";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Body, Button, ErrorText, space } from "../ui";
import { MapFrame, type MapFrameHandle } from "./MapFrame";
import { type LocationPickerProps, mapHtml } from "./mapHtml";

/** Od ove razine pribadača pada na pravu plažu, a ne samo u pravo mjesto. */
export const PRECISE_ZOOM = 15;

/**
 * Odabir lokacije objekta: pribadača u sredini karte, korisnik pomiče kartu ili
 * dodirne "Koristi moju lokaciju" dok stoji na plaži.
 */
export function LocationPicker({ initial, onChange, height = 320 }: LocationPickerProps) {
  // HTML se slaže samo jednom, inače bi se karta ponovno učitala pri svakoj promjeni.
  // biome-ignore lint/correctness/useExhaustiveDependencies: početna lokacija vrijedi samo pri otvaranju
  const html = useMemo(() => mapHtml(initial), []);
  const frame = useRef<MapFrameHandle>(null);
  const [zoom, setZoom] = useState(initial ? 16 : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function locateMe() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setError(
          "Bez dozvole za lokaciju pomakni kartu sam, tako da pribadača stoji na tvom objektu.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      frame.current?.setCenter(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setError("Lokacija trenutno nije dostupna. Pomakni kartu sam.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.s }}>
      <MapFrame
        ref={frame}
        html={html}
        height={height}
        onMessage={(m) => {
          if (m.type === "move") {
            const p = { lat: Number(m.lat), lng: Number(m.lng), zoom: Number(m.zoom) };
            setZoom(p.zoom);
            onChange(p);
          } else if (m.type === "error") {
            setError("Karta se nije učitala. Provjeri vezu ili koristi svoju lokaciju.");
          }
        }}
      />
      <Body muted>
        {zoom < PRECISE_ZOOM
          ? "Približi kartu i pomakni je tako da pribadača stoji točno na tvom objektu."
          : "Pribadača pokazuje gdje će te turisti vidjeti na karti."}
      </Body>
      <Button
        title="Koristi moju trenutnu lokaciju"
        kind="glass"
        onPress={() => void locateMe()}
        loading={busy}
        block
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
