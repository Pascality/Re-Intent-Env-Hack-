import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "../src/app.js";
import { loadData, validateData } from "../src/data-store.js";
import { createRecommendationService, RequestValidationError } from "../src/recommendations.js";

const data = await loadData();
const recommendations = createRecommendationService(data);

test("catalogue search finds labels by synonym", () => {
  const result = recommendations.getCatalog({ query: "TV", group: "item" });
  assert.deepEqual(result.items.map((item) => item.id), ["television"]);
});

test("an electronics item uses e-waste guidance even when plastic is selected", () => {
  const result = recommendations.recommend({
    itemId: "television",
    materialIds: ["plastic"],
    condition: "working",
    environment: "home",
  });

  assert.equal(result.routes.donation.status, "consider");
  assert.equal(result.item.conditionSource, "user_reported");
  assert.deepEqual(result.item.materialIds, ["plastic"]);
  assert.deepEqual(
    result.routes.recycle.items.map((entry) => entry.title),
    ["Use electronics disposal guidance"],
  );
  assert.match(result.routes.recycle.nextStep, /e-waste collection/);
});

test("a plastic bottle is not recommended for donation, even if marked usable", () => {
  const result = recommendations.recommend({
    itemId: "plastic-bottle",
    condition: "usable",
    searchForDonation: true,
    area: "Example City",
  });

  assert.equal(result.routes.donation.status, "probably_not_suitable");
  assert.equal(result.routes.donation.acceptanceVerified, false);
  assert.equal(new URL(result.routes.donation.search.url).hostname, "www.google.com");
});

test("a property-only selection keeps a useful label and safety guidance", () => {
  const result = recommendations.recommend({ propertyIds: ["hazardous"] });
  assert.equal(result.item.label, "Potentially hazardous");
  assert.equal(result.routes.recycle.items[0].title, "Check special handling guidance");
});

test("itemId must refer to a catalogue item", () => {
  assert.throws(
    () => recommendations.recommend({ itemId: "plastic" }),
    RequestValidationError,
  );
});

test("India guidance is national and keeps city-specific collection unverified", () => {
  assert.deepEqual(recommendations.getAreas().areas.map((area) => area.id), ["in"]);
  const result = recommendations.recommend({
    itemId: "television",
    condition: "working",
    areaId: "in",
    area: "Pune",
    searchForDonation: true,
  });

  assert.equal(result.routes.recycle.scope, "national");
  assert.equal(result.routes.recycle.localStatus, "national_guidance");
  assert.equal(result.routes.recycle.municipalDetailsVerified, false);
  assert.ok(result.routes.recycle.items[0].sources[0].url.startsWith("https://"));
  assert.match(
    new URL(result.routes.donation.search.url).searchParams.get("query"),
    /Pune/,
  );
});

test("item-specific disposal advice takes priority over broad India plastic guidance", () => {
  const plastic = recommendations.recommend({ materialIds: ["plastic"], areaId: "in" });
  assert.equal(plastic.routes.recycle.scope, "national");

  const bottle = recommendations.recommend({ itemId: "plastic-bottle", areaId: "in" });
  assert.equal(bottle.routes.recycle.scope, "general");
  assert.equal(bottle.routes.recycle.localStatus, "unavailable");

  const oilContainer = recommendations.recommend({ itemId: "oil-container", areaId: "in" });
  assert.equal(oilContainer.routes.recycle.scope, "general");
  assert.equal(oilContainer.routes.recycle.localStatus, "unavailable");
});

test("unsupported area IDs and unsourced area guidance are rejected", () => {
  assert.throws(
    () => recommendations.recommend({ itemId: "television", areaId: "unknown" }),
    RequestValidationError,
  );

  const invalidData = structuredClone(data);
  invalidData.guidance.areas.in.items.television.sources = [];
  assert.throws(() => validateData(invalidData), /needs text and sources/);
});

test("HTTP routes return catalogue data and structured validation errors", async (context) => {
  const server = createApp(data).listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await health.json(), { status: "ok" });

  const catalog = await fetch(`${baseUrl}/api/v1/catalog?q=clothes&group=item`);
  assert.equal(catalog.status, 200);
  assert.deepEqual((await catalog.json()).items.map((item) => item.id), ["clothing", "hangers"]);

  const cups = await fetch(`${baseUrl}/api/v1/catalog?q=paper%20cups&group=item`);
  assert.equal(cups.status, 200);
  assert.deepEqual((await cups.json()).items.map((item) => item.id), ["cups"]);

  const invalid = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId: "plastic" }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "INVALID_REQUEST");

  const valid = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId: "television", condition: "working", areaId: "in" }),
  });
  assert.equal(valid.status, 200);
  const validResult = await valid.json();
  assert.equal(validResult.routes.donation.status, "consider");
  assert.equal(validResult.routes.recycle.scope, "national");
});
