import AsyncStorage from "@react-native-async-storage/async-storage";

/** Mali omotač oko AsyncStoragea za JSON. Greške pri čitanju znače "nema spremljenog". */
export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Pun disk ili privatni način preglednika: aplikacija radi i bez lokalne kopije.
  }
}
