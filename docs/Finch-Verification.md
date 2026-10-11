# Finch verification

Verified locally on Windows on 11 October 2026 using the AWS open source Finch v1.19.0 CLI and its WSL 2 VM. The Dockerfile at the repository root built successfully as `re-intent:local`, and Finch ran it as `re-intent-local` with host port 3001 forwarded to container port 3001.

Observed checks through `http://127.0.0.1:3001`:

| Request | Result |
| --- | --- |
| `GET /` | HTTP 200; React root returned |
| `GET /health` | `{"status":"ok"}` |
| `GET /api/v1/catalog` | Catalogue JSON returned |
| `GET /api/v1/areas` | Area JSON returned |
| `POST /api/v1/recommendations` | Reuse, recycle/dispose and donation routes returned for a contaminated paper cup |
| `HEAD /models/yolo11n.onnx` | HTTP 200 |
| `HEAD /ort/ort-wasm-simd-threaded.wasm` | HTTP 200 |
| `HEAD /re-intent-logo.png` | HTTP 200 |

`finch ps` showed the container as **Up** with `0.0.0.0:3001->3001/tcp`. Its startup log reported that it loaded the catalogue and was listening on port 3001. These checks confirm the container build, HTTP routing, and static asset delivery. They do not measure photo recognition quality or verify every browser interaction.

This local Finch run demonstrates use of the AWS open source tool. A public URL requires a separate host; the [deployment guide](Finch-and-Deployment.md) describes the Dockerfile deployment path.

The release image was rebuilt on 11 October 2026 after adding the license, health check, and non-root runtime. Finch reported it **healthy**. The backend ran as `uid=1000(node)`, the license was present in the image, and the page, API, YOLO11 model, and ONNX runtime assets responded through the container. Headless Edge mounted the React page and displayed its source and license link. All nine backend tests passed and the frontend production build completed.

The same image also answered `/health` with `PORT=10000`, which checks the port configuration used by many web hosts. Both npm projects reported zero vulnerabilities in the audit run on this date. The sample photo model accuracy and a hosted phone camera have not been measured by these checks.
