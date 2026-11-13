// Network and browser-API fakes shared by tests.

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** An Overpass response with one node per pharmacy. */
export function overpassResponse(
  pharmacies: { id: number; lat: number; lon: number; tags?: Record<string, string> }[],
): Response {
  return jsonResponse({ elements: pharmacies.map((p) => ({ type: "node", ...p })) });
}

/** Stubs global fetch; each call returns the next queued response (or throws it, if an Error). */
export function mockFetch(...responses: (Response | Error | (() => Promise<Response>))[]) {
  const queue = [...responses];
  const fn = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const next = queue.shift();
    if (!next) throw new Error("Unexpected fetch call");
    if (next instanceof Error) throw next;
    if (typeof next === "function") return next();
    return next;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** The Overpass query text sent in a mocked fetch call. */
export function sentQuery(init: RequestInit | undefined): string {
  return new URLSearchParams(String(init?.body)).get("data") ?? "";
}

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

/** Replaces navigator.geolocation. Returns helpers to answer pending requests. */
export function mockGeolocation() {
  const pending: { success: Success; failure: Failure }[] = [];
  const getCurrentPosition = vi.fn((success: Success, failure: Failure) => {
    pending.push({ success, failure });
  });
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });

  const take = () => {
    const request = pending.shift();
    if (!request) throw new Error("No pending geolocation request");
    return request;
  };

  return {
    getCurrentPosition,
    succeed(lat = 60.1719, lon = 24.9414) {
      take().success({
        coords: { latitude: lat, longitude: lon, accuracy: 20 },
        timestamp: Date.now(),
      } as GeolocationPosition);
    },
    fail(code: 1 | 2 | 3) {
      take().failure({
        code,
        message: "",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    },
  };
}
