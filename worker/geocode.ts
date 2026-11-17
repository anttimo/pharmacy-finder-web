// GET /api/geocode: a narrow proxy to Digitransit's autocomplete (ADR 0003). The key stays here;
// the client picks only the text, the language and an optional focus point.

const UPSTREAM = "https://api.digitransit.fi/geocoding/v1/autocomplete";
const TIMEOUT_MS = 5_000;
const MAX_TEXT = 100;
const MAX_QUERY = 256;
/** Suggestions shown. Autocomplete ignores `size`, so the answer is also cut here. */
const MAX_RESULTS = 6;

/** Fixed on the server: the client can't choose the layers, sources or result count. */
const UPSTREAM_PARAMS = {
  size: String(MAX_RESULTS),
  layers: "address,street,venue,neighbourhood,locality",
  sources: "oa,osm,nlsfi",
  "boundary.country": "FIN",
};

const LANGS = ["fi", "sv", "en"] as const;
type Lang = (typeof LANGS)[number];
const ALLOWED = new Set(["text", "lang", "focus"]);

export interface GeocodeQuery {
  text: string;
  lang: Lang;
  focus?: { lat: number; lon: number };
}

export interface Place {
  label: string;
  lat: number;
  lon: number;
}

export type Parsed =
  | { ok: true; query: GeocodeQuery }
  | { ok: false; status: number; error: string };

const fail = (status: number, error: string): Parsed => ({ ok: false, status, error });

/** Two decimals of latitude is about 1 km: enough to rank nearby matches higher. */
const roundToKm = (value: number) => Math.round(value * 100) / 100;

function parseFocus(value: string): GeocodeQuery["focus"] | undefined {
  const match = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(value);
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat: roundToKm(lat), lon: roundToKm(lon) };
}

/** The guards, as a pure function: rejects rather than drops anything unexpected. */
export function parseGeocodeRequest(method: string, url: URL): Parsed {
  if (method !== "GET") return fail(405, "method_not_allowed");
  if (url.search.length - 1 > MAX_QUERY) return fail(414, "query_too_long");

  const seen = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (!ALLOWED.has(key)) return fail(400, "unknown_param");
    if (seen.has(key)) return fail(400, "repeated_param");
    seen.add(key);
  }

  const text = url.searchParams.get("text")?.trim() ?? "";
  if (!text) return fail(400, "missing_text");
  if (text.length > MAX_TEXT) return fail(400, "text_too_long");

  const lang = url.searchParams.get("lang") ?? "fi";
  if (!(LANGS as readonly string[]).includes(lang)) return fail(400, "bad_lang");

  const focusParam = url.searchParams.get("focus");
  const focus = focusParam === null ? undefined : parseFocus(focusParam);
  if (focusParam !== null && !focus) return fail(400, "bad_focus");

  return { ok: true, query: { text, lang: lang as Lang, ...(focus && { focus }) } };
}

export function upstreamUrl({ text, lang, focus }: GeocodeQuery): string {
  const params = new URLSearchParams({ text, lang, ...UPSTREAM_PARAMS });
  if (focus) {
    params.set("focus.point.lat", String(focus.lat));
    params.set("focus.point.lon", String(focus.lon));
  }
  return `${UPSTREAM}?${params}`;
}

interface Feature {
  geometry?: { coordinates?: unknown };
  properties?: { label?: unknown };
}

/** Pelias GeoJSON → just what the client needs. Malformed features are skipped. */
export function toPlaces(body: unknown): Place[] {
  const features = (body as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) throw new Error("Unexpected upstream response");
  const places: Place[] = [];
  for (const feature of features as Feature[]) {
    const label = feature.properties?.label;
    const coordinates = feature.geometry?.coordinates;
    if (typeof label !== "string" || !Array.isArray(coordinates)) continue;
    const [lon, lat] = coordinates as unknown[];
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    places.push({ label, lat, lon });
    if (places.length === MAX_RESULTS) break;
  }
  return places;
}

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

export async function handleGeocode(
  request: Request,
  env: Pick<Env, "DIGITRANSIT_API_KEY">,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const parsed = parseGeocodeRequest(request.method, new URL(request.url));
  if (!parsed.ok) {
    return json(
      { error: parsed.error },
      parsed.status,
      parsed.status === 405 ? { allow: "GET" } : {},
    );
  }
  if (!env.DIGITRANSIT_API_KEY) return json({ error: "not_configured" }, 500);

  try {
    const upstream = await fetchImpl(upstreamUrl(parsed.query), {
      headers: { "digitransit-subscription-key": env.DIGITRANSIT_API_KEY },
      // Following a redirect would send the key header to wherever it points. A 3xx isn't
      // `ok`, so it becomes the generic 502 below.
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!upstream.ok) return json({ error: "upstream_error" }, 502);
    return json({ results: toPlaces(await upstream.json()) }, 200);
  } catch {
    // Timeouts, network failures and bad JSON look the same to the client.
    return json({ error: "upstream_error" }, 502);
  }
}
