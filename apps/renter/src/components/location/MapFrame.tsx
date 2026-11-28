import { type ComponentType, type Ref, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";

// Tipovi paketa daju WebViewProps & undefined, što TypeScript 6 svodi na never.
const Web = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

export interface MapFrameHandle {
  setCenter: (lat: number, lng: number) => void;
}

export interface MapFrameProps {
  html: string;
  height: number;
  onMessage: (msg: { type: string; [k: string]: unknown }) => void;
  ref?: Ref<MapFrameHandle>;
}

/** Mobitel: karta u WebViewu (radi i u Expo Go, bez ključa za Google ili Apple karte). */
export function MapFrame({ html, height, onMessage, ref }: MapFrameProps) {
  const web = useRef<WebView>(null);
  useImperativeHandle(ref, () => ({
    setCenter: (lat, lng) => {
      web.current?.injectJavaScript(`window.lito && window.lito.setCenter(${lat}, ${lng}); true;`);
    },
  }));
  return (
    <View style={{ height, borderRadius: 18, overflow: "hidden" }}>
      <Web
        ref={web}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(e: WebViewMessageEvent) => {
          try {
            onMessage(JSON.parse(e.nativeEvent.data));
          } catch {
            // poruka koja nije naša
          }
        }}
        // Karta se pomiče prstom; bez ovoga bi se pomicao ekran oko nje.
        nestedScrollEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
