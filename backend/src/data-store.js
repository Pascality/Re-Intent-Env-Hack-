import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dataDirectory = new URL("../data/", import.meta.url);

async function readJson(filename) {
  const path = fileURLToPath(new URL(filename, dataDirectory));
  return JSON.parse(await readFile(path, "utf8"));
}

export function validateData({ catalog, guidance, areas, recycleRules }) {
  if (!Array.isArray(catalog?.labels) || !Array.isArray(areas?.areas)) {
    throw new Error("catalog.json and areas.json must contain labels and areas arrays.");
  }
  if (!guidance?.items || !guidance?.materials || !guidance?.properties ||
      !guidance?.areas || Array.isArray(guidance.areas)) {
    throw new Error("guidance.json must contain items, materials, properties, and areas objects.");
  }

  const labels = new Map();
  const groups = new Set(["item", "material", "property"]);
  const materialKinds = new Set(["raw", "waste_stream"]);
  const itemCategories = new Set([
    "packaging",
    "plastic-items",
    "electronics",
    "organic",
    "paper-cardboard",
    "glass-items",
    "metal-items",
    "clothing-textiles",
    "furniture-household",
    "toys-children",
    "vehicles-mechanical",
    "construction-repair",
    "office-school",
    "food-kitchen",
    "special-handling",
    "other",
  ]);
  const donationSuitability = new Set(["not_suitable", "consider_if_usable", "uncertain"]);
  const nonItemTerms = new Map([["material", new Map()], ["property", new Map()]]);
  for (const label of catalog.labels) {
    if (typeof label.id !== "string" || !label.id ||
        typeof label.label !== "string" || !label.label ||
        !groups.has(label.group) || labels.has(label.id)) {
      throw new Error(`Invalid or duplicate catalogue label: ${label?.id ?? "unknown"}`);
    }
    labels.set(label.id, label);
    if (label.group === "material" && !materialKinds.has(label.kind)) {
      throw new Error(`Material ${label.id} needs a raw or waste_stream kind.`);
    }
    if (label.group !== "material" && label.kind !== undefined) {
      throw new Error(`Only materials may have a kind: ${label.id}.`);
    }
    if (label.group !== "item") {
      if (label.synonyms !== undefined &&
          (!Array.isArray(label.synonyms) || label.synonyms.some((term) => typeof term !== "string"))) {
        throw new Error(`Invalid synonyms for ${label.id}.`);
      }
      for (const term of [label.label, ...(label.synonyms ?? [])]) {
        const normalized = term.toLowerCase().replace(/[\s_-]+/g, " ").trim();
        if (!normalized) throw new Error(`Empty catalogue term for ${label.id}.`);
        const owner = nonItemTerms.get(label.group).get(normalized);
        if (owner && owner !== label.id) {
          throw new Error(`Duplicate ${label.group} term ${term} in ${owner} and ${label.id}.`);
        }
        nonItemTerms.get(label.group).set(normalized, label.id);
      }
    }
    if (label.group === "item" &&
        (!itemCategories.has(label.category) || !donationSuitability.has(label.donationSuitability))) {
      throw new Error(`Item ${label.id} needs a known category and donationSuitability.`);
    }
  }

  for (const label of catalog.labels) {
    if (label.parentId && !labels.has(label.parentId)) {
      throw new Error(`Unknown parentId for ${label.id}: ${label.parentId}`);
    }
    for (const materialId of label.materialIds ?? []) {
      if (labels.get(materialId)?.group !== "material") {
        throw new Error(`Unknown material for ${label.id}: ${materialId}`);
      }
    }
    if (label.allowMaterialAreaGuidance !== undefined &&
        typeof label.allowMaterialAreaGuidance !== "boolean") {
      throw new Error(`allowMaterialAreaGuidance must be boolean for ${label.id}`);
    }
  }

  for (const [section, group] of [
    ["items", "item"],
    ["materials", "material"],
    ["properties", "property"],
  ]) {
    for (const label of catalog.labels.filter((entry) => entry.group === group)) {
      if (!guidance[section][label.id]) {
        throw new Error(`Missing ${section} guidance for ${label.id}.`);
      }
    }
    for (const id of Object.keys(guidance[section])) {
      if (labels.get(id)?.group !== group) {
        throw new Error(`Guidance ${section} references an unknown ${group}: ${id}`);
      }
    }
  }

  const areaIds = new Set();
  for (const area of areas.areas) {
    if (typeof area.id !== "string" || !area.id ||
        typeof area.name !== "string" || !area.name ||
        !["national", "municipal"].includes(area.scope) || areaIds.has(area.id)) {
      throw new Error(`Invalid or duplicate service area: ${area?.id ?? "unknown"}`);
    }
    areaIds.add(area.id);
  }

  for (const [areaId, areaGuidance] of Object.entries(guidance.areas)) {
    if (!areaIds.has(areaId)) {
      throw new Error(`Area guidance references an unknown area: ${areaId}`);
    }
    for (const [section, group] of [["items", "item"], ["materials", "material"]]) {
      for (const [id, entry] of Object.entries(areaGuidance[section] ?? {})) {
        if (labels.get(id)?.group !== group) {
          throw new Error(`Area guidance for ${areaId} references an unknown ${group}: ${id}`);
        }
        if (typeof entry.title !== "string" || !entry.title ||
            typeof entry.text !== "string" || !entry.text ||
            !Array.isArray(entry.sources) || entry.sources.length === 0) {
          throw new Error(`Area guidance for ${areaId}/${id} needs text and sources.`);
        }
        for (const source of entry.sources) {
          if (typeof source.title !== "string" || !source.title ||
              typeof source.url !== "string" || !source.url.startsWith("https://") ||
              typeof source.reviewedAt !== "string" ||
              !/^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt)) {
            throw new Error(`Invalid source for area guidance ${areaId}/${id}.`);
          }
        }
      }
    }
  }

  if (recycleRules?.version !== 1 || !Array.isArray(recycleRules.rules)) {
    throw new Error("recycle-rules.json must contain version 1 and a rules array.");
  }
  const ruleIds = new Set();
  const allowedConditions = new Set(["working", "usable", "repairable", "damaged", "contaminated", "unknown"]);
  const allowedLining = new Set(["unknown", "yes", "no"]);
  const allowedStatuses = new Set(["available", "need_more_information"]);
  for (const rule of recycleRules.rules) {
    if (typeof rule.id !== "string" || !rule.id || ruleIds.has(rule.id) ||
        typeof rule.title !== "string" || !rule.title ||
        typeof rule.text !== "string" || !rule.text ||
        !allowedStatuses.has(rule.status) ||
        (rule.priority !== undefined && (!Number.isInteger(rule.priority) || rule.priority < 0)) ||
        !rule.when || typeof rule.when !== "object" || Array.isArray(rule.when)) {
      throw new Error(`Invalid recycle rule: ${rule?.id ?? "unknown"}`);
    }
    ruleIds.add(rule.id);
    for (const [field, group] of [["itemIds", "item"], ["materialIds", "material"]]) {
      if (rule.when[field] !== undefined &&
          (!Array.isArray(rule.when[field]) || rule.when[field].length === 0 ||
            rule.when[field].some((id) => labels.get(id)?.group !== group))) {
        throw new Error(`Invalid ${field} in recycle rule ${rule.id}.`);
      }
    }
    for (const [field, allowed] of [["condition", allowedConditions], ["lining", allowedLining]]) {
      if (rule.when[field] !== undefined &&
          (!Array.isArray(rule.when[field]) || rule.when[field].length === 0 ||
            rule.when[field].some((value) => !allowed.has(value)))) {
        throw new Error(`Invalid ${field} in recycle rule ${rule.id}.`);
      }
    }
    if (rule.when.noMaterial !== undefined && typeof rule.when.noMaterial !== "boolean") {
      throw new Error(`Invalid noMaterial in recycle rule ${rule.id}.`);
    }
    if (Object.keys(rule.when).some((field) => !["itemIds", "materialIds", "condition", "lining", "noMaterial"].includes(field))) {
      throw new Error(`Unknown condition in recycle rule ${rule.id}.`);
    }
  }
}

export async function loadData() {
  const [catalog, guidance, areas, recycleRules] = await Promise.all([
    readJson("catalog.json"),
    readJson("guidance.json"),
    readJson("areas.json"),
    readJson("recycle-rules.json"),
  ]);

  const data = { catalog, guidance, areas, recycleRules };
  validateData(data);
  return data;
}
