import { createApp } from "./app.js";
import { loadData } from "./data-store.js";

const port = Number(process.env.PORT ?? 3001);

try {
  // The development command watches both source and data files for changes.
  const data = await loadData();
  console.log(`Loaded ${data.catalog.labels.filter((label) => label.group === "item" && !label.hidden).length} visible item choices`);
  const app = createApp(data);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Re-Intent API listening on port ${port}`);
  });
} catch (error) {
  console.error("Failed to start Re-Intent API:", error);
  process.exitCode = 1;
}
