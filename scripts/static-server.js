#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || 4173);
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch (error) {
    return null;
  }
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(ROOT, relative || "index.html");
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) return null;
  return candidate;
}

function resolveFile(urlPath) {
  const candidate = safePath(urlPath);
  if (!candidate) return null;
  try {
    if (fs.statSync(candidate).isDirectory()) {
      const index = path.join(candidate, "index.html");
      if (fs.existsSync(index)) return index;
    }
    if (fs.statSync(candidate).isFile()) return candidate;
  } catch (error) {
    // Fall through to the same SPA fallback used by GitHub Pages.
  }
  return path.join(ROOT, "index.html");
}

const server = http.createServer(function serve(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const filePath = resolveFile(request.url || "/");
  if (!filePath) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }
  const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const stats = fs.statSync(filePath);
  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stats.size,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, "127.0.0.1", function ready() {
  process.stdout.write("[server] http://127.0.0.1:" + PORT + "\n");
});

function shutdown() {
  server.close(function close() { process.exit(0); });
  setTimeout(function force() { process.exit(1); }, 3000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
