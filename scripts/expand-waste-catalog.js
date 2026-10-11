// Curated catalogue additions for common household items.
// Run from the repository root with: node scripts/expand-waste-catalog.js
import { readFile, writeFile } from "node:fs/promises";

const catalogPath = new URL("../backend/data/catalog.json", import.meta.url);
const guidancePath = new URL("../backend/data/guidance.json", import.meta.url);
const [catalog, guidance] = await Promise.all([
  readFile(catalogPath, "utf8").then(JSON.parse),
  readFile(guidancePath, "utf8").then(JSON.parse),
]);

// Item names describe objects. Users choose materials separately when known.
const items = [
  ["mailing-bags", "Mailing bags", "packaging", "not_suitable", ["courier bags", "shipping bags"]],
  ["bubble-wrap", "Bubble wrap", "packaging", "not_suitable", ["bubble packaging"]],
  ["air-pillows", "Packaging air pillows", "packaging", "not_suitable", ["air-filled packaging"]],
  ["padded-envelopes", "Padded envelopes", "packaging", "not_suitable", ["bubble mailers"]],
  ["packing-foam", "Packing foam", "packaging", "not_suitable", ["thermocol packaging", "foam packaging"]],
  ["food-wrappers", "Food wrappers", "packaging", "not_suitable", ["snack wrappers", "biscuit wrappers", "sweet wrappers"]],
  ["straws", "Straws", "food-kitchen", "not_suitable", ["drinking straws"]],
  ["receipts", "Receipts", "paper-cardboard", "not_suitable", ["shop receipts", "thermal receipts"]],
  ["tickets", "Tickets", "paper-cardboard", "not_suitable", ["paper tickets"]],
  ["loose-paper", "Loose paper", "paper-cardboard", "not_suitable", ["worksheets", "printed sheets"]],
  ["tissues", "Tissues", "paper-cardboard", "not_suitable", ["tissue paper", "facial tissues"]],
  ["paper-towels", "Paper towels", "paper-cardboard", "not_suitable", ["kitchen roll"]],
  ["paper-tubes", "Paper tubes", "paper-cardboard", "not_suitable", ["cardboard tubes"]],
  ["hangers", "Hangers", "furniture-household", "consider_if_usable", ["clothes hangers", "metal hangers"]],
  ["basins", "Basins", "furniture-household", "consider_if_usable", ["wash basins", "washing basins"]],
  ["plant-pots", "Plant pots", "furniture-household", "consider_if_usable", ["flower pots", "planters"]],
  ["vases", "Vases", "furniture-household", "consider_if_usable", ["flower vases"]],
  ["bowls", "Bowls", "food-kitchen", "consider_if_usable", ["food bowls", "serving bowls"]],
  ["toothbrushes", "Toothbrushes", "other", "not_suitable", ["manual toothbrush"]],
  ["combs", "Combs", "other", "consider_if_usable", ["hair combs"]],
  ["markers", "Markers", "office-school", "consider_if_usable", ["marker pens", "felt-tip pens"]],
  ["computer-parts", "Computer parts", "electronics", "uncertain", ["computer components", "pc parts"]],
  ["circuit-boards", "Circuit boards", "electronics", "not_suitable", ["printed circuit boards", "pcbs"]],
  ["power-adapters", "Power adapters", "electronics", "consider_if_usable", ["plug adapters", "power supplies"]],
  ["pillowcases", "Pillowcases", "clothing-textiles", "consider_if_usable", ["pillow covers"]],
  ["pillows", "Pillows", "furniture-household", "uncertain", ["bed pillows"]],
  ["cushions", "Cushions", "furniture-household", "consider_if_usable", ["seat cushions"]],
  ["mats", "Mats", "furniture-household", "consider_if_usable", ["floor mats", "door mats"]],
  ["stools", "Stools", "furniture-household", "consider_if_usable", ["small stools"]],
  ["shelves", "Shelves", "furniture-household", "consider_if_usable", ["wall shelves"]],
  ["drawers", "Drawers", "furniture-household", "consider_if_usable", ["drawer units"]],
  ["handbags", "Handbags", "clothing-textiles", "consider_if_usable", ["purses"]],
  ["slippers", "Slippers", "clothing-textiles", "consider_if_usable", ["flip-flops"]],
  ["banners", "Banners", "clothing-textiles", "uncertain", ["event banners", "vinyl banners"]],
  ["eggshells", "Eggshells", "organic", "not_suitable", ["egg shells"]],
  ["tea-leaves", "Tea leaves", "organic", "not_suitable", ["used tea leaves", "tea grounds"]],
  ["coffee-grounds", "Coffee grounds", "organic", "not_suitable", ["used coffee grounds"]],
  ["tea-bags", "Tea bags", "organic", "not_suitable", ["used tea bags"]],
  ["grass-clippings", "Grass clippings", "organic", "not_suitable", ["cut grass"]],
  ["flowers", "Flowers", "organic", "not_suitable", ["wilted flowers", "flower waste"]],
  ["small-branches", "Small branches", "organic", "not_suitable", ["twigs", "pruned branches"]],
  ["toothpaste-tubes", "Toothpaste tubes", "other", "not_suitable", ["empty toothpaste tubes"]],
  ["cleaning-cloths", "Cleaning cloths", "clothing-textiles", "uncertain", ["dishcloths", "microfiber cloths"]],
  ["sponges", "Sponges", "food-kitchen", "not_suitable", ["dish sponges", "cleaning sponges"]],
  ["aerosol-cans", "Aerosol cans", "special-handling", "not_suitable", ["spray cans", "pressurised cans"]],
  ["sports-balls", "Sports balls", "toys-children", "consider_if_usable", ["football", "basketball"]],
  ["umbrellas", "Umbrellas", "other", "consider_if_usable", ["rain umbrellas"]],
  ["ropes-and-cords", "Ropes and cords", "other", "consider_if_usable", ["rope", "cord"]],
  ["disposable-diapers", "Disposable diapers", "special-handling", "not_suitable", ["nappies", "used diapers"]],
  ["wet-wipes", "Wet wipes", "special-handling", "not_suitable", ["baby wipes", "used wipes"]],
  ["cotton-swabs", "Cotton swabs", "special-handling", "not_suitable", ["cotton buds", "ear buds"]],
  ["cotton-pads", "Cotton pads", "special-handling", "not_suitable", ["makeup pads"]],
  ["disposable-gloves", "Disposable gloves", "special-handling", "not_suitable", ["used gloves"]],
  ["pet-waste", "Pet waste", "special-handling", "not_suitable", ["dog waste", "cat litter"]],
  ["sanitary-pads", "Sanitary pads", "special-handling", "not_suitable", ["menstrual pads", "used sanitary pads"]],
  ["face-masks", "Face masks", "special-handling", "not_suitable", ["disposable masks", "used masks"]],
  ["disposable-razors", "Disposable razors", "special-handling", "not_suitable", ["used razors", "razor blades"]],
  ["cigarette-butts", "Cigarette butts", "special-handling", "not_suitable", ["cigarette filters"]],
  ["broken-glass", "Broken glass", "special-handling", "not_suitable", ["glass shards", "shattered glass"]],
  ["medicine-blister-packs", "Medicine blister packs", "special-handling", "not_suitable", ["pill blister packs"]],
  ["used-cooking-oil", "Used cooking oil", "special-handling", "not_suitable", ["waste cooking oil"]],
];

const categoryGuidance = {
  packaging: "Empty the packaging and check its material, coatings, and residue. Ask your local collector whether this form is accepted.",
  "paper-cardboard": "Keep clean paper separate from wet waste. Coatings, thermal paper, and food or bodily contamination can change the collection route; check local rules.",
  "furniture-household": "Reuse or repair a sound item where practical. For damaged or bulky items, identify the materials and ask about local collection.",
  "food-kitchen": "Reuse only if clean and safe. Check the material and any food residue before choosing a local collection route.",
  electronics: "Use an authorised e-waste collection or producer take-back route for an unwanted electrical item. Handle any battery separately as instructed.",
  "clothing-textiles": "Reuse or repair clean textiles where practical. Ask about local textile collection for damaged or unsuitable items.",
  organic: "Keep suitable plant or food waste separate from dry waste. Compost where appropriate or follow local wet-waste and garden-waste collection rules.",
  "office-school": "Reuse a sound item where practical. Check its materials and local collection options before disposal.",
  "toys-children": "Pass on a clean, complete, safe item if usable. Check local options for damaged or mixed-material items.",
  "special-handling": "Keep this item out of ordinary recycling until you have checked local handling and collection instructions.",
  other: "Reuse a clean, safe item where practical. Identify its materials and check the appropriate local collection route.",
};

const specialGuidance = {
  "tea-bags": "Some tea bags contain mixed materials. Check the bag material before composting; loose tea leaves can follow suitable food-waste guidance.",
  tissues: "Used tissues may be contaminated. Do not assume they belong with clean paper recycling; check local disposal instructions.",
  "paper-towels": "Used paper towels may be contaminated or greasy. Check local disposal instructions instead of assuming clean paper collection accepts them.",
  "aerosol-cans": "Do not puncture or heat a pressurised can. Check whether your local service accepts it empty or requires special collection.",
  "disposable-diapers": "Keep used diapers contained and follow local sanitary-waste collection instructions. Do not put them with dry recyclables.",
  "wet-wipes": "Do not flush used wipes. Keep them out of clean paper recycling and follow local residual or sanitary-waste instructions.",
  "cotton-swabs": "Keep used swabs contained and follow local residual or sanitary-waste instructions. Do not put them with clean dry recyclables.",
  "cotton-pads": "Keep used pads contained and follow local residual or sanitary-waste instructions. Do not put them with clean dry recyclables.",
  "disposable-gloves": "Keep used gloves contained and follow local disposal instructions, especially if they contacted chemicals or bodily fluids.",
  "pet-waste": "Keep pet waste contained and follow local disposal instructions. Do not add it to ordinary food-waste compost without a dedicated safe process.",
  "sanitary-pads": "Keep used pads contained and follow local sanitary-waste collection instructions. Do not put them with dry recyclables.",
  "face-masks": "Keep used masks contained and follow local disposal instructions. Do not put them with clean dry recyclables.",
  "disposable-razors": "Protect handlers from the blade. Follow local sharps or safe disposal instructions; do not place loose blades in recycling.",
  "cigarette-butts": "Make sure the butt is fully extinguished. Do not mix it with clean paper or plastic recycling; follow local residual-waste instructions.",
  "broken-glass": "Protect handlers from sharp edges and check local instructions. Broken glass may need a different route from intact glass containers.",
  "medicine-blister-packs": "Check local handling for medicine packaging and keep any remaining medicine separate for appropriate collection.",
  "used-cooking-oil": "Keep used cooking oil in a closed container. Ask about local oil collection; do not pour it into drains.",
  "computer-parts": "Use an authorised e-waste collector or producer take-back route. Check for data-bearing components before passing the item on.",
  "circuit-boards": "Use an authorised e-waste collection route. Do not burn or dismantle circuit boards to recover materials.",
};

const byId = new Map(catalog.labels.map((label) => [label.id, label]));
const cups = byId.get("cups");
if (!cups) throw new Error("The generic Cups item is missing.");
cups.synonyms = [...new Set([...(cups.synonyms ?? []), "paper cup", "paper cups", "mug", "yoghurt cup", "dessert cup"])];
cups.donationSuitability = "uncertain";
guidance.items.cups = {
  reuse: [{ title: "Reuse a durable cup if safe", text: "A clean, intact cup designed for repeated use can stay in service. Avoid reusing a single-use cup for food or drink beyond its intended use." }],
  recycleOrDispose: { title: "Check the cup and its material", text: "Cups can be made from several materials and may have coatings or food residue. Choose the material you know and check local collection instructions." },
};

const container = byId.get("container");
if (container) container.synonyms = [...new Set([...(container.synonyms ?? []), "bottle", "jar", "food jar"])];
const foodContainers = byId.get("food-containers");
if (foodContainers) {
  foodContainers.category = "packaging";
  foodContainers.donationSuitability = "uncertain";
  delete foodContainers.materialIds;
  foodContainers.synonyms = [...new Set([...(foodContainers.synonyms ?? []), "takeaway food box", "food storage tub", "ice cream tub"])];
  guidance.items[foodContainers.id] = {
    reuse: [{ title: "Reuse a sound food container", text: "Reuse a clean container only if it is safe and intended for the purpose. Do not reuse damaged or contaminated packaging for food." }],
    recycleOrDispose: { title: "Check the container material", text: "Empty the container, choose its material if known, and check local collection rules for residue, coatings, and attached parts." },
  };
}

catalog.labels = catalog.labels.filter((label) => label.id !== "paper-cups");
delete guidance.items["paper-cups"];

let added = 0;
for (const [id, label, category, donationSuitability, synonyms] of items) {
  const oldReuseText = `If this ${label.toLowerCase()} item is clean and usable, consider repairing, reusing, or passing it on after checking its condition.`;
  const reuseText = "A clean, usable item may be repaired, reused, or passed on after checking its condition.";
  if (byId.has(id)) {
    const existingReuse = guidance.items[id]?.reuse?.[0];
    if (existingReuse?.text === oldReuseText) existingReuse.text = reuseText;
    continue;
  }
  const entry = { id, label, group: "item", category, synonyms, donationSuitability };
  catalog.labels.push(entry);
  const advice = specialGuidance[id] ?? categoryGuidance[category];
  guidance.items[id] = {
    reuse: donationSuitability === "not_suitable"
      ? []
      : [{ title: "Consider safe reuse", text: reuseText }],
    recycleOrDispose: { title: "Check the appropriate collection route", text: advice },
  };
  byId.set(id, entry);
  added += 1;
}

await Promise.all([
  writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`),
  writeFile(guidancePath, `${JSON.stringify(guidance, null, 2)}\n`),
]);
console.log(`Added ${added} item labels and removed Paper Cups.`);
