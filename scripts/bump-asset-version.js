"use strict";

const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const matches = Array.from(html.matchAll(/\?+v=(\d+)/g));

if (!matches.length) throw new Error("No asset version references found in index.html");

const versions = new Set(matches.map((match) => Number(match[1])));
if (versions.size !== 1) {
  throw new Error("Asset versions drifted: " + Array.from(versions).sort((a, b) => a - b).join(", "));
}

const current = Array.from(versions)[0];
const requested = process.argv[2] == null ? current + 1 : Number(process.argv[2]);
if (!Number.isInteger(requested) || requested <= current) {
  throw new Error("Target version must be an integer greater than current v" + current);
}

// `?+` intentionally heals any malformed legacy sequence such as `????v=224`
// while bumping. Future malformed references are also rejected by validate-site.
const next = html.replace(/\?+v=\d+/g, "?v=" + requested);
const normalized = Array.from(next.matchAll(/\?v=(\d+)/g));
if (normalized.length !== matches.length || next.includes("??v=")) {
  throw new Error("Asset version normalization failed");
}

fs.writeFileSync(indexPath, next, "utf8");
console.log("[cache] v" + current + " -> v" + requested + ", refs=" + normalized.length);
