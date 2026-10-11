# Finch and deployment

Build the same single container locally with Finch and deploy it using a host that supports Dockerfiles. Finch runs containers on your computer; it does not create a public website by itself. No AWS cloud account or credits are needed for this setup.

## What the container contains

- The production frontend build, including the checked-in YOLO11 ONNX model and generated ONNX Runtime Web assets.
- The Express backend code, production npm dependencies, and version-controlled JSON catalog and guidance files.
- No photos, accounts, database, Roboflow API key, benchmark environment, or research files.

The browser downloads MobileNet weights from TensorFlow's public model archive when photo analysis first runs. Users can still choose labels manually if that download fails. Uploaded photos stay in the browser and are never posted to Express.

## Local Finch build

On Windows, install [Finch](https://runfinch.com/docs/managing-finch/windows/installation/) after enabling WSL 2. Open a new PowerShell terminal after installation, then initialize the Finch VM once:

```powershell
finch vm init
```

From the repository root:

```powershell
finch build -t re-intent:local .
finch run --rm -p 3001:3001 -e PORT=3001 re-intent:local
```

Open `http://localhost:3001` on the computer running Finch. `http://localhost:3001/health` should return `{ "status": "ok" }`. Stop the container with Ctrl+C. The root `.dockerignore` keeps local dependencies, generated files, private `.env` files, benchmarks, and reference material out of the build context.

To keep it running after closing the terminal instead, use `finch run -d --name re-intent-local -p 3001:3001 -e PORT=3001 re-intent:local`. Check it with `finch ps` and `finch logs re-intent-local`, then stop it with `finch stop re-intent-local`. Remove the stopped container with `finch rm re-intent-local` before reusing that name.

The Windows setup and first local container run were verified on 11 October 2026. See [Finch verification](Finch-Verification.md) for the observed build and endpoint results.

## Public deployment

The root `render.yaml` defines one Render Free web service in Singapore. It builds the root `Dockerfile` and checks `/health`. Connect the GitHub repository in the [Render Dashboard](https://dashboard.render.com/), choose **New → Blueprint**, select this repository, review the free service, and approve the initial deploy. The service should use its assigned `PORT` environment variable; `backend/src/server.js` already listens on `0.0.0.0` and reads `PORT`. The frontend and API share one URL, so no separate frontend host or API URL setting is needed. No database, secret, or separate frontend service is required.

The image build needs network access to install npm packages. On a hosted HTTPS URL, live camera access can work after the browser grants permission; upload remains available as a fallback. Render Free sleeps after 15 minutes without traffic, and the first request after that can take about a minute. It has monthly usage limits; check your Render billing settings before adding a payment method because usage beyond the included amounts can incur charges. This plan is suitable for a demo, not an always-available production service.

Before publishing, push the application, `render.yaml`, `Dockerfile`, `LICENSE`, and the YOLO11 model file to a public repository whose source visitors can access. The site's footer links to that source, as required for the AGPL release choice. Confirm that the hosted `/health` endpoint returns `{"status":"ok"}`, that the hosted page and camera work over HTTPS on a phone, and that the source link resolves publicly. An optional GitHub Actions workflow is saved at `docs/ci-workflow.example.yml`. To activate it later, copy it to `.github/workflows/ci.yml` using a GitHub credential with workflow permission.

For hackathon evidence, keep this Dockerfile and `.dockerignore` in the repo and capture the Finch build and local run output or a screenshot of the running site. The public host provides the deployment URL.
