import { act, renderHook } from "@testing-library/react";
import type { Locale } from "../i18n/translate";
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
  expect(result.current.state).toEqual({ status: "empty", text: "zzqq" });
});

it("treats an answer for older text as still loading, keeping its places on screen", async () => {
  fetchMock.mockResolvedValueOnce(answer("Kamppi, Helsinki")).mockResolvedValueOnce(answer());
  const { result, rerender } = renderHook(({ q }) => usePlaceSuggestions(q, "fi"), {
    initialProps: { q: "kamp" },
  });
  await settle();

  rerender({ q: "kampx" });
  expect(result.current.state).toEqual({
    status: "loading",
    places: [{ label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 }],
  });
  await settle();
  expect(result.current.state).toEqual({ status: "empty", text: "kampx" });

  // Back to text with matches: the old "no matches" isn't reported for it.
  rerender({ q: "kamp" });
  expect(result.current.state).toEqual({ status: "loading", places: [] });
});

it("reports an error and can retry", async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ error: "upstream_error" }, { status: 502 }))
    .mockResolvedValueOnce(answer("Kamppi, Helsinki"));
  const { result } = renderHook(() => usePlaceSuggestions("kamp", "fi"));
  await settle();
  expect(result.current.state).toEqual({ status: "error", text: "kamp" });

  act(() => result.current.retry());
  await settle();
  expect(result.current.state.status).toBe("results");
});

describe("chooseTop (Enter)", () => {
  const kamppi = { label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 };
  const setup = (q: string) => {
    const onChoose = vi.fn();
    const hook = renderHook(({ q }) => usePlaceSuggestions(q, "fi", onChoose), {
      initialProps: { q },
    });
    return { onChoose, ...hook };
  };

  it("chooses the top suggestion right away when it's there", async () => {
    fetchMock.mockResolvedValue(answer("Kamppi, Helsinki", "Kampinkuja, Helsinki"));
    const { onChoose, result } = setup("kamp");
    await settle();
    act(() => result.current.chooseTop());
    expect(onChoose).toHaveBeenCalledWith(kamppi);
  });

  it("waits for the answer when it hasn't arrived yet", async () => {
    fetchMock.mockResolvedValue(answer("Kamppi, Helsinki"));
    const { onChoose, result } = setup("kamp");
    act(() => result.current.chooseTop());
    expect(onChoose).not.toHaveBeenCalled();
    await settle();
    expect(onChoose).toHaveBeenCalledWith(kamppi);
  });

  it("stops waiting when the text changes", async () => {
    fetchMock.mockResolvedValue(answer("Kamppi, Helsinki"));
    const { onChoose, result, rerender } = setup("kamp");
    act(() => result.current.chooseTop());
    rerender({ q: "kampi" });
    await settle();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("stops waiting when cancelled", async () => {
    fetchMock.mockResolvedValue(answer("Kamppi, Helsinki"));
    const { onChoose, result } = setup("kamp");
    act(() => result.current.chooseTop());
    act(() => result.current.cancelPending());
    await settle();
    expect(onChoose).not.toHaveBeenCalled();
  });
});

it("asks again in the new language when the language changes", async () => {
  fetchMock.mockResolvedValue(answer("Kamppi, Helsinki"));
  const { rerender } = renderHook(({ lang }) => usePlaceSuggestions("kamp", lang), {
    initialProps: { lang: "fi" as Locale },
  });
  await settle();
  rerender({ lang: "en" });
  await settle();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const lang = (call: number) =>
    new URL(String(fetchMock.mock.calls[call]![0]), "https://example.test").searchParams.get(
      "lang",
    );
  expect([lang(0), lang(1)]).toEqual(["fi", "en"]);
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
