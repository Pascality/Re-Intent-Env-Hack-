const BATTERIES = new Set(["batteries", "vehicle-batteries", "power-banks"]);
const LAMPS = new Set(["fluorescent-lamps", "led-bulbs", "light-bulbs"]);
const SANITARY = new Set(["disposable-diapers", "sanitary-pads"]);
const SOILED_PAPER = new Set(["tissues", "paper-towels"]);
const RECEIPTS = new Set(["receipts", "tickets"]);
const CHEMICAL_CONTAINERS = new Set([
  "paint-containers", "chemical-containers", "paint-buckets", "aerosol-cans", "oil-container",
]);
const MEDICINES = new Set(["medicines", "thermometers", "medical-equipment"]);
const BULKY = new Set([
  "furniture", "beds", "mattresses", "sofas", "cupboards", "bookshelves", "study-desks",
  "dressing-tables", "side-tables", "shelves", "drawers", "chairs", "tables",
  "broken-plastic-chairs", "metal-furniture",
]);
const GLASS_CONTAINERS = new Set(["glass-bottle", "bottles", "spice-jars"]);
const OTHER_GLASS_ITEMS = new Set(["glass-tumblers", "glass-cookware", "window-glass", "mirrors"]);
const ELECTRICAL_ITEMS = new Set([
  "lamps", "fans", "coffee-makers", "blenders", "juicers", "toasters", "electrical-switches",
]);
const CUP_RULES = new Map([
  ["cups-paper-contaminated", "Put the dirty paper cup in your local non-recyclable waste collection, not the paper recycling bin. Use a separate used-cup collection only if your local service offers one."],
  ["cups-paper-lined", "Put the lined cup in non-recyclable waste unless your local service accepts used or lined paper cups separately."],
  ["cups-paper-unlined", "Put the clean, dry cup with paper only if your local collector accepts paper cups. Otherwise use non-recyclable waste."],
  ["cups-paper-lining-unknown", "Keep the cup out of paper recycling until you check the lining. If your collector does not accept this cup, use non-recyclable waste."],
  ["cups-plastic-contaminated", "If you cannot clean the dirty cup safely, use local non-recyclable waste. Recycle it only if clean and accepted locally."],
  ["cups-plastic-clean", "Put the clean, dry cup in local plastic collection only if cups are accepted. Otherwise use non-recyclable waste."],
  ["cups-glass", "Ask if local glass collection accepts drinking glasses. If it does not, use local non-recyclable waste; contain any broken pieces."],
  ["cups-ceramic", "Keep ceramic cups out of bottle-glass recycling. Use a separate ceramics collection if available; otherwise follow local non-recyclable waste instructions."],
  ["cups-material-unknown", "Choose what the cup is made of before putting it in a recycling bin."],
]);

function specialItemStep(itemId) {
  if (BATTERIES.has(itemId)) {
    return "Keep it out of household and recycling bins. Take it to battery take-back or a collection point. If it is hot, swollen, or leaking, ask for safety advice before moving it.";
  }
  if (LAMPS.has(itemId)) {
    return "Keep the bulb intact and out of glass recycling. Ask for a lamp or special-care collection point.";
  }
  if (SANITARY.has(itemId)) {
    return "Wrap it securely and use your local separate sanitary-waste collection. Do not put it in recycling.";
  }
  if (itemId === "disposable-razors") {
    return "Cover or contain the blade so nobody is cut. Ask your local service how to dispose of sharps; do not put a loose blade in recycling.";
  }
  if (itemId === "broken-glass") {
    return "Contain the sharp pieces so nobody is cut. Ask your local collector for its broken-glass route; do not use the bottle-glass bin.";
  }
  if (CHEMICAL_CONTAINERS.has(itemId)) {
    return "Keep the container closed and out of ordinary recycling. Ask for your local paint, oil or chemical-waste collection; do not pour out the contents.";
  }
  if (MEDICINES.has(itemId)) {
    return "Keep it out of ordinary recycling. Ask a pharmacy or local authority for the right medicine or special-care collection point.";
  }
  if (itemId === "gas-cylinders") {
    return "Ask the supplier about returning the cylinder. Do not puncture it or put it in a household bin.";
  }
  if (itemId === "ink-cartridges" || itemId === "toner-cartridges") {
    return "Ask the seller or maker about cartridge take-back. Do not put a leaking cartridge with ordinary recyclables.";
  }
  if (itemId === "used-cooking-oil") {
    return "Keep used oil in a closed container. Ask your local service about oil collection; do not pour it down the drain.";
  }
  if (["wet-wipes", "face-masks", "disposable-gloves", "cotton-swabs", "cotton-pads", "pet-waste", "cigarette-butts"].includes(itemId)) {
    return "Keep this used item out of recycling and compost. Use your local non-recyclable waste collection; ask about a separate route if it may be infectious.";
  }
  if (itemId === "medicine-blister-packs") {
    return "Keep empty blister packs out of ordinary paper or plastic recycling unless your local service accepts them. Ask a pharmacy about take-back.";
  }
  return null;
}

function materialStep(materialId) {
  switch (materialId) {
    case "paper":
    case "cardboard":
      return "Put clean, dry paper or cardboard in your local dry-paper collection if it is accepted. Keep dirty or coated pieces out.";
    case "plastic":
      return "Put it in local dry-plastic collection only if that plastic item is accepted. Otherwise use your local non-recyclable waste collection.";
    case "glass":
      return "Ask whether local glass collection accepts this kind of glass. Keep broken glass and ceramics out of the bottle-glass bin.";
    case "metal":
    case "iron-steel":
    case "aluminium":
    case "copper":
    case "brass":
      return "Give this clean metal to an accepted dry-waste or scrap-metal collection. Keep batteries and chemical containers separate.";
    case "organic":
      return "Keep it with wet waste, or compost it if your compost setup accepts it. Keep it out of dry recycling.";
    case "electronics":
      return "Take it to a producer take-back or designated e-waste collection point. Do not put it in a household recycling bin.";
    case "textile":
      return "If clean, use a textile collection point or pass it on if usable. Ask your local service where worn fabric goes.";
    case "wood":
      return "Ask for a wood or bulky-item collection point. Keep painted or treated wood out of compost.";
    case "rubber":
      return "Ask your local service for a rubber or tyre collection point. Do not put it with plastic recycling.";
    case "ceramic":
      return "Keep it out of bottle-glass recycling. Ask about ceramics collection; otherwise use local non-recyclable waste.";
    case "leather":
      return "Ask about textile or bulky-item collection. Do not put leather in paper or plastic recycling.";
    case "mixed-waste":
      return "Separate the materials if you can. If they cannot be separated, ask your local collector before putting them in recycling.";
    default:
      return null;
  }
}

export function getDisposalStep({ item, materialIds, propertyIds, condition, selectedRule }) {
  const itemId = item?.id;

  if (BATTERIES.has(itemId)) return specialItemStep(itemId);
  if (itemId === "oil-container") {
    return "Keep the container out of normal recycling until you know what oil it held. Ask your local collector about the container and any oil left inside; do not pour the oil down a drain.";
  }
  if (propertyIds.includes("residue") || propertyIds.includes("hazardous")) {
    return "Keep it out of ordinary recycling. Ask your local service for a safe collection point for this hazardous item or residue.";
  }
  if (LAMPS.has(itemId) || item?.category === "special-handling") {
    const special = specialItemStep(itemId);
    if (special) return special;
    return "Keep it out of ordinary recycling. Ask your local service for a special-care collection point.";
  }
  if (propertyIds.includes("sharp-or-broken")) {
    return "Contain sharp pieces so nobody is cut. Ask your local collector for its broken-item route; do not put loose pieces in recycling.";
  }
  if (selectedRule?.id === "damaged-glass") {
    return "Contain cracked or broken glass so nobody is cut. Keep it out of the bottle-glass bin and ask your local collector where to put it.";
  }
  if (selectedRule?.id === "damaged-ceramic") {
    return "Contain broken ceramic pieces so nobody is cut. Keep them out of glass recycling and use the local broken-ceramics route.";
  }
  if (item?.category === "electronics") {
    return "Take it to a producer take-back or designated e-waste collection point. Do not put it in a household recycling bin.";
  }
  if (ELECTRICAL_ITEMS.has(itemId)) {
    return "Ask a designated e-waste collector about this electrical item. Do not put it in ordinary household recycling.";
  }
  if (item?.category === "organic") {
    return "Keep it with wet waste, or compost it if your compost setup accepts it. Keep it out of dry recycling.";
  }
  if (materialIds.length === 1 && ["organic", "electronics"].includes(materialIds[0])) {
    return materialStep(materialIds[0]);
  }
  if (SOILED_PAPER.has(itemId)) {
    return "Put used tissues or paper towels in local non-recyclable waste, not paper recycling. Ask about a separate route if they have bodily fluids or chemicals.";
  }
  if (RECEIPTS.has(itemId)) {
    return "Check if your collector accepts this receipt or ticket. If it is thermal or coated and not accepted, use local non-recyclable waste.";
  }
  if (CHEMICAL_CONTAINERS.has(itemId)) return specialItemStep(itemId);
  if (selectedRule && CUP_RULES.has(selectedRule.id)) return CUP_RULES.get(selectedRule.id);
  if (itemId === "cups" && materialIds.includes("paper") && condition === "contaminated") {
    return CUP_RULES.get("cups-paper-contaminated");
  }

  if (condition === "contaminated") {
    if (materialIds.includes("paper") || materialIds.includes("cardboard") || item?.category === "paper-cardboard") {
      return "Keep the dirty paper or cardboard out of paper recycling. Use local non-recyclable waste collection unless your collector offers a separate route.";
    }
    if (materialIds.includes("plastic") || materialIds.includes("glass") || materialIds.includes("metal")) {
      return "Empty and clean it only if safe. If it stays dirty, keep it out of clean recycling and use your local non-recyclable waste collection.";
    }
    return "Keep the dirty item out of clean recycling. If it cannot be cleaned safely, ask your local service for its non-recyclable waste route.";
  }

  if (selectedRule?.status === "need_more_information") {
    if (itemId === "cups" || itemId === "bottles") return "Choose the item's material first; it tells us which collection to use.";
  }
  if (itemId === "cups" && materialIds.length === 0) return "Choose what the cup is made of before putting it in a recycling bin.";
  if (["bottles", "plastic-bottle"].includes(itemId) && materialIds.includes("plastic")) {
    return "Empty the bottle. Put it in local dry-plastic collection if bottles are accepted; otherwise use the local non-recyclable waste route.";
  }
  if (GLASS_CONTAINERS.has(itemId) && materialIds.includes("glass")) {
    return "Put the empty, intact bottle or jar in local glass collection if accepted. Keep other glass types and broken pieces separate.";
  }
  if (OTHER_GLASS_ITEMS.has(itemId)) {
    return "Do not put this with glass bottles. Ask your local collector for its separate glass or non-recyclable waste route.";
  }
  if (["boxes", "cardboard-box", "cardboard-boxes"].includes(itemId) && materialIds.includes("cardboard")) {
    return "Flatten the clean, dry box and put it in local cardboard collection if accepted. Keep dirty pieces out.";
  }
  if (["food-containers", "plastic-food-container", "disposable-food-containers"].includes(itemId) && materialIds.length === 1) {
    return "Empty the food container. Put it in the collection for its material only if your local service accepts that kind of container.";
  }
  if (["metal-can", "cans"].includes(itemId) && materialIds.some((id) => ["metal", "iron-steel", "aluminium"].includes(id))) {
    return "Empty the can and put it in local metal or dry-waste collection if cans are accepted. Keep paint or chemical cans separate.";
  }
  if (BULKY.has(itemId)) {
    return "Arrange a bulky-item pickup or ask your local service for a drop-off point. Do not leave it beside a household bin.";
  }
  if (item?.category === "construction-repair") {
    return "Ask for a construction-waste or scrap collection point. Do not put building waste in a household recycling bin.";
  }
  if (item?.category === "vehicles-mechanical") {
    return "Ask a repair shop or local collector for a parts or tyre collection point. Keep oil and batteries in their separate routes.";
  }
  if (materialIds.length === 1) {
    const material = materialStep(materialIds[0]);
    if (material) return material;
  }
  if (materialIds.length > 1) {
    return "Separate the materials if you can, then use each local collection route. If the parts cannot be separated, ask your collector before recycling.";
  }
  if (item?.category === "paper-cardboard") return materialStep("paper");
  if (item?.category === "plastic-items") return materialStep("plastic");
  if (item?.category === "metal-items") return materialStep("metal");
  if (item?.category === "glass-items") return materialStep("glass");
  if (item?.category === "clothing-textiles") return materialStep("textile");
  if (itemId === "unidentified-item") return "Choose a material or more specific item before putting this in a recycling bin.";
  return "Choose what it is made of before putting it in a recycling bin. Your local collector can tell you where it goes.";
}
