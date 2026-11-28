import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { loadJson, saveJson } from "./storage";

/** Način za jako sunce: obrubi i malo jače iste boje. Pamti se na uređaju. */
const SunContext = createContext<{ sunMode: boolean; toggle: () => void }>({
  sunMode: false,
  toggle: () => {},
});

export function SunProvider({ children }: { children: ReactNode }) {
  const [sunMode, setSunMode] = useState(false);
  useEffect(() => {
    void loadJson<boolean>("lito.sunMode").then((v) => setSunMode(Boolean(v)));
  }, []);
  const toggle = () =>
    setSunMode((v) => {
      void saveJson("lito.sunMode", !v);
      return !v;
    });
  return <SunContext.Provider value={{ sunMode, toggle }}>{children}</SunContext.Provider>;
}

export function useSun() {
  return useContext(SunContext);
}
