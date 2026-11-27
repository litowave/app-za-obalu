import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Bez jezika u adresi (npr. QR kod vodi na "/") gost dobiva jezik svog preglednika.
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
