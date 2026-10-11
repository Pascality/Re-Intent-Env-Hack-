let modelPromise;

async function loadYolo() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { YOLO } = await import("@ultralytics/yolo");
      return YOLO.load("/models/yolo11n.onnx", {
        ortBaseUrl: `${window.location.origin}/ort/`,
      });
    })().catch((error) => {
      modelPromise = undefined;
      throw error;
    });
  }
  return modelPromise;
}

const YOLO_LABELS = {
  bottle: "bottles",
  cup: "cups",
  bowl: "bowls",
  "cell phone": "mobile-phone",
  laptop: "laptop",
  tv: "television",
  book: "books",
  refrigerator: "refrigerator",
  chair: "chairs",
  "dining table": "tables",
  backpack: "bag",
  handbag: "handbags",
  microwave: "small-appliance",
  umbrella: "umbrellas",
  vase: "vases",
  toothbrush: "toothbrushes",
  "sports ball": "sports-balls",
};

export async function analyzeWithYolo(file) {
  const model = await loadYolo();
  const startedAt = performance.now();
  const result = await model.predict(file, { conf: 0.25, iou: 0.7 });
  const detections = result.boxes
    .map(({ name, conf, x1, y1, x2, y2 }) => ({ name, confidence: conf, box: { x1, y1, x2, y2 } }))
    .sort((a, b) => b.confidence - a.confidence);
  const suggestions = [];
  const seen = new Set();
  for (const detection of detections) {
    if (detection.confidence < 0.5) continue;
    const labelId = YOLO_LABELS[detection.name];
    if (!labelId || seen.has(labelId)) continue;
    seen.add(labelId);
    suggestions.push({ labelId, detectedAs: detection.name, confidence: detection.confidence });
  }
  return {
    detections,
    suggestions,
    device: model.device,
    inferenceMs: Math.round(performance.now() - startedAt),
    modelSpeed: result.speed,
  };
}
