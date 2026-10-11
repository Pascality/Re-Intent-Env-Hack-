import { getDisposalStep } from "./disposal-step.js";

const CONDITIONS = new Set([
  "working",
  "usable",
  "repairable",
  "damaged",
  "contaminated",
  "unknown",
]);

const ENVIRONMENTS = new Set(["home", "workplace", "outdoors"]);
const LINING = new Set(["unknown", "yes", "no"]);
const SAFETY_PROPERTIES = new Set(["hazardous", "residue", "sharp-or-broken"]);
const SPECIFIC_METALS = new Set(["iron-steel", "aluminium", "copper", "brass"]);
const MAX_AREA_LENGTH = 120;

export class RequestValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "RequestValidationError";
    this.details = details;
  }
}

function uniqueStrings(value, fieldName) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new RequestValidationError(`${fieldName} must be an array of strings.`);
  }
  return [...new Set(value.map((entry) => entry.trim()).filter(Boolean))];
}

function normalizeRequest(body, catalog, areasById) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestValidationError("Request body must be a JSON object.");
  }

  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  const suppliedMaterialIds = uniqueStrings(body.materialIds, "materialIds");
  const materialIds = suppliedMaterialIds.some((id) => SPECIFIC_METALS.has(id))
    ? suppliedMaterialIds.filter((id) => id !== "metal")
    : suppliedMaterialIds;
  const propertyIds = uniqueStrings(body.propertyIds, "propertyIds");
  const condition = body.condition ?? "unknown";
  const environment = body.environment ?? "home";
  if (body.recycleDetails !== undefined &&
      (!body.recycleDetails || typeof body.recycleDetails !== "object" || Array.isArray(body.recycleDetails))) {
    throw new RequestValidationError("recycleDetails must be an object.");
  }
  const lining = body.recycleDetails?.lining ?? "unknown";
  if (!LINING.has(lining)) {
    throw new RequestValidationError("recycleDetails has an unsupported lining value.");
  }
  if (body.itemId !== undefined && typeof body.itemId !== "string") {
    throw new RequestValidationError("itemId must be a string.");
  }
  if (body.area !== undefined && typeof body.area !== "string") {
    throw new RequestValidationError("area must be a string.");
  }
  if (body.areaId !== undefined && typeof body.areaId !== "string") {
    throw new RequestValidationError("areaId must be a string.");
  }
  const area = typeof body.area === "string" ? body.area.trim() : "";
  const areaId = typeof body.areaId === "string" ? body.areaId.trim() : "";
  const searchForDonation = body.searchForDonation ?? false;

  if (!itemId && materialIds.length === 0 && propertyIds.length === 0) {
    throw new RequestValidationError(
      "Choose an item or at least one material/property label.",
    );
  }
  if (itemId && catalog.byId.get(itemId)?.group !== "item") {
    throw new RequestValidationError("itemId must identify an item in the Re-Intent catalogue.", [
      { field: "itemId", value: itemId },
    ]);
  }

  for (const id of materialIds) {
    if (!catalog.byId.has(id) || catalog.byId.get(id).group !== "material") {
      throw new RequestValidationError("A materialIds value is not a known material.", [
        { field: "materialIds", value: id },
      ]);
    }
  }
  for (const id of propertyIds) {
    if (!catalog.byId.has(id) || catalog.byId.get(id).group !== "property") {
      throw new RequestValidationError("A propertyIds value is not a known property.", [
        { field: "propertyIds", value: id },
      ]);
    }
  }
  if (propertyIds.includes("non-biodegradable") &&
      (propertyIds.includes("biodegradable") || propertyIds.includes("compostable"))) {
    throw new RequestValidationError(
      "Non-biodegradable cannot be combined with biodegradable or labeled compostable.",
      [{ field: "propertyIds", value: propertyIds }],
    );
  }
  if (!CONDITIONS.has(condition)) {
    throw new RequestValidationError("condition is not supported.", [
      { field: "condition", allowed: [...CONDITIONS] },
    ]);
  }
  if (!ENVIRONMENTS.has(environment)) {
    throw new RequestValidationError("environment is not supported.", [
      { field: "environment", allowed: [...ENVIRONMENTS] },
    ]);
  }
  if (area.length > MAX_AREA_LENGTH) {
    throw new RequestValidationError(`area must be ${MAX_AREA_LENGTH} characters or fewer.`);
  }
  if (areaId && !areasById.has(areaId)) {
    throw new RequestValidationError("areaId is not a supported service area.", [
      { field: "areaId", value: areaId },
    ]);
  }
  if (typeof searchForDonation !== "boolean") {
    throw new RequestValidationError("searchForDonation must be a boolean.");
  }

  return { itemId, materialIds, propertyIds, condition, environment, areaId, area, searchForDonation,
    recycleDetails: { lining } };
}

function makeCatalogIndex(catalogData) {
  const byId = new Map(catalogData.labels.map((label) => [label.id, label]));
  return { labels: catalogData.labels, byId };
}

function selectGuidance(guidanceData, itemId, materialIds, propertyIds) {
  const itemGuidance = itemId ? guidanceData.items[itemId] : undefined;
  const materialGuidance = materialIds
    .map((id) => guidanceData.materials[id])
    .filter(Boolean);
  const propertyGuidance = propertyIds
    .map((id) => guidanceData.properties?.[id])
    .filter(Boolean);

  return { itemGuidance, materialGuidance, propertyGuidance };
}

function appliesToEnvironment(entry, environment) {
  return !entry.environments || entry.environments.includes(environment);
}

function findRecycleRule(rules, request, item, materialIds) {
  // Specialist item guidance takes precedence over ordinary material routes.
  if (["electronics", "special-handling", "organic"].includes(item?.category) || item?.id === "oil-container") return null;
  return rules.find(({ when }) =>
    (!when.itemIds || when.itemIds.includes(item?.id)) &&
    (!when.materialIds || when.materialIds.some((id) => materialIds.includes(id))) &&
    (!when.condition || when.condition.includes(request.condition)) &&
    (!when.lining || when.lining.includes(request.recycleDetails.lining)) &&
    (!when.noMaterial || materialIds.length === 0));
}

function makeTextRoute(title, entries, emptyMessage) {
  if (!entries.length) {
    return { status: "no_guidance", title, message: emptyMessage, items: [] };
  }
  return { status: "available", title, scope: "general", items: entries };
}

function buildDonationRoute({ item, condition, area, searchForDonation }) {
  const suitability = item?.donationSuitability ?? "uncertain";
  let status;
  let message;

  if (condition === "contaminated") {
    status = "probably_not_suitable";
    message = "You marked this item contaminated, so it is not suitable for donation as-is. Follow the disposal guidance or clean it safely before reconsidering donation.";
  } else if (suitability === "not_suitable") {
    status = "probably_not_suitable";
    message = "This type of item is generally not suitable for donation. Reuse or recycling may be a better route.";
  } else if (suitability === "consider_if_usable" && ["working", "usable"].includes(condition)) {
    status = "consider";
    message = "Based on your selection that the item is usable, donation may be worth considering. Contact an organization to confirm it accepts the item.";
  } else if (suitability === "consider_if_usable" && condition === "unknown") {
    status = "need_more_information";
    message = "Check whether the item is usable before considering donation.";
  } else if (suitability === "uncertain") {
    status = "need_more_information";
    message = "Donation suitability is unclear for this item. Check its condition and contact an organization before taking it there.";
  } else {
    status = "probably_not_suitable";
    message = "Based on the condition you selected, donation may not be suitable as-is.";
  }

  const route = {
    status,
    title: "Donation",
    message,
    acceptanceVerified: false,
  };

  if (searchForDonation && condition !== "contaminated") {
    const searchTerms = ["donate", item?.label ?? "reusable items", area]
      .filter(Boolean)
      .join(" ");
    const url = new URL("https://www.google.com/maps/search/");
    url.searchParams.set("api", "1");
    url.searchParams.set("query", searchTerms);
    route.search = {
      label: "Search nearby organizations",
      url: url.toString(),
      note: "Search results are not verified by Re-Intent. Contact an organization to confirm acceptance.",
    };
  }

  return route;
}

export function createRecommendationService(data) {
  const catalog = makeCatalogIndex(data.catalog);
  const areasById = new Map(data.areas.areas.map((area) => [area.id, area]));
  // Higher-priority safety rules win; file order breaks ties.
  const recycleRules = [...data.recycleRules.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return {
    getCatalog({ query = "", group = "" } = {}) {
      const normalizedQuery = query.trim().toLowerCase();
      const labels = catalog.labels.filter((label) => {
        if (label.hidden === true) return false;
        const matchesGroup = !group || label.group === group;
        const searchable = [label.label, ...(label.synonyms ?? [])].join(" ").toLowerCase();
        return matchesGroup && (!normalizedQuery || searchable.includes(normalizedQuery));
      });
      return { items: labels };
    },

    getAreas() {
      return { areas: data.areas.areas };
    },

    recommend(body) {
      const request = normalizeRequest(body, catalog, areasById);
      const item = request.itemId ? catalog.byId.get(request.itemId) : undefined;
      const selectedArea = request.areaId ? areasById.get(request.areaId) : null;
      const areaName = selectedArea?.name ?? request.area;
      const searchArea = request.area && selectedArea
        ? `${request.area}, ${selectedArea.name}`
        : (request.area || selectedArea?.name || "");
      const combinedMaterialIds = [...new Set([
        ...(item?.materialIds ?? []),
        ...request.materialIds,
      ])];
      const effectiveMaterialIds = combinedMaterialIds.some((id) => SPECIFIC_METALS.has(id))
        ? combinedMaterialIds.filter((id) => id !== "metal")
        : combinedMaterialIds;
      const { itemGuidance, materialGuidance, propertyGuidance } = selectGuidance(
        data.guidance,
        request.itemId,
        effectiveMaterialIds,
        request.propertyIds,
      );

      // Specific item guidance takes priority over broad material guidance.
      const reuseItems = [
        ...(itemGuidance?.reuse?.length
          ? itemGuidance.reuse
          : materialGuidance.flatMap((entry) => entry.reuse ?? [])),
        ...propertyGuidance.flatMap((entry) => entry.reuse ?? []),
      ].filter((entry) => appliesToEnvironment(entry, request.environment));
      const safetyPropertyGuidance = request.propertyIds
        .filter((id) => SAFETY_PROPERTIES.has(id))
        .map((id) => data.guidance.properties[id]?.recycleOrDispose)
        .filter(Boolean);
      const recycleRule = findRecycleRule(recycleRules, request, item, effectiveMaterialIds);
      const baseRecycleItems = [
        ...(itemGuidance?.recycleOrDispose
          ? [itemGuidance.recycleOrDispose]
          : materialGuidance.flatMap((entry) =>
              entry.recycleOrDispose ? [entry.recycleOrDispose] : [],
            )),
        ...propertyGuidance.flatMap((entry) =>
          entry.recycleOrDispose ? [entry.recycleOrDispose] : [],
        ),
      ].filter((entry) => appliesToEnvironment(entry, request.environment));
      const recycleItems = safetyPropertyGuidance.length
        ? [
            ...safetyPropertyGuidance,
            ...(["electronics", "special-handling"].includes(item?.category) && itemGuidance?.recycleOrDispose
              ? [itemGuidance.recycleOrDispose]
              : []),
          ]
        : recycleRule
          ? [
              { title: recycleRule.title, text: recycleRule.text },
              ...(!recycleRule.when.itemIds && itemGuidance?.recycleOrDispose
                ? [itemGuidance.recycleOrDispose]
                : []),
            ]
          : baseRecycleItems;
      const selectedRule = safetyPropertyGuidance.length ? null : recycleRule;

      const areaGuidance = request.areaId
        ? data.guidance.areas?.[request.areaId]
        : undefined;
      const localItemGuidance = request.itemId
        ? areaGuidance?.items?.[request.itemId]
        : undefined;
      const localMaterialIds = (!item || item.allowMaterialAreaGuidance === true) &&
        !request.propertyIds.some((id) => ["hazardous", "residue", "sharp-or-broken", "biodegradable", "compostable"].includes(id)) &&
        request.condition !== "contaminated"
        ? effectiveMaterialIds
        : [];
      const hasSpecificRecycleRule = Boolean(selectedRule?.when.itemIds || selectedRule?.when.condition);
      const localRecycleItems = (hasSpecificRecycleRule || safetyPropertyGuidance.length ? [] :
        localItemGuidance
          ? [localItemGuidance]
          : localMaterialIds
              .map((id) => areaGuidance?.materials?.[id])
              .filter(Boolean)
      ).filter((entry) => appliesToEnvironment(entry, request.environment));

      const recycleRoute = makeTextRoute(
        "Recycle or dispose",
        localRecycleItems.length ? localRecycleItems : recycleItems,
        "No guidance is available for this selection yet. Check your local authority's instructions.",
      );
      recycleRoute.nextStep = getDisposalStep({
        item,
        materialIds: effectiveMaterialIds,
        propertyIds: request.propertyIds,
        condition: request.condition,
        selectedRule,
      });
      if (selectedRule) recycleRoute.status = selectedRule.status;
      if (localRecycleItems.length) {
        recycleRoute.scope = selectedArea.scope;
        recycleRoute.localStatus = selectedArea.scope === "national"
          ? "national_guidance"
          : "available";
        recycleRoute.areaId = request.areaId;
        recycleRoute.areaName = areaName;
        recycleRoute.generalItems = recycleItems;
        recycleRoute.municipalDetailsVerified = selectedArea.scope !== "national";
        recycleRoute.message = selectedArea.scope === "national"
          ? `India-wide guidance. Check your city's collection rules.`
          : `Guidance for ${areaName}. Check local collection details.`;
      } else {
        recycleRoute.localStatus = request.areaId
          ? "unavailable"
          : (request.area ? "unsupported" : "not_selected");
        recycleRoute.message = request.areaId
          ? `We do not have collection details for ${areaName} and this item. Check with your local service.`
          : (request.area
              ? `We do not have collection details for ${areaName}. Check with your local service.`
              : "Check your local collection rules for the exact bin or drop-off point.");
      }
      if (selectedRule && !localRecycleItems.length) {
        recycleRoute.message = selectedRule.status === "need_more_information"
          ? "Add the missing detail for a clearer answer. Check your local collection rules."
          : "Check your local collection rules for the exact bin or drop-off point.";
      }

      const donationItem = item ?? (effectiveMaterialIds.length === 1
        ? catalog.byId.get(effectiveMaterialIds[0])
        : undefined);
      const labelIds = [...effectiveMaterialIds, ...request.propertyIds];

      return {
        item: {
          itemId: request.itemId || null,
          label: item?.label ?? labelIds.map((id) => catalog.byId.get(id).label).join(", "),
          materialIds: effectiveMaterialIds,
          propertyIds: request.propertyIds,
          condition: request.condition,
          conditionSource: "user_reported",
          recycleDetails: request.recycleDetails,
          environment: request.environment,
          areaId: request.areaId || null,
          area: searchArea || null,
        },
        routes: {
          reuse: makeTextRoute(
            "Reuse",
            reuseItems,
            "No reuse ideas are available for this selection yet.",
          ),
          recycle: recycleRoute,
          donation: buildDonationRoute({
            item: donationItem,
            condition: request.condition,
            area: searchArea,
            searchForDonation: request.searchForDonation,
          }),
        },
      };
    },
  };
}
