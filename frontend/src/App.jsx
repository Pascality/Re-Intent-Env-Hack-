import { useEffect, useMemo, useRef, useState } from "react";
import { getRecommendations, loadOptions } from "./api.js";
import { analyzeImageDetailed } from "./photo-analysis.js";
import { analyzeWithYolo } from "./yolo-analysis.js";

const GROUPS = [
  { id: "item", label: "Items" },
  { id: "material", label: "Materials" },
  { id: "waste_stream", label: "Waste types" },
  { id: "property", label: "Properties" },
];

const ITEM_CATEGORIES = [
  { id: "packaging", label: "Packaging and containers" },
  { id: "electronics", label: "Electronics and appliances" },
  { id: "organic", label: "Food and garden" },
  { id: "paper-cardboard", label: "Paper and cardboard" },
  { id: "clothing-textiles", label: "Clothing and textiles" },
  { id: "furniture-household", label: "Furniture and household items" },
  { id: "toys-children", label: "Toys and children's items" },
  { id: "vehicles-mechanical", label: "Vehicles and mechanical items" },
  { id: "construction-repair", label: "Construction and home repair" },
  { id: "office-school", label: "Stationary supplies" },
  { id: "food-kitchen", label: "Food and kitchen items" },
  { id: "special-handling", label: "Special handling" },
  { id: "other", label: "Other items" },
];

const CONDITIONS = [
  ["unknown", "I'm not sure"],
  ["working", "Working"],
  ["usable", "Usable"],
  ["repairable", "Could be repaired"],
  ["damaged", "Damaged"],
  ["contaminated", "Contaminated"],
];

const ENVIRONMENTS = [
  ["home", "Home"],
  ["workplace", "Workplace"],
  ["outdoors", "Outdoors"],
];

const STATUS_LABELS = {
  available: "Guidance available",
  no_guidance: "No guidance yet",
  consider: "Consider donating",
  probably_not_suitable: "Probably not suitable",
  need_more_information: "More information needed",
};

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const SPECIFIC_METALS = new Set(["iron-steel", "aluminium", "copper", "brass"]);

function labelSection(label) {
  return label.group === "material" && label.kind === "waste_stream"
    ? "waste_stream"
    : label.group;
}

function updateMaterialSelection(current, id, toggle) {
  if (toggle && current.includes(id)) return current.filter((entry) => entry !== id);
  if (current.includes(id)) return current;
  const withoutBroadMetal = SPECIFIC_METALS.has(id)
    ? current.filter((entry) => entry !== "metal")
    : current;
  const withoutSpecificMetals = id === "metal"
    ? withoutBroadMetal.filter((entry) => !SPECIFIC_METALS.has(entry))
    : withoutBroadMetal;
  return [...withoutSpecificMetals, id];
}

function updatePropertySelection(current, id, toggle) {
  if (toggle && current.includes(id)) return current.filter((entry) => entry !== id);
  if (current.includes(id)) return current;
  const compatible = id === "non-biodegradable"
    ? current.filter((entry) => !["biodegradable", "compostable"].includes(entry))
    : ["biodegradable", "compostable"].includes(id)
      ? current.filter((entry) => entry !== "non-biodegradable")
      : current;
  return [...compatible, id];
}

function GuidanceItems({ items }) {
  if (!items?.length) return null;

  return (
    <ul className="guidance-list">
      {items.map((entry, index) => (
        <li key={`${entry.title}-${index}`}>
          <strong>{entry.title}</strong>
          <p>{entry.text}</p>
          {entry.sources?.length > 0 && (
            <div className="source-list">
              <span>Sources:</span>{" "}
              {entry.sources.map((source, sourceIndex) => (
                <span key={`${source.url}-${sourceIndex}`}>
                  {sourceIndex > 0 && " · "}
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                  {source.reviewedAt && ` (reviewed ${source.reviewedAt})`}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function RouteCard({ route, kind }) {
  if (!route) return null;

  return (
    <section className={`route-card route-${kind}`} aria-labelledby={`${kind}-heading`}>
      <div className="route-heading">
        <span className="route-icon" aria-hidden="true">{kind === "reuse" ? "↺" : kind === "recycle" ? "♻" : "♡"}</span>
        <h3 id={`${kind}-heading`}>{route.title}</h3>
        <span className="status-badge">{STATUS_LABELS[route.status] || route.status}</span>
      </div>
      {kind === "recycle" && route.nextStep && (
        <p className="recycle-next-step"><strong>Do this:</strong> {route.nextStep}</p>
      )}
      {route.message && <p className="route-message">{route.message}</p>}
      <GuidanceItems items={route.items} />
      {route.generalItems?.length > 0 && (
        <details className="general-guidance">
          <summary>General guidance for this item</summary>
          <GuidanceItems items={route.generalItems} />
        </details>
      )}
      {kind === "donation" && route.status === "consider" && route.search && (
        <div className="route-action">
          <a href={route.search.url} target="_blank" rel="noopener noreferrer">
            {route.search.label} ↗
          </a>
          <p>{route.search.note}</p>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const uploadInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [mobileNetResult, setMobileNetResult] = useState(null);
  const [yoloResult, setYoloResult] = useState(null);
  const [yoloError, setYoloError] = useState("");
  const [yoloAnalyzing, setYoloAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisAttempt, setAnalysisAttempt] = useState(0);
  const analysisVersion = useRef(0);
  const [labels, setLabels] = useState([]);
  const [areas, setAreas] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const [itemId, setItemId] = useState("");
  const [materialIds, setMaterialIds] = useState([]);
  const [propertyIds, setPropertyIds] = useState([]);
  const [condition, setCondition] = useState("unknown");
  const [cupLining, setCupLining] = useState("unknown");
  const [environment, setEnvironment] = useState("home");
  const [areaId, setAreaId] = useState("");
  const [city, setCity] = useState("");

  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const requestVersion = useRef(0);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!cameraOpen) return undefined;

    let active = true;
    setCameraReady(false);
    setCameraError("");

    async function startCamera() {
      if (!window.isSecureContext) {
        setCameraError("Camera access requires HTTPS or localhost. Upload a photo instead, or open Re-Intent over a secure connection.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser does not support camera access. Upload a photo instead.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        if (!active) return;
        const message = error.name === "NotAllowedError"
          ? "Camera permission was blocked. Allow camera access in your browser settings, or upload a photo instead."
          : error.name === "NotFoundError"
            ? "No camera was found on this device. Upload a photo instead."
            : "The camera could not be started. Upload a photo instead.";
        setCameraError(message);
      }
    }

    startCamera();
    return () => {
      active = false;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      if (photo?.url) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  useEffect(() => {
    const version = ++analysisVersion.current;
    if (!photo) {
      setSuggestions([]);
      setMobileNetResult(null);
      setYoloResult(null);
      setYoloError("");
      setYoloAnalyzing(false);
      setAnalysisError("");
      setAnalyzing(false);
      return;
    }

    let active = true;
    setSuggestions([]);
    setMobileNetResult(null);
    setYoloResult(null);
    setYoloError("");
    setYoloAnalyzing(true);
    setAnalysisError("");
    setAnalyzing(true);
    analyzeImageDetailed(photo.url)
      .then((analysis) => {
        if (active && version === analysisVersion.current) {
          setMobileNetResult(analysis);
          setSuggestions(analysis.suggestions);
        }
      })
      .catch((error) => {
        if (active && version === analysisVersion.current) {
          console.error("Re-Intent photo analysis failed to load or run:", error);
          const messages = {
            image: "This photo could not be read. Try another photo or choose labels manually.",
            model: "MobileNet could not load. Check your connection and try again, or choose labels manually.",
            classification: "MobileNet loaded but could not analyze this image. Try another photo or choose labels manually.",
          };
          setAnalysisError(messages[error.stage] ?? "Photo analysis failed. Try again or choose labels manually.");
        }
      })
      .finally(() => {
        if (active && version === analysisVersion.current) setAnalyzing(false);
      });
    analyzeWithYolo(photo.file)
      .then((analysis) => {
        if (active && version === analysisVersion.current) setYoloResult(analysis);
      })
      .catch((error) => {
        if (active && version === analysisVersion.current) {
          console.error("YOLO11 photo analysis failed:", error);
          setYoloError("YOLO11 could not analyze this photo. Choose labels manually or retry both models.");
        }
      })
      .finally(() => {
        if (active && version === analysisVersion.current) setYoloAnalyzing(false);
      });
    return () => { active = false; };
  }, [photo, analysisAttempt]);

  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  useEffect(() => {
    let active = true;
    loadOptions()
      .then((options) => {
        if (!active) return;
        setLabels(options.labels);
        setAreas(options.areas);
        setAreaId((current) => current || options.areas[0]?.id || "");
        setOptionsError("");
      })
      .catch((error) => {
        if (active) setOptionsError(error.message);
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });
    return () => { active = false; };
  }, [reloadCount]);

  const selectedItem = labels.find((label) => label.id === itemId);
  const showCupLining = itemId === "cups" && materialIds.includes("paper") &&
    condition !== "contaminated";
  const hasSelection = Boolean(itemId || materialIds.length || propertyIds.length);
  const outdatedCatalog = labels.some((label) => label.group === "item" && !label.category);
  const mobileNetSuggestions = suggestions.filter((suggestion) =>
    labels.some((label) => label.id === suggestion.labelId));
  const yoloSuggestions = (yoloResult?.suggestions ?? []).filter((suggestion) =>
    labels.some((label) => label.id === suggestion.labelId));
  const photoAnalysisComplete = Boolean(photo && !analyzing && !yoloAnalyzing
    && (mobileNetResult || analysisError) && (yoloResult || yoloError));

  const visibleLabels = useMemo(() => {
    const search = query.trim().toLowerCase();
    return labels.filter((label) => {
      if (labelSection(label) !== "item" || !search) return true;
      return [label.label, ...(label.synonyms || [])]
        .some((value) => value.toLowerCase().includes(search));
    });
  }, [labels, query]);

  function clearResult() {
    requestVersion.current += 1;
    setResult(null);
    setSubmitError("");
    setSubmitting(false);
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoFile(file);
  }

  function setPhotoFile(file) {
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }
    if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Choose an image smaller than 15 MB.");
      return;
    }

    preparePhotoAnalysis();
    setPhoto({ file, url: URL.createObjectURL(file) });
    setPhotoError("");
    clearResult();
  }

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("The camera photo could not be captured. Please try again.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("The camera photo could not be captured. Please try again.");
        return;
      }
      setPhotoFile(new File([blob], `re-intent-${Date.now()}.jpg`, { type: "image/jpeg" }));
      closeCamera();
    }, "image/jpeg", 0.9);
  }

  function removePhoto() {
    analysisVersion.current += 1;
    setPhoto(null);
    setPhotoError("");
    clearResult();
  }

  function preparePhotoAnalysis() {
    analysisVersion.current += 1;
    setSuggestions([]);
    setMobileNetResult(null);
    setYoloResult(null);
    setYoloError("");
    setAnalysisError("");
    setAnalyzing(true);
    setYoloAnalyzing(true);
  }

  function retryPhotoAnalysis() {
    if (!photo) return;
    preparePhotoAnalysis();
    setAnalysisAttempt((count) => count + 1);
  }

  function chooseLabel(label) {
    clearResult();
    if (label.group === "item") {
      setItemId((current) => current === label.id ? "" : label.id);
      setCupLining("unknown");
    } else if (label.group === "material") {
      setMaterialIds((current) => updateMaterialSelection(current, label.id, true));
    } else {
      setPropertyIds((current) => updatePropertySelection(current, label.id, true));
    }
  }

  function applySuggestion(label) {
    clearResult();
    setQuery("");
    if (label.group === "item") {
      setItemId(label.id);
      setCupLining("unknown");
      setOpenCategories((current) => new Set(current).add(label.category ?? "other"));
    } else if (label.group === "material") {
      setMaterialIds((current) => updateMaterialSelection(current, label.id, false));
    } else {
      setPropertyIds((current) => updatePropertySelection(current, label.id, false));
    }
  }

  function isSelected(label) {
    if (label.group === "item") return itemId === label.id;
    if (label.group === "material") return materialIds.includes(label.id);
    return propertyIds.includes(label.id);
  }

  function labelButton(label) {
    return (
      <button
        key={label.id}
        type="button"
        className={isSelected(label) ? "label-chip selected" : "label-chip"}
        aria-pressed={isSelected(label)}
        onClick={() => chooseLabel(label)}
      >
        {isSelected(label) && <span aria-hidden="true">✓ </span>}
        {label.label}
      </button>
    );
  }

  async function submit(event) {
    event.preventDefault();
    const version = ++requestVersion.current;
    setSubmitError("");
    setResult(null);
    if (!hasSelection) {
      setSubmitError("Choose an item or at least one label to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const recommendation = await getRecommendations({
        ...(itemId ? { itemId } : {}),
        materialIds,
        propertyIds,
        condition,
        recycleDetails: {
          lining: showCupLining ? cupLining : "unknown",
        },
        environment,
        ...(areaId ? { areaId } : {}),
        area: city.trim(),
        searchForDonation: true,
      });
      if (version === requestVersion.current) setResult(recommendation);
    } catch (error) {
      if (version === requestVersion.current) setSubmitError(error.message);
    } finally {
      if (version === requestVersion.current) setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Re-Intent home">
            <img src="/re-intent-logo.png" alt="" />
            <span>Re-<em>Intent</em></span>
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#labels-heading">Browse items</a>
            <a href="#start">Start here</a>
          </nav>
          <a className="header-cta" href="#photo-heading">Try Re-Intent <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> A SECOND LIFE STARTS HERE</p>
            <h1 id="hero-heading">Scan an item. <span>See what’s next.</span></h1>
            <p className="hero-lede">That old bottle, worn shirt, or unused gadget might have a better next step. Add a photo or choose an item, then explore ways to reuse, recycle, or donate it.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#photo-heading">Get started <span aria-hidden="true">↗</span></a>
              <a className="hero-link" href="#how-it-works">See how it works <span aria-hidden="true">↘</span></a>
            </div>
            <p className="hero-note"><span aria-hidden="true">✳</span> Your photo stays in this browser</p>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-scan">
              <span className="scan-corner top-left" /><span className="scan-corner top-right" /><span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" />
              <span className="visual-kicker">A LITTLE CURIOSITY GOES A LONG WAY</span>
              <svg className="jar" viewBox="0 0 200 260">
                <rect className="lid" x="58" y="12" width="84" height="26" rx="7" />
                <path className="body" d="M70 38h60v14c0 6 26 10 26 34v110c0 18-12 30-30 30H74c-18 0-30-12-30-30V86c0-24 26-28 26-34z" />
                <rect className="label" x="62" y="104" width="76" height="70" rx="8" />
                <line className="ln" x1="74" y1="124" x2="126" y2="124" />
                <line className="ln" x1="74" y1="140" x2="116" y2="140" />
                <line className="ln" x1="74" y1="156" x2="122" y2="156" />
                <line className="shine" x1="56" y1="96" x2="56" y2="190" />
              </svg>
              <span className="visual-tag visual-tag-one">One item</span>
              <span className="visual-tag visual-tag-two">More possibilities ✳</span>
              <span className="scan-line" />
            </div>
            <div className="visual-caption"><span className="caption-pulse" /> SMALL CHOICES. BIG DIFFERENCE.</div>
          </div>
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-heading">
          <div className="how-topline"><span>01 / THE IDEA</span><span>LESS WASTE, MORE POSSIBILITIES</span></div>
          <div className="how-intro">
            <h2 id="how-heading">One item. <span>Three ways forward.</span></h2>
            <p>Start with a photo or pick labels yourself. You decide which suggestions fit, and we’ll show practical routes based on your choices.</p>
          </div>
          <div className="ways-grid">
            <div className="way-card"><span className="way-symbol" aria-hidden="true">↺</span><span className="way-index">01</span><h3>Reuse</h3><p>Find a new purpose for something you already have.</p></div>
            <div className="way-card"><span className="way-symbol" aria-hidden="true">♻</span><span className="way-index">02</span><h3>Recycle</h3><p>Learn how to sort or dispose of it more responsibly.</p></div>
            <div className="way-card"><span className="way-symbol" aria-hidden="true">♡</span><span className="way-index">03</span><h3>Donate</h3><p>For usable items, explore a nearby place to ask about giving.</p></div>
          </div>
        </section>

        <div className="workflow-intro" id="start">
          <span className="section-index">02 / LET’S BEGIN</span>
          <h2>What do you have?</h2>
          <p>Tell us a little about your item. A photo helps, but you can always choose the labels yourself.</p>
        </div>

        <section className="panel" aria-labelledby="photo-heading">
          <div className="section-heading">
            <span className="step-number">1</span>
            <div>
              <h2 id="photo-heading">Add a photo <span className="optional">(optional)</span></h2>
              <p>Take a photo or choose one from your device. Suggested labels are optional; you can continue without a photo.</p>
            </div>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={choosePhoto}
            aria-label="Choose an item photo from your device"
          />

          <div className="photo-actions">
            <button className="secondary-button" type="button" onClick={() => setCameraOpen(true)}>
              Take photo
            </button>
            <button className="secondary-button" type="button" onClick={() => uploadInputRef.current?.click()}>
              Upload photo
            </button>
            {photo && <button className="text-button" type="button" onClick={removePhoto}>Remove photo</button>}
          </div>

          {cameraOpen && (
            <section className="camera-panel" aria-labelledby="camera-heading">
              <div className="camera-panel-heading">
                <h3 id="camera-heading">Camera</h3>
                <button className="text-button" type="button" onClick={closeCamera}>Close camera</button>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={() => setCameraReady(true)}
                aria-label="Live camera preview"
              />
              {cameraError && <p className="form-error" role="alert">{cameraError}</p>}
              {cameraReady && !cameraError && (
                <div className="camera-actions">
                  <button className="primary-button" type="button" onClick={capturePhoto}>Capture photo</button>
                  <button className="secondary-button" type="button" onClick={closeCamera}>Cancel</button>
                </div>
              )}
            </section>
          )}

          {photo && (
            <div className="photo-preview">
              <img
                src={photo.url}
                alt="Preview of the selected item"
                onError={() => {
                  setPhoto(null);
                  setPhotoError("This image could not be previewed. Try a different photo or continue with labels.");
                }}
              />
              <p>{photo.file.name}</p>
            </div>
          )}
          {photoError && <p className="form-error photo-error" role="alert">{photoError}</p>}
          {photo && (
            <div className="model-comparison">
              <h3>Photo label suggestions</h3>
              <p>Both models check your photo. Tap any label that fits, or choose your own below.</p>
              <button className="secondary-button" type="button" onClick={retryPhotoAnalysis} disabled={analyzing || yoloAnalyzing}>
                {analyzing || yoloAnalyzing ? "Analyzing…" : "Try photo analysis again"}
              </button>
              <div className="comparison-grid">
                <div>
                  <strong>MobileNet V2</strong>
                  <p className="model-status" role="status">
                    {mobileNetResult ? "Done" : analyzing ? "Analyzing photo…" : analysisError ? "Couldn't finish" : "Starting…"}
                  </p>
                  {analysisError && <p>{analysisError}</p>}
                  {mobileNetSuggestions.length > 0 && (
                    <div className="model-suggestions">
                      <span>Suggested labels</span>
                      <div className="chip-row">
                        {mobileNetSuggestions.map((suggestion) => {
                          const label = labels.find((entry) => entry.id === suggestion.labelId);
                          const selected = isSelected(label);
                          return (
                            <button key={suggestion.labelId} className="label-chip suggestion-chip" type="button" disabled={selected} onClick={() => applySuggestion(label)}>
                              <strong>{label.label}{selected ? " (selected)" : ""}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {mobileNetResult && !optionsLoading && !optionsError && mobileNetSuggestions.length === 0 && <p>No label suggestion this time.</p>}
                </div>
                <div>
                  <strong>YOLO11 nano</strong>
                  <p className="model-status" role="status">
                    {yoloResult ? "Done" : yoloAnalyzing ? "Analyzing photo…" : yoloError ? "Couldn't finish" : "Starting…"}
                  </p>
                  {yoloError && <p>{yoloError}</p>}
                  {yoloSuggestions.length > 0 && (
                    <div className="model-suggestions">
                      <span>Suggested labels</span>
                      <div className="chip-row">
                        {yoloSuggestions.map((suggestion) => {
                          const label = labels.find((entry) => entry.id === suggestion.labelId);
                          const selected = isSelected(label);
                          return (
                            <button key={suggestion.labelId} className="label-chip suggestion-chip" type="button" disabled={selected} onClick={() => applySuggestion(label)}>
                              <strong>{label.label}{selected ? " (selected)" : ""}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {yoloResult && !optionsLoading && !optionsError && yoloSuggestions.length === 0 && <p>No label suggestion this time.</p>}
                </div>
              </div>
              {photoAnalysisComplete && !optionsLoading && !optionsError && (
                <p className="analysis-notice" role="status">
                  {mobileNetSuggestions.length > 0 || yoloSuggestions.length > 0
                    ? "Nice start! Feel free to add any other labels that fit below. The right details help us tailor your reuse, recycling, and donation options. "
                    : mobileNetResult || yoloResult
                      ? "No clear label match this time—no worries! You can still tell us what you have. "
                      : "Photo analysis wasn't available this time—no worries! You can still tell us what you have. "}
                  <a href="#labels-heading">Browse or search labels</a> to continue.
                </p>
              )}
            </div>
          )}
          <p className="muted small">Your photo is analyzed in this browser and is not sent to our backend. Choose or correct labels before getting recommendations.</p>
        </section>

        {optionsLoading && <p className="notice" role="status">Loading item choices…</p>}
        {optionsError && (
          <div className="notice error" role="alert">
            <p>{optionsError}</p>
            <button type="button" onClick={() => { setOptionsLoading(true); setReloadCount((count) => count + 1); }}>
              Try again
            </button>
          </div>
        )}
        {!optionsLoading && !optionsError && outdatedCatalog && (
          <p className="notice" role="status">
            The backend is serving an older catalogue. Restart the backend and reload this page to see the new options. Existing items are shown below in the meantime.
          </p>
        )}

        {!optionsLoading && !optionsError && (
          <form onSubmit={submit}>
            <section className="panel" aria-labelledby="labels-heading">
              <div className="section-heading">
                <span className="step-number">2</span>
                <div>
                  <h2 id="labels-heading">Choose labels</h2>
                  <p>Select one item and any extra material or property labels you know. Browse categories or search for a specific item.</p>
                </div>
              </div>

              <label className="field-label" htmlFor="catalog-search">Search items</label>
              <input
                id="catalog-search"
                type="search"
                value={query}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setQuery(nextQuery);
                  const search = nextQuery.trim().toLowerCase();
                  if (!search) {
                    setOpenCategories(new Set());
                    return;
                  }
                  const matchingCategories = labels
                    .filter((label) => labelSection(label) === "item"
                      && [label.label, ...(label.synonyms || [])]
                        .some((value) => value.toLowerCase().includes(search)))
                    .map((label) => label.category ?? "other");
                  setOpenCategories(new Set(matchingCategories));
                }}
                placeholder="Try TV, bottle, monitor…"
                autoComplete="off"
              />

              <div className="label-list">
                {GROUPS.map((section) => {
                  const entries = visibleLabels.filter((label) => labelSection(label) === section.id);
                  if (!entries.length && section.id === "item" && query.trim()) {
                    return (
                      <div className="label-group" key={section.id}>
                        <h3>Items</h3>
                        <p className="muted">No matching item found. You can still choose materials, waste types, or properties below.</p>
                      </div>
                    );
                  }
                  if (!entries.length) return null;
                  return (
                    <div className="label-group" key={section.id}>
                      <h3>{section.label}</h3>
                      {section.id === "material" && <p className="label-group-hint">Select the materials you know. Use “Metal (type unknown)” only if you cannot identify the metal.</p>}
                      {section.id === "waste_stream" && <p className="label-group-hint">Use a waste type when the exact material is unclear.</p>}
                      {section.id === "property" && <p className="label-group-hint">Choose only properties you know. A compostable label is more specific than “biodegradable.”</p>}
                      {section.id === "item" ? ITEM_CATEGORIES.map((category) => {
                        const categoryEntries = entries.filter((label) =>
                          (ITEM_CATEGORIES.some((entry) => entry.id === label.category) ? label.category : "other") === category.id,
                        );
                        if (!categoryEntries.length) return null;
                        const chosen = categoryEntries.find((label) => label.id === itemId);
                        return (
                          <details
                            className="item-category"
                            key={category.id}
                            open={openCategories.has(category.id)}
                            onToggle={(event) => {
                              const isOpen = event.currentTarget.open;
                              setOpenCategories((current) => {
                                if (current.has(category.id) === isOpen) return current;
                                const next = new Set(current);
                                if (isOpen) next.add(category.id);
                                else next.delete(category.id);
                                return next;
                              });
                            }}
                          >
                        <summary>{category.label}{chosen && <span>Selected: {chosen.label}</span>}</summary>
                            <div className="chip-row">{categoryEntries.map(labelButton)}</div>
                          </details>
                        );
                      }) : <div className="chip-row">{entries.map(labelButton)}</div>}
                    </div>
                  );
                })}
              </div>

              <div className="selection-summary" aria-live="polite">
                <strong>Selected:</strong>{" "}
                {hasSelection
                  ? [selectedItem?.label, ...labels.filter((label) =>
                      materialIds.includes(label.id) || propertyIds.includes(label.id),
                    ).map((label) => label.label)].filter(Boolean).join(" · ")
                  : "Nothing yet"}
              </div>
            </section>

            <section className="panel" aria-labelledby="details-heading">
              <div className="section-heading">
                <span className="step-number">3</span>
                <div>
                  <h2 id="details-heading">Add a few details</h2>
                  <p>These answers help us choose the right routes. The condition is based on what you report.</p>
                </div>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label htmlFor="condition">Condition</label>
                  <select id="condition" value={condition} onChange={(event) => { setCondition(event.target.value); clearResult(); }}>
                    {CONDITIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </div>
                {showCupLining && (
                  <div className="field">
                    <label htmlFor="cup-lining">Does the cup have a shiny or waterproof lining?</label>
                    <select id="cup-lining" value={cupLining} onChange={(event) => { setCupLining(event.target.value); clearResult(); }}>
                      <option value="unknown">I'm not sure</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="environment">Where is it?</label>
                  <select id="environment" value={environment} onChange={(event) => { setEnvironment(event.target.value); clearResult(); }}>
                    {ENVIRONMENTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="area">Guidance area</label>
                  <select id="area" value={areaId} onChange={(event) => { setAreaId(event.target.value); clearResult(); }}>
                    <option value="">General guidance only</option>
                    {areas.map((area) => <option value={area.id} key={area.id}>{area.name} ({area.scope})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="city">City for nearby search <span className="optional">(optional)</span></label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(event) => { setCity(event.target.value); clearResult(); }}
                    maxLength={120}
                    placeholder="e.g. Pune"
                    autoComplete="address-level2"
                  />
                </div>
              </div>
              <p className="muted small">India guidance is national. City collection services and donation acceptance must be confirmed locally.</p>
            </section>

            <div className="submit-row">
              <button className="primary-button" type="submit" disabled={!hasSelection || submitting}>
                {submitting ? "Finding options…" : "Get recommendations"}
              </button>
              {submitError && <p className="form-error" role="alert">{submitError}</p>}
            </div>
          </form>
        )}

        {result && (
          <section ref={resultsRef} className="results" aria-labelledby="results-heading" aria-live="polite">
            <div className="section-heading results-heading">
              <span className="step-number">4</span>
              <div>
                <h2 id="results-heading">Options for {result.item.label}</h2>
                <p>Based on the details you selected. Review each route and choose what works for you.</p>
              </div>
            </div>
            <div className="route-grid">
              <RouteCard kind="reuse" route={result.routes.reuse} />
              <RouteCard kind="recycle" route={result.routes.recycle} />
              <RouteCard kind="donation" route={result.routes.donation} />
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span><strong>Re-Intent</strong> · Give everyday items another chance.</span>
        <span>
          Guidance varies by item and local collection rules. {" "}
          <a href="https://github.com/Pascality/Re-Intent-Env-Hack-" target="_blank" rel="noopener noreferrer">
            Source code and license
          </a>
        </span>
      </footer>
    </div>
  );
}
