import { act, renderHook, waitFor } from "@testing-library/react";
import { jsonResponse, mockFetch, mockGeolocation, overpassResponse } from "../test/mocks";
import { useNearestPharmacies } from "./useNearestPharmacies";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("goes from locating to loading to results", async () => {
  const geo = mockGeolocation();
  let respond!: (r: Response) => void;
  mockFetch(() => new Promise((resolve) => (respond = resolve)));
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  expect(result.current.state.status).toBe("locating");

  act(() => geo.succeed());
  expect(result.current.state.status).toBe("loading");

  await act(async () => respond(overpassResponse([{ id: 1, lat: 60.172, lon: 24.942 }])));
  await waitFor(() => expect(result.current.state.status).toBe("results"));
});

it("reports denied permission", () => {
  const geo = mockGeolocation();
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  act(() => geo.fail(1));
  expect(result.current.state).toEqual({ status: "denied" });
});

it("reports other location failures as a location error", () => {
  const geo = mockGeolocation();
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  act(() => geo.fail(3));
  expect(result.current.state).toEqual({ status: "error", kind: "location" });
});

it("shows only the latest search when a new one starts while one is running", async () => {
  const geo = mockGeolocation();
  let respondFirst!: (r: Response) => void;
  mockFetch(
    () => new Promise((resolve) => (respondFirst = resolve)),
    async () => overpassResponse([{ id: 2, lat: 60.172, lon: 24.942, tags: { name: "Second" } }]),
  );
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  act(() => geo.succeed());
  act(() => result.current.locate());
  await act(async () => geo.succeed());
  await waitFor(() => expect(result.current.state.status).toBe("results"));

  // The first request answers late; it must not replace the newer result.
  await act(async () =>
    respondFirst(overpassResponse([{ id: 1, lat: 60.172, lon: 24.942, tags: { name: "First" } }])),
  );
  const state = result.current.state;
  expect(state.status === "results" && state.pharmacies.map((p) => p.name)).toEqual(["Second"]);
});

it("can retry after a network error", async () => {
  const geo = mockGeolocation();
  mockFetch(
    jsonResponse({}, 503),
    jsonResponse({}, 503),
    overpassResponse([{ id: 1, lat: 60.172, lon: 24.942 }]),
  );
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  await act(async () => geo.succeed());
  await waitFor(() => expect(result.current.state).toEqual({ status: "error", kind: "network" }));

  act(() => result.current.locate());
  await act(async () => geo.succeed());
  await waitFor(() => expect(result.current.state.status).toBe("results"));
});
