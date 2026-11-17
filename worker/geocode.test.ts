// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { handleGeocode, parseGeocodeRequest, toPlaces, upstreamUrl } from "./geocode";

const parse = (query: string, method = "GET") =>
  parseGeocodeRequest(method, new URL(`https://example.test/api/geocode${query}`));

describe("parseGeocodeRequest", () => {
  it("accepts text, lang and focus, rounding focus to about 1 km", () => {
    expect(parse("?text=kamp&lang=sv&focus=60.17123,24.93876")).toEqual({
      ok: true,
      query: { text: "kamp", lang: "sv", focus: { lat: 60.17, lon: 24.94 } },
    });
  });

  it("defaults lang to fi and trims text", () => {
    expect(parse("?text=%20kamppi%20")).toEqual({
      ok: true,
      query: { text: "kamppi", lang: "fi" },
    });
  });

  it.each([
    ["?text=a", "POST", 405, "method_not_allowed"],
    ["", "GET", 400, "missing_text"],
    ["?text=%20", "GET", 400, "missing_text"],
    ["?text=a&size=50", "GET", 400, "unknown_param"],
    ["?text=a&text=b", "GET", 400, "repeated_param"],
    [`?text=${"a".repeat(101)}`, "GET", 400, "text_too_long"],
    ["?text=a&lang=de", "GET", 400, "bad_lang"],
    ["?text=a&focus=north", "GET", 400, "bad_focus"],
    ["?text=a&focus=95,24", "GET", 400, "bad_focus"],
    [`?text=${"a".repeat(100)}&focus=${"1".repeat(200)}`, "GET", 414, "query_too_long"],
  ])("rejects %s (%s) with %i", (query, method, status, error) => {
    expect(parse(query, method)).toEqual({ ok: false, status, error });
  });
});

describe("upstreamUrl", () => {
  it("fixes layers, sources, size and the Finland boundary", () => {
    const url = new URL(
      upstreamUrl({ text: "kamp", lang: "fi", focus: { lat: 60.17, lon: 24.94 } }),
    );
    expect(url.origin + url.pathname).toBe("https://api.digitransit.fi/geocoding/v1/autocomplete");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      text: "kamp",
      lang: "fi",
      size: "6",
      layers: "address,street,venue,neighbourhood,locality",
      sources: "oa,osm,nlsfi",
      "boundary.country": "FIN",
      "focus.point.lat": "60.17",
      "focus.point.lon": "24.94",
    });
  });
});

describe("toPlaces", () => {
  it("keeps only label and coordinates, skipping malformed features", () => {
    expect(
      toPlaces({
        features: [
          {
            geometry: { coordinates: [24.93, 60.17] },
            properties: { label: "Kamppi, Helsinki", id: "x" },
          },
          { geometry: { coordinates: [24.9] }, properties: { label: "Broken" } },
          { geometry: {}, properties: {} },
        ],
      }),
    ).toEqual([{ label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 }]);
  });

  it("returns at most 6 places, as upstream ignores size", () => {
    const feature = { geometry: { coordinates: [24.93, 60.17] }, properties: { label: "X" } };
    expect(toPlaces({ features: Array.from({ length: 10 }, () => feature) })).toHaveLength(6);
  });

  it("throws on a body that isn't GeoJSON", () => {
    expect(() => toPlaces({ error: "x" })).toThrow();
  });
});

describe("handleGeocode", () => {
  const env = { DIGITRANSIT_API_KEY: "secret-key" };
  const request = (query: string, method = "GET") =>
    new Request(`https://example.test/api/geocode${query}`, { method });
  const upstreamOk = () =>
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        features: [
          { geometry: { coordinates: [24.93, 60.17] }, properties: { label: "Kamppi, Helsinki" } },
        ],
      }),
    );

  it("sends the key in a header, never in the URL, and reshapes the answer", async () => {
    const fetchImpl = upstreamOk();
    const response = await handleGeocode(request("?text=kamp&lang=fi"), env, fetchImpl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      results: [{ label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 }],
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).not.toContain("secret-key");
    expect(new Headers(init?.headers).get("digitransit-subscription-key")).toBe("secret-key");
    // A followed redirect would take the key header along.
    expect(init?.redirect).toBe("manual");
  });

  it("answers bad requests without calling upstream", async () => {
    const fetchImpl = upstreamOk();
    const response = await handleGeocode(request("?text=a", "POST"), env, fetchImpl);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a missing key as not_configured", async () => {
    const response = await handleGeocode(
      request("?text=a"),
      { DIGITRANSIT_API_KEY: "" },
      upstreamOk(),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "not_configured" });
  });

  it.each([
    ["an upstream error", () => Promise.resolve(new Response("quota exceeded", { status: 429 }))],
    [
      "a redirect",
      () =>
        Promise.resolve(
          new Response(null, { status: 302, headers: { location: "https://elsewhere.test/" } }),
        ),
    ],
    ["a network failure", () => Promise.reject(new TypeError("fetch failed"))],
    ["a non-JSON body", () => Promise.resolve(new Response("<html>"))],
  ])("turns %s into a generic 502", async (_, upstream) => {
    const response = await handleGeocode(request("?text=a"), env, vi.fn<typeof fetch>(upstream));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_error" });
  });

  it("gives up on upstream after 5 seconds, with a generic 502", async () => {
    // AbortSignal.timeout runs on internal timers that fake timers don't reach: time out by hand.
    const timeout = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    const fetchImpl = vi.fn<typeof fetch>(
      (_, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)),
        ),
    );

    const pending = handleGeocode(request("?text=kamp"), env, fetchImpl);
    expect(timeoutSpy).toHaveBeenCalledWith(5_000);
    timeout.abort(new DOMException("The operation timed out.", "TimeoutError"));

    const response = await pending;
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_error" });
    timeoutSpy.mockRestore();
  });
});
