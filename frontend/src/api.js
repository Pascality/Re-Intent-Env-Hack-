async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("Could not connect to Re-Intent. Check your connection and try again.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Re-Intent returned an unexpected response (HTTP ${response.status}). Please try again shortly.`,
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Re-Intent returned an unreadable response. Please try again shortly.");
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Something went wrong. Please try again.");
  }

  return data;
}

export async function loadOptions() {
  const [catalog, areas] = await Promise.all([
    requestJson("/api/v1/catalog", { cache: "no-store" }),
    requestJson("/api/v1/areas"),
  ]);
  return { labels: catalog.items, areas: areas.areas };
}

export function getRecommendations(input) {
  return requestJson("/api/v1/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
