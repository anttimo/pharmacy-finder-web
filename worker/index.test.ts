// @vitest-environment node
import { expect, it } from "vitest";
import worker from "./index";

const call = (path: string) => worker.fetch(new Request(`https://example.test${path}`));

it("answers unknown API paths with a JSON 404", async () => {
  const response = await call("/api/nope");
  expect(response.status).toBe(404);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual({ error: "not_found" });
});
