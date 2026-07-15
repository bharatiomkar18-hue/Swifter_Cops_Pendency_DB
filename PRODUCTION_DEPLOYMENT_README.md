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

Required Netlify environment variables:

- `NETLIFY_BLOBS_SITE_ID` - your Netlify Project ID / Site ID.
- `NETLIFY_BLOBS_TOKEN` - your Netlify Personal Access Token.

Optional Netlify environment variable:

- `SWIFTER_ADMIN_PASSWORD_HASH` - optional SHA-256 hash for admin password.

## Netlify Blobs Token Setup

1. Open Netlify and go to your SwiftER site.
2. Open `Project configuration` > `General` > `Project information`.
3. Copy the `Project ID`. Add it as `NETLIFY_BLOBS_SITE_ID`.
4. Open Netlify user settings > `Applications` > `Personal access tokens`.
5. Select `New access token`.
6. Give it a clear name, for example `SwiftER COPS Blobs Storage`.
7. Generate the token and copy it once. Add it as `NETLIFY_BLOBS_TOKEN`.
8. Redeploy the site after saving both environment variables.

## Smoke Test

1. Open the Netlify URL.
2. Confirm the dashboard loads with no preview data.
3. Open `/.netlify/functions/shipment-store?health=1`.
4. Confirm `storage` is `netlify-blobs`.
5. Confirm `tokenRequired`, `blobsSiteConfigured`, and `blobsTokenConfigured` are all `true`.
5. Unlock admin mode.
6. Upload the SwiftER shipment Excel using Replace Data.
7. Confirm filters are based on uploaded data.
8. Open the same URL in another browser or incognito window.
9. Confirm the uploaded data loads for viewer mode.

Expected health check after setup:

```json
{
  "ok": true,
  "storage": "netlify-blobs",
  "tokenRequired": true,
  "blobsSiteConfigured": true,
  "blobsTokenConfigured": true
}
```
