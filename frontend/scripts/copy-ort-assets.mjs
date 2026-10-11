import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../node_modules/onnxruntime-web/dist/", import.meta.url);
const destination = new URL("../public/ort/", import.meta.url);
const files = [
  "ort.webgpu.min.js",
  "ort.wasm.min.js",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
];

await mkdir(destination, { recursive: true });
await Promise.all(files.map((name) => copyFile(new URL(name, source), new URL(name, destination))));
console.log(`Copied ${files.length} ONNX Runtime Web assets into ${fileURLToPath(destination)}`);
