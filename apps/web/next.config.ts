import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  transpilePackages: ["@obala/core", "@obala/db", "@obala/theme"],
  // Next u razvoju inače sam piše apps/web/AGENTS.md.
  agentRules: false,
};

export default withNextIntl(config);
