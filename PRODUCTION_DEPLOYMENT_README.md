# SwiftER COPS Pendency Dashboard Deployment

## Folder Contents

- `index.html` - production SwiftER COPS dashboard.
- `swifter_cops_pendency_dashboard.html` - same dashboard with explicit file name.
- `netlify/functions/shipment-store.js` - Netlify Blobs shared storage function.
- `_headers`, `_redirects`, `package.json` - Netlify deployment files.

## GitHub Setup

1. Create a GitHub repository, recommended name: `SwiftER-Cops-Pendency-Dashboard`.
2. Upload every file and folder from this deployment folder to the repository root.
3. Keep `netlify/functions/shipment-store.js` in the exact same path.
4. Delete any old `cops_live_data.js` from the repository root; this SwiftER production bundle does not use it.
5. Delete `netlify.toml` from the repository root; this bundle does not need it and uses Netlify defaults.

## Netlify Setup

Use Git-based Netlify deployment.

- Build command: leave blank
- Publish directory: `.`
- Functions directory: `netlify/functions`

No GitHub token is required. Shared viewer storage uses Netlify Blobs.

Optional Netlify environment variable:

- `SWIFTER_ADMIN_PASSWORD_HASH` - optional SHA-256 hash for admin password.

## Smoke Test

1. Open the Netlify URL.
2. Confirm the dashboard loads with no preview data.
3. Open `/.netlify/functions/shipment-store?health=1`.
4. Confirm `storage` is `netlify-blobs` and `tokenRequired` is `false`.
5. Unlock admin mode.
6. Upload the SwiftER shipment Excel using Replace Data.
7. Confirm filters are based on uploaded data.
8. Open the same URL in another browser or incognito window.
9. Confirm the uploaded data loads for viewer mode.
