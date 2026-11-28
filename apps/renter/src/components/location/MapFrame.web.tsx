import { useEffect, useImperativeHandle, useRef } from "react";
import type { MapFrameProps } from "./MapFrame";

/** Web: ista karta u iframeu, poruke idu preko postMessage. */
export function MapFrame({ html, height, onMessage, ref }: MapFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useImperativeHandle(ref, () => ({
    setCenter: (lat, lng) => {
      frame.current?.contentWindow?.postMessage({ lito: { type: "center", lat, lng } }, "*");
    },
  }));

  useEffect(() => {
    function listen(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      const d = (e.data as { lito?: { type: string } } | null)?.lito;
      if (d) handler.current(d);
    }
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, []);

  return (
    <iframe
      ref={frame}
      title="Karta"
      srcDoc={html}
      style={{ width: "100%", height, border: 0, borderRadius: 18, display: "block" }}
    />
  );
}
