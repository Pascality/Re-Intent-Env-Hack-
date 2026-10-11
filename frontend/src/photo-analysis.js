// MobileNet predicts ImageNet object classes, not waste types. Keep mappings
// explicit and broad; the user confirms every suggestion before using it.
function mapClassToLabel(className) {
  const name = className.toLowerCase();

  if (/\btelevision\b/.test(name)) return "television";
  if (/\b(?:cellular telephone|mobile phone|smartphone)\b/.test(name)) return "mobile-phone";
  if (/\b(?:laptop|notebook computer|desktop computer)\b/.test(name)) return "laptop";
  if (/\b(?:computer mouse|mouse, computer mouse|mouse, computer)\b/.test(name)) return "computer-mouse";
  if (/\brefrigerator\b/.test(name)) return "refrigerator";
  if (/\bwashing machine\b/.test(name)) return "washing-machine";
  if (/\b(?:book|comic book|textbook)\b/.test(name)) return "books";
  if (/\b(?:coffee mug|cup)\b/.test(name)) return "cups";
  if (/\b(?:shoe|sneaker|running shoe|sandal)\b/.test(name)) return "shoes";
  if (/\b(?:water|beer|wine|pop|pill) bottle\b|\bbottle\b/.test(name)) return "bottles";
  if (/\bplastic\b/.test(name)) return "plastic";
  if (/\bcardboard\b/.test(name)) return "cardboard";
  if (/\bpaper\b/.test(name)) return "paper";
  if (/\b(?:suit|jean|jersey|sweatshirt|sock|shoe|skirt|coat|cloak|dress|gown|kimono|poncho|pajama|scarf|brassiere|diaper|handkerchief|garment)\b/.test(name)) {
    return "clothing";
  }
  if (/\b(?:computer|laptop|notebook|monitor|cellular telephone|mobile phone|remote control|radio|cassette player|cd player|microwave|refrigerator|washing machine|electric fan|toaster)\b/.test(name)) {
    return "electronics";
  }

  return null;
}

let modelPromise;
const SPECIFIC_ITEM_LABELS = new Set([
  "computer-mouse", "television", "mobile-phone", "laptop",
  "refrigerator", "washing-machine", "books", "shoes", "cups", "bottles",
]);
const MOBILENET_MODEL_URL = "https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json";

class PhotoAnalysisError extends Error {
  constructor(stage, cause) {
    super(`Photo analysis failed during ${stage}.`, { cause });
    this.name = "PhotoAnalysisError";
    this.stage = stage;
  }
}

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await Promise.all([
        import("@tensorflow/tfjs-backend-cpu"),
        import("@tensorflow/tfjs-backend-webgl"),
      ]);
      const [tf, mobilenet] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow-models/mobilenet"),
      ]);

      try {
        if (!(await tf.setBackend("webgl"))) await tf.setBackend("cpu");
      } catch {
        await tf.setBackend("cpu");
      }
      await tf.ready();
      return mobilenet.load({
        version: 2,
        alpha: 1.0,
        modelUrl: MOBILENET_MODEL_URL,
        inputRange: [-1, 1],
      });
    })().catch((error) => {
      modelPromise = undefined;
      throw error;
    });
  }
  return modelPromise;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This photo could not be read."));
    image.src = url;
  });
}

export async function analyzeImageDetailed(url) {
  let image;
  let model;
  try {
    image = await loadImage(url);
  } catch (error) {
    throw new PhotoAnalysisError("image", error);
  }
  try {
    model = await loadModel();
  } catch (error) {
    throw new PhotoAnalysisError("model", error);
  }
  try {
    const startedAt = performance.now();
    const predictions = await model.classify(image, 5);
    const suggestions = [];
    const seen = new Set();

    // Low-ranked guesses are shown as tentative choices, never applied directly.
    for (const [index, prediction] of predictions.entries()) {
      if (prediction.probability < 0.1) continue;
      const labelId = mapClassToLabel(prediction.className);
      if (!labelId || seen.has(labelId)) continue;
      if (index > 0 && !SPECIFIC_ITEM_LABELS.has(labelId)) continue;
      seen.add(labelId);
      suggestions.push({
        labelId,
        detectedAs: prediction.className,
        probability: prediction.probability,
        tentative: index > 0 || prediction.probability < 0.2,
      });
    }

    return {
      predictions: predictions.map(({ className, probability }) => ({ className, probability })),
      suggestions,
      inferenceMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    throw new PhotoAnalysisError("classification", error);
  }
}

export async function analyzeImage(url) {
  return (await analyzeImageDetailed(url)).suggestions;
}
