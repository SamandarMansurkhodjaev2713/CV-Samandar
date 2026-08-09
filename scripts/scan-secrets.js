"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SKIP_FILES = new Set([
  "_otvety_extracted.txt",
  "scripts/scan-secrets.js",
  "package-lock.json",
]);
const SKIP_PREFIXES = ["vendor/", "node_modules/", "tmp/", "test-results/", "playwright-report/"];
const BINARY_EXTENSIONS = new Set([
  ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".pdf", ".png", ".webm", ".webp", ".woff", ".woff2",
]);

const privateKeyHeader = new RegExp("-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE" + " KEY-----");
const rules = [
  { name: "private key", pattern: privateKeyHeader },
  { name: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { name: "OpenAI-style key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
];
const assignment = /\b(api[_-]?key|client[_-]?secret|password|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/ig;
const placeholders = /^(?:example|placeholder|changeme|replace[-_]?me|your[-_]|x{6,}|\$\{|<)/i;

function candidates() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output.split("\0").filter(Boolean).map((file) => file.replace(/\\/g, "/"));
}

function shouldScan(file) {
  if (SKIP_FILES.has(file) || SKIP_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  return !BINARY_EXTENSIONS.has(path.extname(file).toLowerCase());
}

const findings = [];
for (const file of candidates()) {
  if (!shouldScan(file)) continue;
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  const source = fs.readFileSync(absolute, "utf8");
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) findings.push({ file, line: index + 1, rule: rule.name });
    }
    assignment.lastIndex = 0;
    let match;
    while ((match = assignment.exec(line))) {
      if (!placeholders.test(match[2])) findings.push({ file, line: index + 1, rule: "credential assignment" });
    }
  }
}

if (findings.length) {
  console.error("Potential secrets detected (values intentionally hidden):");
  for (const finding of findings) console.error(`- ${finding.file}:${finding.line} [${finding.rule}]`);
  process.exit(1);
}

console.log("Secret scan passed: no credential signatures found in repository candidates.");
