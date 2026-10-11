# Re-Intent frontend

The phone-friendly React interface lets users take or upload a photo, choose an item and material labels, report condition and environment, and review reuse, recycling or disposal, and donation guidance.

Photos are optional. They stay in the browser and are not sent to the backend or saved by Re-Intent. The upload picker accepts images up to 15 MB. Live camera access requires HTTPS on a hosted site or localhost during development. If the camera is unavailable, users can upload a photo or select labels manually.

When a photo is added, **MobileNet V2 and YOLO11 nano run concurrently in the browser**. The page shows each model's running or completed state and any mapped catalogue suggestions. It does not automatically select a label or show raw scores to the user. The user chooses which suggestions fit and can change or add labels before requesting guidance.

MobileNet downloads its weights from [TensorFlow's public model archive](https://github.com/tensorflow/tfjs-models/blob/master/mobilenet/README.md) on first use, so that model requires network access. YOLO11's ONNX weights are served from `public/models/`, and the [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) files are copied from the installed package to `public/ort/` by `scripts/copy-ort-assets.mjs` before development or build. The YOLO11 model and `@ultralytics/yolo` package use AGPL-3.0; see the repository root `LICENSE` file. Both models recognize only some object classes and cannot determine contamination, working condition, or donation acceptance.

## Development

Run `npm ci` and `npm run dev` from `backend/`, then run the same commands from `frontend/` in another terminal. Open the Vite URL. Vite forwards `/api` requests to the backend on port 3001.

For a single local process, run `npm run build` from `frontend/`, then `npm start` from `backend/`. Express serves the built frontend at <http://localhost:3001>.
