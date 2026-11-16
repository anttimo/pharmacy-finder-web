/**
 * Build src/data/pharmacies.json from the Fimea pharmacy register on the Kanta code server,
 * geocoding each address with Digitransit. See ADR 0001.
 *
 *   npm run build:pharmacies -- --inspect   # print the first page's metadata and first raw item
 *   npm run build:pharmacies                # full build
 *
 * Node 24+ runs this .ts file directly. Needs DIGITRANSIT_API_KEY in the environment or in
 * .dev.vars (never in .env). No runtime dependencies (ADR 0002).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type AddressOverride,
  applyOverride,
  type GeocodeFeature,
  geocodeQueries,
  isOpenToPublic,
  judgeMatch,
  type KantaItem,
  type KantaPage,
  type Pharmacy,
  type PharmacyRecord,
  toRecord,
} from "./kanta.ts";

const SOURCE =
  "https://koodistopalvelu.kanta.fi/codeserver/csapi/v8/classifications/1.2.246.537.6.200/conceptcodes";
const GEOCODE = "https://api.digitransit.fi/geocoding/v1/search";
const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "src/data/pharmacies.json");
const REVIEW_OUT = join(ROOT, "scripts/needs-review.json");
const OVERRIDES = join(ROOT, "scripts/address-overrides.json");
const PAGE_SIZE = 500;
const DELAY_MS = 150; // about 6 requests/s, polite to the geocoder

type Unresolved = { id: string; query: string; reason: string };

function apiKey(): string {
  if (process.env.DIGITRANSIT_API_KEY) return process.env.DIGITRANSIT_API_KEY;
  const devVars = join(ROOT, ".dev.vars");
  if (existsSync(devVars)) {
    const m = readFileSync(devVars, "utf8").match(/^DIGITRANSIT_API_KEY=(.*)$/m);
    const key = m?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (key) return key;
  }
  throw new Error("Set DIGITRANSIT_API_KEY (environment or .dev.vars)");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(
  url: string,
  headers: Record<string, string> = {},
  tries = 4,
): Promise<T> {
  for (let i = 1; ; i++) {
    const res = await fetch(url, {
      headers: { accept: "application/json", ...headers },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) return (await res.json()) as T;
    // Strip the query so a logged URL never carries search text alongside a key.
    if (i >= tries || (res.status < 500 && res.status !== 429)) {
      throw new Error(`${res.status} ${url.split("?")[0]}`);
    }
    await sleep(500 * 2 ** i);
  }
}

/**
 * Fetch every page. Fail loudly if the number of unique ids doesn't match totalItems: the API
 * doesn't keep a stable order within a page, so count unique ids rather than rows.
 */
async function fetchAll(inspect: boolean): Promise<KantaItem[]> {
  const byId = new Map<string, KantaItem>();
  let total: number | undefined;
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const data = await getJson<KantaPage>(`${SOURCE}?pageSize=${PAGE_SIZE}&page=${page}`);
    if (!Array.isArray(data.conceptCodes)) {
      throw new Error(`No conceptCodes array. Keys: ${Object.keys(data).join(", ")}`);
    }
    if (inspect) {
      const { totalItems, pageSize, totalPages: pages } = data;
      const meta = { totalItems, pageSize, page: data.page, totalPages: pages };
      console.log(JSON.stringify({ ...meta, firstItem: data.conceptCodes[0] }, null, 2));
      return [];
    }
    if (total !== undefined && data.totalItems !== total) {
      throw new Error(`totalItems changed while paging (${total} → ${data.totalItems}). Rerun.`);
    }
    total = data.totalItems;
    totalPages = data.totalPages;
    for (const item of data.conceptCodes) byId.set(item.conceptCodeId, item);
    console.log(`page ${page}/${totalPages}: ${byId.size}/${total}`);
  }
  if (byId.size !== total) {
    throw new Error(`Expected ${total} unique items, got ${byId.size}. Not writing output.`);
  }
  return [...byId.values()];
}

async function geocode(
  rec: PharmacyRecord,
  key: string,
): Promise<{ lat: number; lon: number } | string> {
  const queries = geocodeQueries(rec);
  if (queries.length === 0) return "no address";
  const reasons: string[] = [];
  for (const text of queries) {
    const params = new URLSearchParams({ text, size: "1", "boundary.country": "FIN", lang: "fi" });
    const data = await getJson<{ features?: GeocodeFeature[] }>(`${GEOCODE}?${params}`, {
      "digitransit-subscription-key": key,
    });
    const result = judgeMatch(data.features?.[0]);
    if (typeof result !== "string") return result;
    reasons.push(`"${text}": ${result}`);
    await sleep(DELAY_MS);
  }
  return reasons.join("; ");
}

async function main() {
  const inspect = process.argv.includes("--inspect");
  if (inspect) {
    await fetchAll(true);
    return;
  }
  const key = apiKey();
  const raw = await fetchAll(false);
  const today = new Date().toISOString().slice(0, 10);
  const open = raw.filter((item) => isOpenToPublic(item, today));
  console.log(`${open.length} of ${raw.length} register entries are open pharmacies or branches.`);

  const overrides = JSON.parse(readFileSync(OVERRIDES, "utf8")) as Record<string, AddressOverride>;
  const pharmacies: Pharmacy[] = [];
  const review: Unresolved[] = [];
  for (const [i, item] of open.entries()) {
    const { rec, stale } = applyOverride(toRecord(item), overrides[item.conceptCodeId]);
    if (stale) {
      console.warn(`Override for ${rec.id} (${rec.name}) ignored: the register address changed.`);
    }
    const result = await geocode(rec, key);
    if (typeof result === "string") {
      const query = `${rec.name}: ${rec.address}, ${rec.postcode} ${rec.city}`;
      review.push({ id: rec.id, query, reason: result });
    } else {
      pharmacies.push({ ...rec, ...result });
    }
    if ((i + 1) % 100 === 0) console.log(`geocoded ${i + 1}/${open.length}`);
    await sleep(DELAY_MS);
  }

  pharmacies.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  mkdirSync(dirname(OUT), { recursive: true });
  const meta = {
    source: SOURCE,
    generatedAt: new Date().toISOString(),
    sourceTotal: raw.length,
    openTotal: open.length,
    needsReview: review.length,
  };
  writeFileSync(OUT, JSON.stringify({ ...meta, pharmacies }, null, 2) + "\n");
  writeFileSync(REVIEW_OUT, JSON.stringify(review, null, 2) + "\n");
  console.log(
    `Wrote ${pharmacies.length} pharmacies. ${review.length} need review (${REVIEW_OUT}).`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
