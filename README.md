# Re-Intent

Re-Intent helps someone identify an unwanted item and review reuse, recycling or disposal, and donation options. The phone-friendly site accepts a photo or manual labels. MobileNet V2 and YOLO11 offer optional label suggestions in the browser; the user confirms the item, materials, condition, and location before requesting guidance.

The Express API reads curated JSON files from `backend/data/`. It does not accept or store photos or user accounts. MobileNet weights are downloaded by the browser from TensorFlow's public model archive on first use; the YOLO11 model and ONNX Runtime Web assets are served with the site. Manual selection works without photo analysis.

## Local development

Install dependencies in `backend/` and `frontend/` with `npm ci`. In separate terminals, run `npm run dev` from each folder. Open the Vite URL shown in the frontend terminal. The Vite development server forwards API requests to the backend on port 3001.

## Local production container with Finch

From the repository root, after installing and initializing Finch:

```powershell
finch build -t re-intent:local .
finch run --rm -p 3001:3001 -e PORT=3001 re-intent:local
```

Open <http://localhost:3001>. The container serves the frontend and API from one origin. See [Finch and deployment](docs/Finch-and-Deployment.md) for Windows setup, background operation, and public hosting notes.

For a public demo, the included [Render Blueprint](render.yaml) deploys a free Docker web service. Connect this repository to Render and create a Blueprint from `render.yaml`. The backend reads the host's `PORT` environment variable and binds to `0.0.0.0`; Render checks `/health`. The live camera requires HTTPS and browser permission; photo upload is the fallback. See the [deployment guide](docs/Finch-and-Deployment.md) before publishing.

## License and source

Re-Intent is distributed under the [GNU Affero General Public License v3.0](LICENSE). The included [Ultralytics YOLO11 model](frontend/public/models/README.md) and `@ultralytics/yolo` browser package use AGPL-3.0. The website links to this repository so visitors can find its source and license. Contributors should keep that link working when publishing the site.

Copyright (C) 2026 Re-Intent contributors.
