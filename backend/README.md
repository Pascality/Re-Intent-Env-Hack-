# Re-Intent backend

Node.js + Express API for catalog search and item recommendations. This MVP reads curated JSON files and does not accept or store photos or user records.

Helmet adds HTTP security headers. Its content security policy allows local photo previews (`blob:`) and MobileNet model-weight downloads from TensorFlow's public Google Storage model archive.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

The API listens on port `3001` by default. Set `PORT` to override it.

The API reads `data/catalog.json`, `data/guidance.json`, `data/recycle-rules.json`, and `data/areas.json` when it starts. `npm.cmd run dev` watches these files and reloads the backend when they change. Restart a process started with `npm.cmd start` after changing data.

For the website during development, open a second terminal in `frontend` and run `npm.cmd install` followed by `npm.cmd run dev`. Open the URL printed by Vite. Its `/api` requests are forwarded to the backend on port `3001`.

To serve the website and API from one local process, run `npm.cmd run build` in `frontend`, then run `npm.cmd start` in `backend`. Open `http://localhost:3001`. Rebuild the frontend after changing its source. The API still starts when `frontend/dist` has not been built.

Run focused backend checks with `npm.cmd test`.

## Routes

- `GET /health`
- `GET /api/v1/catalog?q=plastic&group=material`
- `GET /api/v1/areas`
- `POST /api/v1/recommendations`

Example request body:

```json
{
  "itemId": "television",
  "materialIds": ["electronics"],
  "propertyIds": [],
  "condition": "working",
  "recycleDetails": { "lining": "unknown" },
  "environment": "home",
  "areaId": "in",
  "area": "Pune",
  "searchForDonation": true
}
```

Donation results are generic suitability guidance. Re-Intent does not verify that an organization accepts an item. When requested, the API returns a Google Maps search link; the user must confirm acceptance directly.

`areaId: "in"` selects national guidance for India. The optional free-text `area` helps make the donation search more specific; it does not activate verified city guidance. Source URLs and review dates are included with national recycling/disposal entries. For items without matching national guidance, the API returns general advice and explicitly reports that national guidance is unavailable.

Set `condition` to `contaminated` when the item is dirty or unusable; no separate residue answer is needed. Select the `residue` or `hazardous` property when oil or chemical contamination needs special handling. Optional `recycleDetails.lining` accepts `unknown`, `yes`, or `no` for paper cups and defaults to `unknown`. The recycle route selects the first matching rule in `data/recycle-rules.json`, ordered by optional `priority` and then file order. Safety properties take precedence over ordinary material routes. Rule advice is general unless there is separate source-backed guidance for the selected area. `need_more_information` means the app cannot yet choose a sufficiently specific route.

The recycle route also returns `nextStep`: a short, plain-language action shown before the detailed guidance. It uses the selected item, materials, condition, and safety labels. It only names a local recycling or collection option when acceptance must be checked; an unknown material prompts the user to choose one instead of guessing a bin.
