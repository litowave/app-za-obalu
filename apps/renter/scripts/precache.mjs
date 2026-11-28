// Nakon `expo export`: u dist/sw.js upiše popis JavaScript datoteka za spremanje na uređaj
// i novu oznaku predmemorije. Tako se nakon prvog otvaranja svaka kartica otvara i bez
// signala, a nova verzija aplikacije zamijeni staru.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const files = walk(join(dist, "_expo/static"))
  .map((f) => `/${relative(dist, f)}`)
  .sort();
const version = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 12);

const swPath = join(dist, "sw.js");
const sw = readFileSync(swPath, "utf8");
const out = sw
  .replace(/const CACHE = "[^"]*";/, `const CACHE = "lito-${version}";`)
  .replace(/const BUILD = \[\];/, `const BUILD = ${JSON.stringify(files)};`);
if (out === sw) throw new Error("sw.js: oznake CACHE i BUILD nisu pronađene");
writeFileSync(swPath, out);
console.log(`sw.js: lito-${version}, ${files.length} datoteka za rad bez signala`);
