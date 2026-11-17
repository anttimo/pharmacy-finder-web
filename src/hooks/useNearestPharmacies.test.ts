import { act, renderHook, waitFor } from "@testing-library/react";
import { loadPharmacies } from "../data/pharmacies";
import type { Pharmacy } from "../lib/pharmacy";
import { mockGeolocation, pharmacy } from "../test/mocks";
import { NEAREST_COUNT, useNearestPharmacies } from "./useNearestPharmacies";

// The list import is the network boundary now: in the browser it fetches a JS chunk.
vi.mock("../data/pharmacies", () => ({ loadPharmacies: vi.fn() }));
const load = vi.mocked(loadPharmacies);

afterEach(() => {
  load.mockReset();
});

it("goes from locating to loading to results", async () => {
  const geo = mockGeolocation();
  let respond!: (list: Pharmacy[]) => void;
  load.mockReturnValueOnce(new Promise((resolve) => (respond = resolve)));
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  expect(result.current.state.status).toBe("locating");

  act(() => geo.succeed());
  expect(result.current.state.status).toBe("loading");

  await act(async () => respond([pharmacy({ id: "a", lat: 60.172, lon: 24.942 })]));
  await waitFor(() => expect(result.current.state.status).toBe("results"));
});

it(`shows the ${NEAREST_COUNT} nearest, however far away`, async () => {
  const geo = mockGeolocation();
  load.mockResolvedValueOnce([
    pharmacy({ id: "rovaniemi", lat: 66.5, lon: 25.7 }),
    pharmacy({ id: "tampere", lat: 61.5, lon: 23.8 }),
    pharmacy({ id: "espoo", lat: 60.2, lon: 24.7 }),
    pharmacy({ id: "turku", lat: 60.45, lon: 22.27 }),
  ]);
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  await act(async () => geo.succeed(52.52, 13.4)); // Berlin still gets the nearest in Finland
  await waitFor(() => expect(result.current.state.status).toBe("results"));
  const state = result.current.state;
  expect(state.status === "results" && state.pharmacies.map((p) => p.id)).toEqual([
    "turku",
    "espoo",
    "tampere",
  ]);
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
  let respondFirst!: (list: Pharmacy[]) => void;
  load
    .mockReturnValueOnce(new Promise((resolve) => (respondFirst = resolve)))
    .mockResolvedValueOnce([pharmacy({ id: "second", lat: 60.172, lon: 24.942 })]);
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  act(() => geo.succeed());
  act(() => result.current.locate());
  await act(async () => geo.succeed());
  await waitFor(() => expect(result.current.state.status).toBe("results"));

  // The first load answers late; it must not replace the newer result.
  await act(async () => respondFirst([pharmacy({ id: "first", lat: 60.172, lon: 24.942 })]));
  const state = result.current.state;
  expect(state.status === "results" && state.pharmacies.map((p) => p.id)).toEqual(["second"]);
});

it("can retry after the list fails to load", async () => {
  const geo = mockGeolocation();
  load
    .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
    .mockResolvedValueOnce([pharmacy({ id: "a", lat: 60.172, lon: 24.942 })]);
  const { result } = renderHook(() => useNearestPharmacies());

  act(() => result.current.locate());
  await act(async () => geo.succeed());
  await waitFor(() => expect(result.current.state).toEqual({ status: "error", kind: "network" }));

  act(() => result.current.locate());
  await act(async () => geo.succeed());
  await waitFor(() => expect(result.current.state.status).toBe("results"));
});
