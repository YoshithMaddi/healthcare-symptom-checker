import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeSymptoms } from "./src/analysis-service.js";
import { appConfig } from "./src/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = appConfig.port;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

async function serveStatic(request, response) {
  const requestPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "Missing request URL." });
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "health-codex",
      model: appConfig.openAiModel,
      llmConfigured: Boolean(appConfig.openAiApiKey)
    });
    return;
  }

  if (request.method === "GET" && request.url === "/api/history") {
    try {
      const historyPath = path.join(__dirname, "data", "history.ndjson");
      const file = await readFile(historyPath, "utf8");
      const items = file
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .slice(-10)
        .reverse();
      sendJson(response, 200, { items });
    } catch {
      sendJson(response, 200, { items: [] });
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/check-symptoms") {
    try {
      const body = await readRequestBody(request);
      const symptoms = typeof body.symptoms === "string" ? body.symptoms.trim() : "";

      if (symptoms.length < 10) {
        sendJson(response, 400, {
          error: "Please provide a more detailed symptom description."
        });
        return;
      }

      const result = await analyzeSymptoms(symptoms);
      sendJson(response, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      sendJson(response, 500, { error: message });
    }
    return;
  }

  if (request.method === "GET") {
    await serveStatic(request, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed." });
});

server.listen(port, () => {
  console.log(`Health Codex listening on http://localhost:${port}`);
});
