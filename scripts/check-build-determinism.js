#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

function runBuild(label) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "build.js")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    throw result.error || new Error(label + " build exited with code " + result.status);
  }
}

function generatedPaths() {
  const files = [
    path.join(ROOT, "index.html"),
    path.join(ROOT, "sitemap.xml"),
  ];
  const components = path.join(ROOT, "src", "components");
  fs.readdirSync(components, { withFileTypes: true }).forEach((entry) => {
    if (entry.isFile() && entry.name.endsWith(".js")) files.push(path.join(components, entry.name));
  });
  const projects = path.join(ROOT, "projects");
  function walk(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(candidate);
      else if (entry.isFile() && entry.name === "index.html") files.push(candidate);
    });
  }
  walk(projects);
  return files.sort();
}

function snapshot() {
  const hashes = new Map();
  generatedPaths().forEach((filePath) => {
    const relative = path.relative(ROOT, filePath).split(path.sep).join("/");
    const digest = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    hashes.set(relative, digest);
  });
  return hashes;
}

function compare(first, second) {
  const all = new Set([...first.keys(), ...second.keys()]);
  return [...all].filter((file) => first.get(file) !== second.get(file)).sort();
}

try {
  runBuild("first");
  const first = snapshot();
  runBuild("second");
  const second = snapshot();
  const changed = compare(first, second);
  if (changed.length) {
    throw new Error("Non-deterministic generated artifacts:\n- " + changed.join("\n- "));
  }
  process.stdout.write(
    "[determinism] OK — " + first.size + " generated artifacts are byte-identical across two builds.\n"
  );
} catch (error) {
  process.stderr.write("[determinism] FAILED — " + (error && error.message ? error.message : error) + "\n");
  process.exit(1);
}
