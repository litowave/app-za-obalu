import type { Business, MemberRole } from "@obala/db";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth";
import { loadJson, saveJson } from "./storage";
import { supabase } from "./supabase";

export interface Membership {
  role: MemberRole;
  business: Business;
}

interface BusinessValue {
  memberships: Membership[];
  active: Membership | null;
  loading: boolean;
  isOwner: boolean;
  setActive: (businessId: string) => void;
  refresh: () => Promise<void>;
}

const BusinessContext = createContext<BusinessValue | null>(null);
const ACTIVE_KEY = "lito.activeBusiness";
const CACHE_KEY = "lito.memberships";

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Za kojeg je korisnika popis učitan. Dok se ne poklopi s prijavljenim, popis se još
  // učitava (inače bi se odmah nakon prijave ili bez veze otvorio čarobnjak za novi objekt).
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  // Najnoviji korisnik, da refresh pozvan odmah nakon prijave (npr. demo) ne vidi starog.
  const userRef = useRef(userId);
  userRef.current = userId;

  const refresh = useCallback(async () => {
    const userId = userRef.current;
    if (!userId) {
      setMemberships([]);
      setLoading(false);
      setLoadedFor(null);
      return;
    }
    // Zadnji poznati popis odmah, da se bez signala ne čeka mreža.
    const cached = await loadJson<Membership[]>(`${CACHE_KEY}.${userId}`);
    if (cached && userRef.current === userId) {
      setMemberships(cached);
      setLoading(false);
      setLoadedFor(userId);
    }
    const { data, error } = await supabase
      .from("business_members")
      .select("role, business:businesses(*)")
      .eq("user_id", userId);
    if (userRef.current !== userId) return;
    if (data && !error) {
      const list = data
        .filter((m) => m.business)
        .map((m) => ({ role: m.role, business: m.business as unknown as Business }))
        .sort((a, b) => a.business.name.localeCompare(b.business.name, "hr"));
      setMemberships(list);
      void saveJson(`${CACHE_KEY}.${userId}`, list);
    }
    setLoading(false);
    setLoadedFor(userId);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ponovno učitaj kad se promijeni korisnik
  useEffect(() => {
    setLoading(true);
    void loadJson<string>(ACTIVE_KEY).then(setActiveId);
    void refresh();
  }, [refresh, userId]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    void saveJson(ACTIVE_KEY, id);
  }, []);

  const value = useMemo<BusinessValue>(() => {
    const active = memberships.find((m) => m.business.id === activeId) ?? memberships[0] ?? null;
    return {
      memberships,
      active,
      loading: loading || loadedFor !== userId,
      isOwner: active?.role === "owner",
      setActive,
      refresh,
    };
  }, [memberships, activeId, loading, loadedFor, userId, setActive, refresh]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): BusinessValue {
  const v = useContext(BusinessContext);
  if (!v) throw new Error("useBusiness izvan BusinessProvidera");
  return v;
}
