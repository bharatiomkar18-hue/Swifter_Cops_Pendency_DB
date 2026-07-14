const crypto = require("crypto");

const DEFAULT_ADMIN_PASSWORD_HASH = "231fb98687ed0272c3ed11c61ec1515b7b50789e25e62a1fa86e40bda7a2fd0d";
const DEFAULT_OWNER = "bharatiomkar18-hue";
const DEFAULT_REPO = "SwiftER-Cops-Pendency-Dashboard";
const DEFAULT_BRANCH = "main";
const STORE_PATH = "swifter_cops_shared_store.json";

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
    owner: process.env.SWIFTER_GITHUB_OWNER || process.env.COPS_GITHUB_OWNER || DEFAULT_OWNER,
    repo: process.env.SWIFTER_GITHUB_REPO || process.env.COPS_GITHUB_REPO || DEFAULT_REPO,
    branch: process.env.SWIFTER_GITHUB_BRANCH || process.env.COPS_GITHUB_BRANCH || DEFAULT_BRANCH,
    token: process.env.SWIFTER_GITHUB_TOKEN || process.env.COPS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    adminHash: process.env.SWIFTER_ADMIN_PASSWORD_HASH || process.env.COPS_ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH
  };
}

function isAuthorized(event, config) {
  const supplied = event.headers["x-admin-password"] || event.headers["X-Admin-Password"] || "";
  return hash(supplied) === config.adminHash;
}

function encodeBase64(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function decodeBase64(text) {
  return Buffer.from(text || "", "base64").toString("utf8");
}

async function githubRequest(config, path, options = {}) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "cops-pendency-dashboard",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(config.token ? { "Authorization": `Bearer ${config.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

async function readGithubRawFile(config, downloadUrl) {
  const response = await fetch(downloadUrl, {
    headers: {
      "Accept": "application/vnd.github.raw",
      "User-Agent": "cops-pendency-dashboard",
      ...(config.token ? { "Authorization": `Bearer ${config.token}` } : {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub raw read failed with ${response.status}: ${text}`);
  }
  return text;
}

async function readStore(config) {
  const { response, data } = await githubRequest(config, STORE_PATH, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const message = data && data.message ? data.message : `GitHub read failed with ${response.status}`;
    throw new Error(message);
  }
  let text = "";
  if (data.content) {
    text = decodeBase64(data.content);
  } else if (data.download_url) {
    text = await readGithubRawFile(config, data.download_url);
  } else {
    return null;
  }

  const record = JSON.parse(text);
  if (!record || !record.payload) return null;
  return record;
}

async function writeStore(config, record) {
  if (!config.token) {
    throw new Error("Missing SWIFTER_GITHUB_TOKEN. Add a GitHub token in Netlify environment variables.");
  }

  let sha = "";
  const existing = await githubRequest(config, STORE_PATH, { method: "GET" });
  if (existing.response.ok && existing.data && existing.data.sha) sha = existing.data.sha;
  if (existing.response.status !== 404 && !existing.response.ok) {
    const message = existing.data && existing.data.message ? existing.data.message : `GitHub lookup failed with ${existing.response.status}`;
    throw new Error(message);
  }

  const body = {
    message: `Update COPS shipment DB ${record.savedAt}`,
    branch: config.branch,
    content: encodeBase64(JSON.stringify(record, null, 2)),
    ...(sha ? { sha } : {})
  };

  const { response, data } = await githubRequest(config, STORE_PATH, {
    method: "PUT",
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = data && data.message ? data.message : `GitHub write failed with ${response.status}`;
    throw new Error(message);
  }
  return data;
}

exports.handler = async function handler(event) {
  const config = getConfig();

  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: { "Cache-Control": "no-store, max-age=0" }, body: "" };
    }

    if (event.httpMethod === "GET") {
      const record = await readStore(config);
      if (!record) return json(200, { hasData: false });
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

      if (!body.payload || !body.payload.encoding || !body.payload.data) {
        return json(400, { error: "Missing shipment payload." });
      }

      const record = {
        fileName: String(body.fileName || "Shipment DB"),
        mode: body.mode === "append" ? "append" : "replace",
        savedAt: body.savedAt || new Date().toISOString(),
        rowCount: Number(body.rowCount || 0),
        payload: body.payload
      };

      await writeStore(config, record);
      return json(200, { ok: true, savedAt: record.savedAt, rowCount: record.rowCount, storage: "github" });
    }

    return json(405, { error: "Method not allowed." });
  } catch (err) {
    console.error("shipment-store failed", err);
    return json(500, {
      error: "Shipment store function failed. Confirm GitHub token and repository settings are correct.",
      detail: err && err.message ? err.message : String(err),
      requiredEnvironmentVariables: ["COPS_GITHUB_TOKEN"],
      optionalEnvironmentVariables: ["COPS_GITHUB_OWNER", "COPS_GITHUB_REPO", "COPS_GITHUB_BRANCH"]
    });
  }
};
