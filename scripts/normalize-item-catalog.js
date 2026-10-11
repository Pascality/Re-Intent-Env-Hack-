// Keep object names in Items; users choose the material separately.
// Run from the repository root: node scripts/normalize-item-catalog.js
import { readFile, writeFile } from "node:fs/promises";

const catalogPath = new URL("../backend/data/catalog.json", import.meta.url);
const guidancePath = new URL("../backend/data/guidance.json", import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const guidance = JSON.parse(await readFile(guidancePath, "utf8"));
const byId = new Map(catalog.labels.map((entry) => [entry.id, entry]));
const materialRefinedIds = new Set([
  "container", "food-containers", "cups", "bottles", "cans", "boxes",
  "bags", "wrappers-and-film", "buckets", "crates", "bottle-caps",
  "hangers", "chairs", "pipes", "wires", "foil", "tools", "shelves",
  "furniture", "toys", "planks", "rods", "doors", "tubes",
]);

// The old entries are retained as hidden aliases for existing API clients.
// A target may already be a generic item in the catalogue.
const replacements = [
  ["plastic-bottle", "bottles", "Bottles", "packaging"],
  ["glass-bottle", "bottles", "Bottles", "packaging"],
  ["metal-bottles", "bottles", "Bottles", "packaging"],
  ["metal-can", "cans", "Cans", "packaging"],
  ["cardboard-box", "boxes", "Boxes", "packaging"],
  ["cardboard-boxes", "boxes", "Boxes", "packaging"],
  ["paper-bag", "bags", "Bags", "packaging"],
  ["plastic-food-container", "food-containers", "Food Containers", "packaging"],
  ["plastic-film", "wrappers-and-film", "Wrappers and film", "packaging"],
  ["plastic-buckets", "buckets", "Buckets", "furniture-household"],
  ["plastic-mugs", "cups", "Cups", "food-kitchen"],
  ["plastic-hangers", "hangers", "Hangers", "furniture-household"],
  ["broken-plastic-chairs", "chairs", "Chairs", "furniture-household"],
  ["plastic-crates", "crates", "Crates", "packaging"],
  ["plastic-bottle-caps", "bottle-caps", "Bottle caps", "packaging"],
  ["metal-bottle-caps", "bottle-caps", "Bottle caps", "packaging"],
  ["pvc-pipes", "pipes", "Pipes", "construction-repair"],
  ["old-pipes", "pipes", "Pipes", "construction-repair"],
  ["paper-files", "files-and-binders", "Files And Binders", "office-school"],
  ["glass-tumblers", "cups", "Cups", "food-kitchen"],
  ["window-glass", "windows", "Windows", "construction-repair"],
  ["glass-cookware", "cookware", "Cookware", "food-kitchen"],
  ["aluminum-cookware", "cookware", "Cookware", "food-kitchen"],
  ["copper-wires", "wires", "Wires", "construction-repair"],
  ["aluminum-foil", "foil", "Foil", "food-kitchen"],
  ["iron-tools", "tools", "Tools", "vehicles-mechanical"],
  ["metal-shelves", "shelves", "Shelves", "furniture-household"],
  ["metal-furniture", "furniture", "Furniture", "furniture-household"],
  ["woollen-clothing", "clothing", "Clothing", "clothing-textiles"],
  ["plastic-toys", "toys", "Toys", "toys-children"],
  ["wooden-planks", "planks", "Planks", "construction-repair"],
  ["metal-rods", "rods", "Rods", "construction-repair"],
  ["wooden-doors", "doors", "Doors", "construction-repair"],
  ["steel-containers", "storage-containers", "Storage Containers", "furniture-household"],
  ["paper-tubes", "tubes", "Tubes", "packaging"],
];

for (const [oldId, newId, label, category] of replacements) {
  const oldItem = byId.get(oldId);
  if (!oldItem) throw new Error(`Missing legacy item ${oldId}`);
  oldItem.hidden = true;

  let item = byId.get(newId);
  if (!item) {
    item = {
      id: newId,
      label,
      group: "item",
      category,
      synonyms: [],
      donationSuitability: oldItem.donationSuitability,
    };
    catalog.labels.push(item);
    byId.set(newId, item);
    guidance.items[newId] = {
      reuse: [{
        title: "Consider safe reuse",
        text: "If it is clean, safe, and suitable for another use, consider using it again.",
      }],
      recycleOrDispose: {
        title: "Check the material and local collection rules",
        text: "Choose the material if you know it, check for residue or mixed parts, and follow local collection instructions.",
      },
    };
  }
  // Material-qualified search terms can still find the one generic item.
  item.synonyms = [...new Set([...(item.synonyms ?? []), oldItem.label, ...(oldItem.synonyms ?? [])])];
}

for (const oldId of ["scrap-iron", "brass-items", "fabric-scraps", "loose-paper", "broken-glass"]) {
  const item = byId.get(oldId);
  if (item) item.hidden = true; // These describe a material, not a distinct object.
}

if (!byId.has("sharp-or-broken")) {
  const property = {
    id: "sharp-or-broken",
    label: "Sharp or broken",
    group: "property",
    synonyms: ["sharp edges", "broken pieces"],
  };
  catalog.labels.push(property);
  guidance.properties[property.id] = {
    reuse: [],
    recycleOrDispose: {
      title: "Protect people handling broken pieces",
      text: "Keep sharp or broken pieces contained so nobody is cut. Check local instructions before placing them in any recycling or waste collection.",
    },
  };
  byId.set(property.id, property);
}

// Existing catalogue entries also had guessed material IDs. The item selection
// must not silently select Plastic, Glass, Metal, etc. on the user's behalf.
for (const item of catalog.labels) {
  if (item.group !== "item" || item.hidden) continue;
  delete item.materialIds;
  // A selected material can refine area guidance for ordinary objects.
  // Keep specialist and potentially hazardous items on their item route.
  item.allowMaterialAreaGuidance = materialRefinedIds.has(item.id);
  if (item.category === "plastic-items") {
    item.category = ["storage-boxes", "reusable-food-containers"].includes(item.id)
      ? "furniture-household" : "packaging";
  } else if (item.category === "glass-items") {
    item.category = "packaging";
  } else if (item.category === "metal-items") {
    item.category = ["broken-bicycles"].includes(item.id)
      ? "vehicles-mechanical"
      : ["old-utensils"].includes(item.id)
        ? "food-kitchen"
        : "construction-repair";
  }
}

await Promise.all([
  writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`),
  writeFile(guidancePath, `${JSON.stringify(guidance, null, 2)}\n`),
]);
console.log(`Kept ${replacements.length} material-specific aliases hidden and added generic item choices.`);
