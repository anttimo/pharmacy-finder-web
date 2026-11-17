import { act, renderHook } from "@testing-library/react";
import { DEBOUNCE_MS, usePlaceSuggestions } from "./usePlaceSuggestions";

const fetchMock = vi.fn<typeof fetch>();
const answer = (...labels: string[]) =>
  Response.json({ results: labels.map((label) => ({ label, lat: 60.17, lon: 24.93 })) });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const settle = () => act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
const sentText = (call: number) =>
  new URL(String(fetchMock.mock.calls[call]![0]), "https://example.test").searchParams.get("text");

it("asks once typing pauses, not on every keystroke", async () => {
  fetchMock.mockResolvedValue(answer("Kamppi, Helsinki"));
  const { result, rerender } = renderHook(({ q }) => usePlaceSuggestions(q, "fi"), {
    initialProps: { q: "ka" },
  });
  rerender({ q: "kam" });
  rerender({ q: "kamp" });
  expect(fetchMock).not.toHaveBeenCalled();

  await settle();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(sentText(0)).toBe("kamp");
  expect(result.current.state).toEqual({
    status: "results",
    places: [{ label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 }],
    text: "kamp",
  });
});

it("stays idle for text shorter than two letters", async () => {
  const { result } = renderHook(() => usePlaceSuggestions(" k ", "fi"));
  await settle();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.current.state).toEqual({ status: "idle" });
});

it("aborts the older request when the text changes, keeping only the latest answer", async () => {
  let firstSignal: AbortSignal | null | undefined;
  fetchMock
    .mockImplementationOnce((_, init) => {
      firstSignal = init?.signal;
      return new Promise(() => {});
    })
    .mockResolvedValueOnce(answer("Kamppi, Helsinki"));
  const { result, rerender } = renderHook(({ q }) => usePlaceSuggestions(q, "fi"), {
    initialProps: { q: "ka" },
  });
  await settle();
  expect(result.current.state.status).toBe("loading");

  rerender({ q: "kamp" });
  expect(firstSignal?.aborted).toBe(true);
  await settle();
  expect(result.current.state.status).toBe("results");
});

it("reports no matches", async () => {
  fetchMock.mockResolvedValueOnce(answer());
  const { result } = renderHook(() => usePlaceSuggestions("zzqq", "fi"));
  await settle();
  expect(result.current.state).toEqual({ status: "empty" });
});

it("reports an error and can retry", async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ error: "upstream_error" }, { status: 502 }))
    .mockResolvedValueOnce(answer("Kamppi, Helsinki"));
  const { result } = renderHook(() => usePlaceSuggestions("kamp", "fi"));
  await settle();
  expect(result.current.state).toEqual({ status: "error" });

  act(() => result.current.retry());
  await settle();
  expect(result.current.state.status).toBe("results");
});

it("goes back to idle when the text is cleared", async () => {
  fetchMock.mockResolvedValueOnce(answer("Kamppi, Helsinki"));
  const { result, rerender } = renderHook(({ q }) => usePlaceSuggestions(q, "fi"), {
    initialProps: { q: "kamp" },
  });
  await settle();
  rerender({ q: "" });
  expect(result.current.state).toEqual({ status: "idle" });
});
