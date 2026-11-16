// Network and browser-API fakes shared by tests.
import type { Pharmacy } from "../lib/pharmacy";

/** A pharmacy for tests; only the fields a test cares about need to be given. */
export function pharmacy(
  fields: Partial<Pharmacy> & Pick<Pharmacy, "id" | "lat" | "lon">,
): Pharmacy {
  return {
    name: `Apteekki ${fields.id}`,
    address: "Mannerheimintie 1",
    postcode: "00100",
    city: "Helsinki",
    branch: false,
    ...fields,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
    /** Drops the oldest pending request unanswered, as a browser can when its prompt is dismissed. */
    ignore() {
      take();
    },
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
