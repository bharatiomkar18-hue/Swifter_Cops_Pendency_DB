const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const DEFAULT_ADMIN_PASSWORD_HASH = "231fb98687ed0272c3ed11c61ec1515b7b50789e25e62a1fa86e40bda7a2fd0d";
const STORE_NAME = "swifter-cops-shipment-store";
const LATEST_KEY = "latest";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0"
    },
    body: JSON.stringify(body)
  };
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function getConfig() {
  return {
    adminHash: process.env.SWIFTER_ADMIN_PASSWORD_HASH || process.env.COPS_ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH,
    blobsSiteID: process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID || "",
    blobsToken: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN || ""
  };
}

function getShipmentStore(config) {
  if (config.blobsSiteID && config.blobsToken) {
    return getStore(STORE_NAME, {
      siteID: config.blobsSiteID,
      token: config.blobsToken
    });
  }
  return getStore(STORE_NAME);
}

function isAuthorized(event, config) {
  const supplied = event.headers["x-admin-password"] || event.headers["X-Admin-Password"] || "";
  return hash(supplied) === config.adminHash;
}

function safeUploadId(value) {
  const id = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) throw new Error("Missing chunk upload id.");
  return id.slice(0, 80);
}

function chunkKey(uploadId, chunkIndex) {
  return `chunks/${safeUploadId(uploadId)}_${String(Number(chunkIndex)).padStart(5, "0")}`;
}

exports.handler = async function handler(event) {
  const config = getConfig();
  const store = getShipmentStore(config);

  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: { "Cache-Control": "no-store, max-age=0" }, body: "" };
    }

    if (event.httpMethod === "GET") {
      const qs = event.queryStringParameters || {};

      if (qs.health === "1") {
        let latestExists = false;
        try {
          const latest = await store.get(LATEST_KEY, { type: "json" });
          latestExists = Boolean(latest && latest.payload);
        } catch {
          latestExists = false;
        }
        return json(200, {
          ok: true,
          storage: "netlify-blobs",
          storeName: STORE_NAME,
          latestExists,
          tokenRequired: true,
          blobsSiteConfigured: Boolean(config.blobsSiteID),
          blobsTokenConfigured: Boolean(config.blobsToken)
        });
      }

      if (qs.uploadId && qs.chunkIndex !== undefined) {
        const data = await store.get(chunkKey(qs.uploadId, qs.chunkIndex), { type: "text" });
        if (!data) return json(404, { error: "Chunk not found." });
        return json(200, { data });
      }

      const record = await store.get(LATEST_KEY, { type: "json" });
      if (!record || !record.payload) return json(200, { hasData: false });
      return json(200, Object.assign({ hasData: true }, record));
    }

    if (event.httpMethod === "POST") {
      if (!isAuthorized(event, config)) return json(401, { error: "Unauthorized admin upload." });

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON payload." });
      }

      if (body.operation === "chunk") {
        const uploadId = safeUploadId(body.uploadId);
        const chunkIndex = Number(body.chunkIndex);
        const chunkTotal = Number(body.chunkTotal);
        const data = String(body.data || "");
        if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || !Number.isInteger(chunkTotal) || chunkTotal < 1 || !data) {
          return json(400, { error: "Invalid chunk payload." });
        }
        await store.set(chunkKey(uploadId, chunkIndex), data, {
          metadata: {
            uploadId,
            chunkIndex,
            chunkTotal,
            savedAt: new Date().toISOString()
          }
        });
        return json(200, { ok: true, storage: "netlify-blobs", uploadId, chunkIndex, chunkTotal });
      }

      if (!body.payload || !body.payload.encoding || (!body.payload.data && !body.payload.chunked)) {
        return json(400, { error: "Missing shipment payload." });
      }

      const record = {
        fileName: String(body.fileName || "Shipment DB"),
        mode: body.mode === "append" ? "append" : "replace",
        savedAt: body.savedAt || new Date().toISOString(),
        rowCount: Number(body.rowCount || 0),
        payload: body.payload
      };

      await store.setJSON(LATEST_KEY, record, {
        metadata: {
          fileName: record.fileName,
          rowCount: record.rowCount,
          savedAt: record.savedAt
        }
      });
      return json(200, { ok: true, savedAt: record.savedAt, rowCount: record.rowCount, storage: "netlify-blobs" });
    }

    return json(405, { error: "Method not allowed." });
  } catch (err) {
    console.error("shipment-store failed", err);
    return json(500, {
      error: "Shipment store function failed.",
      detail: err && err.message ? err.message : String(err),
      storage: "netlify-blobs",
      tokenRequired: true,
      requiredEnvironmentVariables: ["NETLIFY_BLOBS_SITE_ID", "NETLIFY_BLOBS_TOKEN"]
    });
  }
};
