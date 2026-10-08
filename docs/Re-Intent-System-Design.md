# Re-Intent — Product and System Design

**Document status:** Planning baseline  
**Prepared:** 8 October 2026  
**Scope:** Product workflow, frontend and backend design, data flow, recommendation logic, photo analysis, hackathon constraints, and MVP workplan.

This document consolidates the decisions and proposals discussed so far. It distinguishes the current plan from items that still need validation. It is a design document, not a claim that the system has already been implemented or that image recognition has been proven accurate.

## 1. Product purpose

Re-Intent is a phone-first website that helps a person decide what to do with an unwanted item. The user may take or choose a photo, browse or search item labels, review suggested labels, add condition and context, and receive three possible routes:

1. **Reuse** — practical ideas for using the item again.
2. **Recycle or dispose** — preparation and disposal guidance, using the supported service area where applicable.
3. **Donation** — general advice on whether donation may be worth considering, plus a search link for nearby organizations when the user chooses to pursue it.

The site is guidance, not a guarantee that a facility or organization will accept an item. The user remains in control of the chosen item, its reported condition, and whether to pursue donation.

## 2. Constraints and decisions

### Hackathon and hosting constraints

- The supplied hackathon guidance says a project can qualify for prizes by either using at least one AWS open-source tool or deploying on AWS.
- The team does not have AWS credits and has chosen the **AWS open-source-tool route**, not AWS cloud deployment.
- **Finch** is the planned AWS open-source tool: use it to build and run the project container locally. Finch is listed among the open-source choices in the supplied hackathon screenshot. Confirm the organizer accepts the planned use of Finch for eligibility before submission.
- **Do not deploy AWS Lambda, API Gateway, S3, DynamoDB, or other AWS-hosted services.** Earlier Lambda/SAM discussion was a local-development option and is not the selected production architecture.
- **Render** is the proposed external host for the container and public demo URL. Its free service terms and behavior may have limits; check them at deployment time. Hosting on Render is separate from the AWS open-source-tool eligibility path.

### Current architecture choices

- Frontend: React + Vite (planned).
- API: Node.js + Express (planned).
- Data for the MVP: curated, version-controlled JSON files in the project repository.
- Photo analysis: prototype an in-browser TensorFlow.js image classifier; treat all predictions as suggestions. Validate the model early with realistic photos.
- Photo privacy: do not send or persist the image on the backend in the planned MVP.
- Hosting shape: serve the built frontend and Express API from one application/container where practical; build and run locally with Finch, then host the container on Render.
- No user accounts, user history, photo storage, admin interface, or database are planned for the MVP.

## 3. User experience and workflow

The primary device is a phone. Make camera, upload, and touch interactions easy to use, while preserving a complete manual-selection path.

### Main flow

```mermaid
flowchart TD
    A[Start Re-Intent] --> B{Choose identification method}
    B -->|Take or choose photo| C[Analyze locally in browser]
    B -->|Browse or search| E[Choose labels manually]
    C --> D[Review suggested labels]
    D --> E
    E --> F[Select exact item if known]
    F --> G[Choose condition and environment]
    G --> H[Choose service area if local guidance is wanted]
    H --> I[Confirm item details]
    I --> J[Request recommendations]
    J --> K[Reuse]
    J --> L[Recycle or dispose]
    J --> M[Donation suitability and optional nearby search]
```

### Identification and labels

- The user can take a photo, choose a photo, or skip the photo and browse/search.
- Design the first flow for one primary item per photo. If the photo contains multiple items or is unclear, ask the user to select the intended item, retake the photo, or continue manually.
- The browser model may suggest broad labels. The user can accept, remove, replace, or add labels before recommendations are requested.
- A broad-to-exact choice should be possible, e.g. `plastic → container → oil container`. The user can stop at a broad category when they do not know the exact item.
- Labels describe different facets and can coexist; do not put every term into one flat, mutually exclusive taxonomy:
  - **Material / waste stream:** plastic, glass, metal, paper, textile, electronics, food/organic waste.
  - **Specific item:** bottle, oil container, television, shirt, food scraps.
  - **Condition:** usable, working, repairable, damaged, contaminated, unknown.
  - **Properties:** biodegradable, hazardous, reusable, where applicable.
  - **Context:** home, workplace, outdoors.
- The photo cannot reliably establish whether an appliance works, what a container held, or whether an item is contaminated. Ask the user when these details affect advice.

### Results and route behavior

Show three route cards consistently, but allow a route to say it needs more information or has no suitable/verified advice. Do not invent content just to fill a card.

- **Reuse:** Show practical ideas where the catalogue contains them. Advice should match the item and, when useful, its context.
- **Recycle or dispose:** Prefer item-specific guidance for the selected area. If only a broad label is known and specificity changes the advice, ask a follow-up question or make the uncertainty clear.
- **Donation:** Treat this as a suitability suggestion, not an eligibility or acceptance check. Use the user’s reported condition as an assumption. For example, if the user marks a TV as working, the result can say, “Based on your selection, donation may be worth considering.” Do not claim that any organization will accept it.
- The user decides whether to pursue donation. If they choose to, provide a Google search or Maps search link based on the item and the area they selected. Clearly frame results as places to contact, not verified accepting organizations.
- Generic single-use items such as plastic bottles or oil containers will generally receive “probably not suitable for donation” guidance; the user can still decide to search if desired.

### Proposed website views

1. **Start:** brief purpose and actions to take a photo, choose a photo, or browse/search.
2. **Identify/review:** image preview, suggested labels, manual editing, and item search.
3. **Details:** condition, environment, and service area when relevant.
4. **Results:** reuse, recycle/dispose, donation advice and optional nearby search.
5. **About/guidance:** explain that image labels are suggestions, local instructions may vary, and organization acceptance must be confirmed by the user.

Website page navigation is separate from the API endpoints described later.

## 4. System architecture

```mermaid
flowchart LR
    P[Phone browser] --> UI[React + Vite frontend]
    UI -->|selected image only| ML[TensorFlow.js model in browser]
    ML -->|candidate label IDs| UI
    UI -->|confirmed structured item JSON, no photo| API[Express REST API]
    API --> VAL[Validation and normalization]
    VAL --> REC[Recommendation engine]
    REC --> CAT[catalog.json]
    REC --> GUIDE[guidance.json]
    REC --> AREA[areas.json]
    REC --> OUT[Structured route response]
    OUT --> UI
    UI -->|optional search link| GS[Google search/Maps]
```

### Component responsibilities

- **React frontend:** Camera/file input, local image inference, catalogue browsing, label correction, user questions, API requests, and result rendering.
- **Image-analysis adapter:** A small frontend module with a stable interface, such as `analyzeImage(file) -> predictions`. It hides the model-specific implementation so the model can be changed without rewriting the workflow.
- **Express API:** Accepts confirmed structured data, validates it, calls recommendation logic, and returns normalized results. It does not receive photos in the MVP.
- **Recommendation engine:** A plain application module, separate from Express request handlers. It resolves IDs, applies rules, and constructs route statuses and advice.
- **JSON data:** Reviewed item labels, advice, service areas, and source/review notes.
- **Container/hosting:** Finch is used locally for the container workflow. Render is the proposed external host for a public demo.

## 5. Photo analysis and processing

### Proposed MVP approach

Prototype a **browser-side TensorFlow.js MobileNet-based classifier** to suggest broad material or waste categories. This is a candidate approach, not a validated model decision. TensorFlow.js can run image classification in a browser; the user’s image need not be sent to the API. See [TensorFlow.js image classification](https://www.tensorflow.org/js/tutorials/transfer/image_classification).

The TrashNet dataset is a possible starting point for broad waste classes: glass, paper, cardboard, plastic, metal, and trash. Its repository describes 2,527 images, mostly photographed against a white background, so its training conditions may not match varied phone photos. It does not cover every Re-Intent item type, including all electronics, clothing, or organic waste. Treat it as a prototype/training resource, not evidence of field accuracy. See [TrashNet dataset](https://github.com/garythung/trashnet).

### Prediction handling

1. The user chooses an image in the browser.
2. The frontend resizes/preprocesses it as required by the model and performs inference locally.
3. The model returns candidate labels and scores.
4. The frontend maps supported model classes to Re-Intent catalogue IDs.
5. The UI presents candidates as editable suggestions, not facts.
6. If the prediction is unclear, unsupported, or the model fails, the user searches or selects labels manually.
7. The user confirms the item and enters condition/context.
8. The frontend sends only confirmed structured fields to the API.

Do not show a probability as a trustworthy confidence percentage until evaluated/calibrated. Do not infer appliance function, contamination, donation eligibility, or local recycling acceptance from a photo. The model only predicts classes it was trained/configured to recognize; manual selection covers other classes.

### Photo storage and database implications

- Accepting a photo in the browser does **not** require a database.
- In the chosen flow, the photo is processed in the browser and is not submitted to the backend or stored by Re-Intent.
- A backend photo-upload endpoint, image history, and photo storage are not part of the MVP.
- A database is a separate question from image analysis. It would become useful for large/frequently edited catalogues, organization-managed data, user history, or an admin workflow, none of which is currently planned.

## 6. Data model and JSON files

### What “version-controlled JSON” means

JSON is a plain-text format for structured records. Store the MVP catalogue/guidance JSON files in the project directory and track them in Git alongside the code. The repository may be local and/or synchronized to a remote service such as GitHub; “repository” means the Git-tracked project, not necessarily GitHub specifically.

Git records edits, lets the team compare/revert guidance changes, and makes the data reviewable. Since the running API loads this data from the application files, editing the guidance requires committing the change and redeploying/restarting the application for the live service to use it. This is simple and low-overhead for a small hackathon catalogue, but it means content changes go through a software release. That is the MVP tradeoff.

### Proposed files

```text
backend/
  data/
    catalog.json       # labels, hierarchy, facets, synonyms
    guidance.json      # reuse, recycle/dispose, donation suitability rules/advice
    areas.json         # service areas supported in the MVP
```

No `organizations.json` is planned because we are not maintaining or verifying an organization directory. The optional Google search link is generated from the user’s item and selected area.

### Example catalogue record

```json
{
  "id": "oil-container",
  "label": "Oil container",
  "group": "item",
  "parentId": "container",
  "synonyms": ["oil canister", "plastic oil bottle"],
  "materialIds": ["plastic"]
}
```

### Example guidance record

```json
{
  "itemId": "television",
  "reuse": [
    {
      "title": "Consider repair or reuse",
      "text": "If it works or can be repaired safely, consider keeping or passing it on."
    }
  ],
  "recycleOrDispose": {
    "text": "Check the selected area's electronics disposal guidance.",
    "areaSpecific": true
  },
  "donation": {
    "suitability": "consider_if_usable",
    "text": "If you report that it works and is in usable condition, donation may be worth considering. Contact an organization to confirm acceptance."
  },
  "sourceNotes": [],
  "lastReviewed": "YYYY-MM-DD"
}
```

These are design examples. Actual item instructions and local guidance must be researched and reviewed before being presented as authoritative.

### Suggested confirmed item request shape

```json
{
  "itemId": "television",
  "materialIds": ["electronics"],
  "propertyIds": [],
  "condition": "working",
  "environment": "home",
  "areaId": "pilot-area-1"
}
```

`itemId` can be absent if the user only selected a broad category. IDs should be from the catalogue; do not rely on free-form labels for recommendation logic. User selections are treated as reports, not independently verified facts.

## 7. API endpoints

All API paths are versioned under `/api/v1`. The app can serve the frontend and API from one host, so requests can be same-origin.

### `GET /api/v1/catalog`

Returns labels available for browse, search, and correction. Optional query parameters may include `q` for text search and `group` for a facet such as `material` or `item`.

### `GET /api/v1/areas`

Returns supported service areas for local guidance and optional nearby searches. In the MVP, users can choose/enter an area; precise GPS access is not required.

### `POST /api/v1/recommendations`

Accepts the **confirmed item details** and returns the three route objects. It does not accept a photo.

Example response shape:

```json
{
  "item": {
    "itemId": "television",
    "label": "Television",
    "materialIds": ["electronics"],
    "condition": "working"
  },
  "routes": {
    "reuse": {
      "status": "available",
      "title": "Reuse",
      "items": []
    },
    "recycle": {
      "status": "available",
      "title": "Recycle or dispose",
      "items": []
    },
    "donation": {
      "status": "consider",
      "title": "Donation",
      "message": "Based on your selection that the TV works, donation may be worth considering. Confirm acceptance directly with an organization.",
      "searchQuery": "donate working television near Pilot Area"
    }
  }
}
```

Donation status must not imply a verified organization match. Suitable statuses for individual routes include `available`, `need_more_information`, `not_applicable`, `no_guidance`, and for donation specifically `consider`, `probably_not_suitable`, or `user_choice`. The final enum can be normalized during implementation.

The frontend can construct a Google search/Maps URL from a returned query or construct it itself. The action should be labeled as a search, e.g. **Search nearby organizations**, not “Find a verified accepting NGO.” Search results may be inaccurate or stale; the user needs to confirm details directly.

### `GET /health`

Returns a minimal status for local checks and hosting health probes, e.g. `{"status":"ok"}`.

### Not planned for the MVP

- Photo upload/storage endpoint
- User registration/authentication
- User history/favorites
- Admin/content editing endpoints
- Organization acceptance/booking endpoint

These are intentionally excluded from the initial workflow, not forgotten requirements.

## 8. Recommendation processing and data routing

The recommendation service should be separate from Express route code and work approximately as follows:

1. **Validate:** Check required fields and allowed IDs/enums (`condition`, `environment`, `areaId`). Enforce request size limits.
2. **Normalize:** Map synonyms to canonical catalogue IDs; deduplicate labels.
3. **Resolve specificity:** Prefer an exact item. If only a broad material is supplied, use broad guidance only where appropriate; otherwise ask a follow-up question.
4. **Load applicable guidance:** Retrieve the item-level and, where safe, parent-category advice from JSON.
5. **Build reuse route:** Select matching reuse advice and context notes.
6. **Build recycle/dispose route:** Select item and area guidance. If area information is absent or not covered, communicate that limitation rather than guessing.
7. **Build donation advice:** Use item-category suitability and the user-reported condition. Do not query or claim verified organization acceptance. Respect the user’s choice to open a search.
8. **Return a consistent response:** Each route has a status, explanatory text, and optional actions/items. Missing knowledge is represented explicitly.

The backend is stateless for the MVP: it processes a request and returns a response without storing user records.

## 9. Backend code organization (proposal)

```text
backend/
  src/
    app.js                    # Express setup and static frontend serving
    routes/
      catalog.routes.js
      areas.routes.js
      recommendations.routes.js
      health.routes.js
    services/
      catalog.service.js
      recommendation.service.js
      search-link.service.js   # optional query/link construction
    middleware/
      validate-request.js
      error-handler.js
    data/
      catalog.json
      guidance.json
      areas.json
  Dockerfile
```

The exact structure can change, but route handlers should remain thin; recommendation rules and data lookup should live in services that can be maintained independently of HTTP details.

## 10. Error handling, privacy, and safety

- Return clear client errors for malformed JSON, unsupported label IDs, and missing fields; return a generic server error for unexpected failures without exposing stack traces.
- Validate all user-supplied IDs against the catalogue and areas list.
- Avoid logging photos or unnecessary user details. The backend should never receive the photo in the planned MVP.
- Avoid collecting precise location by default. An area selection is enough for the planned local search/guidance.
- Keep prediction language tentative and allow manual correction.
- Donation wording must distinguish “may be worth donating” from “an organization will accept this.”
- Recycling/disposal information can vary locally; show the supported area and source/review metadata where available.

## 11. What the JSON approach trades off

**Benefits:** no database setup or operating cost, simple local development, easy to inspect/review in Git, adequate for a small catalogue.

**Costs:** content edits require a code/data commit and redeployment; non-developers cannot update guidance through an admin screen; simultaneous edits can conflict; broad geographic coverage and rapidly changing content become harder to maintain.

Move to a database/admin workflow only if the catalogue becomes large, changes often, needs non-developer editors, or requires persisted user-owned data. Photo analysis alone is not a reason to add a database.

## 12. Local development, hackathon tool, and publishing

1. Develop the React/Express application and its container recipe.
2. Use Finch to build and run that container locally; this is the planned AWS open-source-tool use.
3. Test the experience on phones and desktop browsers, including manual selection and uncertain image predictions.
4. Connect the repository/container build to Render to obtain a public demo URL.
5. Keep AWS cloud deployment commands out of the workflow unless the team later explicitly changes the no-credits constraint.

Render’s free tier may have sleep, capacity, or usage limitations; check provider terms before the demo and test the live URL in advance. The public URL is provided by Render, not Finch. Finch is a development/container tool, not a hosting provider.

## 13. Workplan and validation methodology

### Phase 1 — Lock the content scope

- Choose one pilot service area.
- Choose a modest initial item catalogue, including broad labels and exact items.
- Gather/review reuse and disposal guidance and record sources/review dates.
- Define donation-suitability wording and search query format without claiming organization acceptance.

### Phase 2 — Build the end-to-end manual flow

- Implement browse/search labels, condition/environment/area selection, and results.
- Implement JSON-backed catalogue and recommendation rules.
- Confirm all three routes handle “available,” “need more information,” and “no suitable guidance” cases.

### Phase 3 — Add photo suggestions

- Integrate the browser model behind the image-analysis adapter.
- Test a small varied photo set (lighting, angle, background, item types) early.
- Review failure patterns; tune the model or keep manual selection as the fallback.
- Treat broad material labels as the initial prediction target; let the user choose the exact item.

### Phase 4 — Package and demo

- Run the container locally with Finch.
- Test mobile camera/file selection, label correction, recommendation response, and Google search handoff.
- Deploy on Render and verify the public URL and free-tier behavior before presenting.

## 14. Open decisions and assumptions

These remain to be decided or validated; they are not hidden implementation facts:

1. Which city/region is the pilot area?
2. Which exact items and broad material labels belong in the first catalogue?
3. What reliable local sources will support recycling/disposal guidance?
4. Does the hackathon organizer accept Finch as the AWS open-source tool for eligibility? The supplied screenshot lists it, but confirm the event’s interpretation.
5. Does the proposed model perform adequately on realistic phone photos and target phones? This must be tested; no accuracy guarantee is made.
6. Will location be typed/selected as an area, or will an optional location-permission flow be added later?

## 15. External technical references

- [TensorFlow.js image classification and transfer learning](https://www.tensorflow.org/js/tutorials/transfer/image_classification)
- [TrashNet dataset, classes, and collection notes](https://github.com/garythung/trashnet)
- [AWS Finch on Windows](https://aws.amazon.com/blogs/opensource/finch-container-development-tool-now-for-windows/)
- [Render free services and limitations](https://render.com/docs/free)

