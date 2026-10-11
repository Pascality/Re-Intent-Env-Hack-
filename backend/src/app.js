import express from "express";
import helmet from "helmet";
import { fileURLToPath } from "node:url";
import { createRecommendationService, RequestValidationError } from "./recommendations.js";

const frontendDistPath = fileURLToPath(new URL("../../frontend/dist/", import.meta.url));

export function createApp(data) {
  const app = express();
  const recommendations = createRecommendationService(data);

  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "connect-src": ["'self'", "https://storage.googleapis.com"],
        "style-src": ["'self'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "blob:"],
        "script-src": ["'self'", "'wasm-unsafe-eval'"],
        "worker-src": ["'self'", "blob:"],
      },
    },
  }));
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/v1/catalog", (request, response) => {
    const group = typeof request.query.group === "string" ? request.query.group : "";
    const query = typeof request.query.q === "string" ? request.query.q : "";
    response.set("Cache-Control", "no-store");
    response.json(recommendations.getCatalog({ group, query }));
  });

  app.get("/api/v1/areas", (_request, response) => {
    response.json(recommendations.getAreas());
  });

  app.post("/api/v1/recommendations", (request, response, next) => {
    try {
      response.json(recommendations.recommend(request.body));
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(frontendDistPath));

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: "NOT_FOUND", message: "This API route does not exist." },
    });
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof RequestValidationError) {
      return response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof SyntaxError && "body" in error) {
      return response.status(400).json({
        error: { code: "INVALID_JSON", message: "Request body must contain valid JSON." },
      });
    }

    if (error.status === 413) {
      return response.status(413).json({
        error: { code: "REQUEST_TOO_LARGE", message: "Request body is too large." },
      });
    }

    console.error(error);
    return response.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong while processing the request." },
    });
  });

  return app;
}
