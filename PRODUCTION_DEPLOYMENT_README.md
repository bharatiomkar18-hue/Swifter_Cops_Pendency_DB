# SwiftER COPS Pendency Dashboard Deployment

## Folder Contents

- `index.html` - production SwiftER COPS dashboard.
- `swifter_cops_pendency_dashboard.html` - same dashboard with explicit file name.
- `cops_live_data.js` - empty fallback snapshot file.
- `swifter_cops_shared_store.json` - shared DB placeholder updated by the Netlify Function.
- `netlify/functions/shipment-store.js` - GitHub-backed shared storage function.
- `netlify.toml`, `_headers`, `_redirects`, `package.json` - Netlify deployment files.

## GitHub Setup

1. Create a GitHub repository, recommended name: `SwiftER-Cops-Pendency-Dashboard`.
2. Upload every file and folder from this deployment folder to the repository root.
3. Keep `netlify/functions/shipment-store.js` in the exact same path.
4. Keep `swifter_cops_shared_store.json` in the repository root.

## Netlify Setup

Use Git-based Netlify deployment.

- Build command: leave blank
- Publish directory: `.`
- Functions directory: `netlify/functions`

Add these Netlify environment variables:

- `SWIFTER_GITHUB_TOKEN` - GitHub token with repository contents read/write access.
- `SWIFTER_GITHUB_OWNER` - GitHub owner/user name. Optional if using default `bharatiomkar18-hue`.
- `SWIFTER_GITHUB_REPO` - repository name. Optional if using default `SwiftER-Cops-Pendency-Dashboard`.
- `SWIFTER_GITHUB_BRANCH` - optional, defaults to `main`.
- `SWIFTER_ADMIN_PASSWORD_HASH` - optional SHA-256 hash for admin password.

The function also accepts the older `COPS_GITHUB_*` variable names as fallback, but SwiftER names are preferred for this dashboard.

## Smoke Test

1. Open the Netlify URL.
2. Confirm the dashboard loads with no preview data.
3. Unlock admin mode.
4. Upload the SwiftER shipment Excel using Replace Data.
5. Confirm filters are based on uploaded data.
6. Confirm Derived Status defaults to Open Shipment and can filter Closed, Not Picked, and Cancelled.
7. Open the same URL in another browser or incognito window.
8. Confirm the uploaded data loads for viewer mode.
9. Check `/.netlify/functions/shipment-store`; it should return JSON, not a 404.
