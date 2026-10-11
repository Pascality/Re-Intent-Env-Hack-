# Re-Intent photo model evaluation

## Local experiment: 10 October 2026

Inputs: a pump sanitizer bottle photo and a wireless computer mouse photo. The sample images have since been removed from the project. The COCO and SUHAN ONNX models used headless Edge on CPU and the application's `@ultralytics/yolo` browser runtime. ProjectVerba used a local Python runtime. Scores and timings across these runtimes are not directly comparable. These are two examples, not a representative accuracy benchmark.

| Model | Detection cutoff | Bottle photo | Mouse photo |
| --- | ---: | --- | --- |
| Current COCO YOLO11n | 0.25 | toothbrush 0.268 | cup 0.301 |
| [SUHAN-I waste YOLO11n](https://huggingface.co/SUHAN-I/YOLO11) | 0.25 | no detection | no detection |
| SUHAN-I waste YOLO11n | 0.10 | no detection | no detection |
| [ProjectVerba waste detector](https://universe.roboflow.com/projectverba/yolo-waste-detection) | 0.25 | Cardboard 0.686 | Plastic cup 0.613; Aluminum can 0.431; Cardboard 0.252 |
| ProjectVerba waste detector | 0.10 | Cardboard 0.686 | Same three, plus Container for household chemicals 0.130 |

The SUHAN model loaded and ran locally, but it did not recognize either example. Its published classes are cardboard, glass, metal, paper, plastic, and general trash; there is no computer-mouse class. The bottle result is still disappointing because the photo shows a plastic bottle, but this sample alone cannot establish why the model missed it. Raw detection scores are model outputs, not calibrated accuracy estimates. The existing YOLO model also made false detections on these particular files. We should not replace the current photo flow with SUHAN on this evidence.

## ProjectVerba local run

[ProjectVerba's Universe model](https://universe.roboflow.com/projectverba/yolo-waste-detection) lists 42 classes, including plastic bottle, containers for household chemicals, and electronics. Its class list fits Re-Intent more closely than SUHAN's, but it does not have a computer-mouse class. We ran it with Roboflow's [local Python Inference Library](https://docs.roboflow.com/deployment/self-hosted/inference-library), using the private key from the ignored `backend/.env` only to retrieve the model. The images were passed as local paths to `model.infer()`; no hosted image-inference API was used. The first `get_model()` call took about 9.9 seconds, including model retrieval/loading, and warm local inferences took about 23–47 ms on this computer. Those timings are not phone or hosting benchmarks.

ProjectVerba misclassified both original photos at the default 0.25 detection cutoff. Lowering the cutoff to 0.10 did not reveal the expected bottle or mouse label. Its mouse result gained an additional incorrect container prediction. These two examples do not establish general accuracy, but they do not support replacing the current model flow with ProjectVerba.

## Expanded local run: nine photos

The expanded local run used nine photos, now removed from the project. We inspected them visually and used their filenames as the expected items. All images were taken in a similar room with a person holding the item, so the sample is still small and biased. The two earlier bottle and mouse files were included. MobileNet V2, COCO YOLO11n, and SUHAN ran in headless Edge using the current browser code on CPU. ProjectVerba ran with the local Python Inference Library. YOLO detections and ProjectVerba detections below 0.25 are omitted here. The table shows each model's leading object or material guess; `none` means no detection above 0.25. For MobileNet, the listed class is its highest-ranked ImageNet prediction, not necessarily an app suggestion.

| Photo / expected item | MobileNet V2 top class | COCO YOLO11n relevant output | SUHAN | ProjectVerba top class |
| --- | --- | --- | --- | --- |
| `book.jpg` / book | window shade 0.227 | book 0.450, plus person 0.834 | none | Cardboard 0.433 |
| `cloth handkerchief.jpg` / cloth | theater curtain 0.437 | none | none | Cardboard 0.692 |
| `cushion.jpg` / cushion | window shade 0.205 | person 0.798; no cushion | none | Printing industry 0.567 |
| `glass container.jpg` / dark glass container | window shade 0.327 | cell phone 0.623; false app suggestion | none | Glass bottle 0.591 |
| `glass jar.jpg` / glass jar | vacuum cleaner 0.685 | vase 0.260; no jar | none | Tin 0.385 |
| `laptop charger.jpg` / charger | vacuum cleaner 0.215 | person 0.361; no charger | none | Cardboard 0.784 |
| `mouse.png` / wireless mouse | loudspeaker 0.221 | cup 0.301 | none | Plastic cup 0.613 |
| `plastic bottle.jpg` / plastic bottle | window shade 0.426 | person 0.730; no bottle | none | Aluminum can 0.555 |
| `plastic bottle.png` / pump bottle | espresso maker 0.182 | toothbrush 0.268 | none | Cardboard 0.686 |

At the current app thresholds, MobileNet produced no supported label suggestions from these nine files. COCO YOLO11n detected the book at 0.450, but the app requires 0.500 before offering a suggestion; it also incorrectly offered `mobile-phone` for the dark glass container. SUHAN returned no detections above 0.25 for any file. ProjectVerba's glass-bottle result for the dark glass container was useful, but most of its leading guesses were wrong; `Cardboard` for the book is related to a possible cover material, not an item identification. These are observed results for this set, not general accuracy estimates. The browser run used a headless desktop CPU; phone performance may differ.

### Current decision for the app

| Model | Useful label suggestions under current app rules | Incorrect label suggestions | Decision |
| --- | ---: | ---: | --- |
| MobileNet V2 | 0 of 9 | 0 of 9 | Keep as one optional source of suggestions; it recognized a mouse in an earlier user-run photo, so results vary by framing. |
| COCO YOLO11n | 0 of 9 | 1 of 9 | Keep as a second optional source; it recognized the book only as a raw detection below the suggestion threshold. |
| SUHAN waste YOLO11n | 0 of 9 detections above 0.25 | 0 of 9 | Do not add to the app now. |
| ProjectVerba waste detector | No app mapping implemented | No app mapping implemented | Do not add to the app now. One of nine leading predictions was useful at a broad level, while most others were wrong; it also requires a different local runtime and private model access. |

This is a **trial pair**, chosen because MobileNet and COCO YOLO11n already run in the browser and cover different object classes. It is not a claim that they are accurate on general user photos. On photo selection, both run concurrently. The page shows each model's status and optional label suggestions, without exposing raw guesses or scores. Neither chooses a label automatically; the user can ignore both and select a catalogue label manually. We should revisit the pair after testing more varied photos on an actual phone. Do not lower the global YOLO suggestion threshold to capture the book: this sample already contains a high-scoring false cell-phone suggestion.

## Next comparison

Keep manual selection and confirmation as the dependable path. None of these models earned a replacement decision from this sample. The next comparison should use a new labeled set with varied backgrounds and lighting, more examples per class, metal and organic items, and unsupported objects. Record useful suggestions, false suggestions, no-result rate, first-load cost, and inference latency on a representative phone. The broad waste models tested here do not identify a computer mouse by name; adding server inference would not fix that class limitation. The old local benchmark environment and sample images have been removed.
