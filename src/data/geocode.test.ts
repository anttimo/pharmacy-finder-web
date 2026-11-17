import { geocode } from "./geocode";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const sentUrl = () => new URL(String(fetchMock.mock.calls[0]![0]), "https://example.test");

it("asks our own proxy with the text and language, and nothing else", async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ results: [{ label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 }] }),
  );
  const places = await geocode("kamp", "en");

  expect(places).toEqual([{ label: "Kamppi, Helsinki", lat: 60.17, lon: 24.93 }]);
  expect(sentUrl().pathname).toBe("/api/geocode");
  expect(Object.fromEntries(sentUrl().searchParams)).toEqual({ text: "kamp", lang: "en" });
});

it("cuts the text to what the proxy accepts", async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ results: [] }));
  await geocode("a".repeat(150), "fi");
  expect(sentUrl().searchParams.get("text")).toHaveLength(100);
});

it("keeps the encoded query within what the proxy accepts", async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ results: [] }));
  // "ä" is six characters encoded (%C3%A4): 100 of them would make the proxy answer 414.
  const text = "Ääniväylä ".repeat(10);
  await geocode(text, "fi");
  const query = String(fetchMock.mock.calls[0]![0]).split("?")[1]!;
  expect(query.length).toBeLessThanOrEqual(256);
  const sent = sentUrl().searchParams.get("text")!;
  expect(sent.length).toBeGreaterThan(50);
  expect(text.startsWith(sent)).toBe(true);
});

it.each([
  ["an error status", () => Promise.resolve(Response.json({ error: "x" }, { status: 502 }))],
  ["an unexpected body", () => Promise.resolve(Response.json({ features: [] }))],
  ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
])("rejects on %s", async (_, answer) => {
  fetchMock.mockImplementationOnce(answer);
  await expect(geocode("kamp", "fi")).rejects.toThrow();
});
