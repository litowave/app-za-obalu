import { defineRouting } from "next-intl/routing";

// Jezici najčešćih gostiju na obali. Ostali (PL, SL, CZ) dolaze kad prevedemo tekstove.
export const routing = defineRouting({
  locales: ["hr", "en", "de", "it"],
  defaultLocale: "hr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
