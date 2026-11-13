import { jsonResponse, mockFetch, overpassResponse, sentQuery } from "../test/mocks";
import { OVERPASS_ENDPOINTS, fetchPharmacies, findNearestPharmacies } from "./overpass";

const origin = { lat: 60.171949, lon: 24.941449 };
const nearby = { id: 1, lat: 60.172, lon: 24.942, tags: { name: "Apteekki" } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPharmacies", () => {
  it("sends the centre rounded to 3 decimals, never the exact position", async () => {
    const fetch = mockFetch(overpassResponse([nearby]));
    await fetchPharmacies(origin, 2000, new AbortController().signal);

    const query = sentQuery(fetch.mock.calls[0][1]);
    expect(query).toContain("around:2000,60.172,24.941");
    expect(query).not.toContain("60.171949");
  });

  it("tries the fallback endpoint after a server error", async () => {
    const fetch = mockFetch(jsonResponse({}, 504), overpassResponse([nearby]));
    const result = await fetchPharmacies(origin, 2000, new AbortController().signal);

    expect(result).toHaveLength(1);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([...OVERPASS_ENDPOINTS]);
  });

  it("tries the fallback endpoint after a network error", async () => {
    mockFetch(new TypeError("Failed to fetch"), overpassResponse([nearby]));
    await expect(fetchPharmacies(origin, 2000, new AbortController().signal)).resolves.toHaveLength(
      1,
    );
  });

  it("treats a server-side query timeout as an error", async () => {
    mockFetch(
      jsonResponse({ elements: [], remark: "runtime error: Query timed out" }),
      overpassResponse([nearby]),
    );
    await expect(fetchPharmacies(origin, 2000, new AbortController().signal)).resolves.toHaveLength(
      1,
    );
  });

  it("fails when both endpoints fail", async () => {
    mockFetch(jsonResponse({}, 429), jsonResponse({}, 503));
    await expect(fetchPharmacies(origin, 2000, new AbortController().signal)).rejects.toThrow(
      "503",
    );
  });

  it("does not try the fallback for a bad request", async () => {
    const fetch = mockFetch(jsonResponse({}, 400));
    await expect(fetchPharmacies(origin, 2000, new AbortController().signal)).rejects.toThrow(
      "400",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not try the fallback after the caller aborts", async () => {
    const controller = new AbortController();
    const fetch = mockFetch(() => {
      controller.abort();
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    });
    await expect(fetchPharmacies(origin, 2000, controller.signal)).rejects.toThrow("Aborted");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("findNearestPharmacies", () => {
  it("widens the radius until something is found", async () => {
    const fetch = mockFetch(overpassResponse([]), overpassResponse([nearby]));
    const result = await findNearestPharmacies(origin, new AbortController().signal);

    expect(result.radiusMeters).toBe(10_000);
    expect(result.pharmacies.map((p) => p.name)).toEqual(["Apteekki"]);
    expect(sentQuery(fetch.mock.calls[1][1])).toContain("around:10000,");
  });

  it("returns an empty list after the widest radius", async () => {
    mockFetch(overpassResponse([]), overpassResponse([]), overpassResponse([]));
    const result = await findNearestPharmacies(origin, new AbortController().signal);
    expect(result).toEqual({ pharmacies: [], radiusMeters: 50_000 });
  });

  it("sorts by distance from the exact origin", async () => {
    mockFetch(
      overpassResponse([
        { id: 1, lat: 60.18, lon: 24.94 },
        { id: 2, lat: 60.172, lon: 24.9415 },
      ]),
    );
    const result = await findNearestPharmacies(origin, new AbortController().signal);
    expect(result.pharmacies.map((p) => p.id)).toEqual(["node/2", "node/1"]);
  });
});
