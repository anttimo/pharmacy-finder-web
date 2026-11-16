import { loadPharmacies } from "./pharmacies";

// Checks the committed file itself, so a bad rebuild fails here before it reaches users.
describe("pharmacies.json", () => {
  it("has pharmacies with unique ids, names, addresses and coordinates in Finland", async () => {
    const pharmacies = await loadPharmacies();
    expect(pharmacies.length).toBeGreaterThan(500);
    expect(new Set(pharmacies.map((p) => p.id)).size).toBe(pharmacies.length);
    for (const p of pharmacies) {
      expect(p.name, p.id).not.toBe("");
      expect(p.address, p.id).not.toBe("");
      expect(p.lat, p.id).toBeGreaterThan(59.4);
      expect(p.lat, p.id).toBeLessThan(70.2);
      expect(p.lon, p.id).toBeGreaterThan(19);
      expect(p.lon, p.id).toBeLessThan(31.7);
    }
  });
});
