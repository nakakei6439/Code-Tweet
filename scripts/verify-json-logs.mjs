#!/usr/bin/env node
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    since: { type: "string", default: "1h" },
    limit: { type: "string", default: "200" },
    level: { type: "string", default: "error" },
  },
  strict: false,
});

const cliArgs = [
  "logs",
  "--environment", "production",
  "--since", values.since,
  "--limit", values.limit,
  "--json",
];
if (values.level !== "all") {
  cliArgs.push("--level", values.level);
}

console.log(`$ vercel ${cliArgs.join(" ")}`);
const proc = spawn("vercel", cliArgs, { stdio: ["ignore", "pipe", "inherit"] });

let stdout = "";
proc.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

proc.on("error", (err) => {
  console.error(`Failed to spawn vercel CLI: ${err.message}`);
  process.exit(1);
});

proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`vercel logs exited with code ${code}`);
    process.exit(code ?? 1);
  }
  analyze(stdout);
});

function extractMessage(record) {
  if (typeof record.message === "string") return record.message;
  if (typeof record.text === "string") return record.text;
  if (typeof record.log === "string") return record.log;
  if (record.payload && typeof record.payload.message === "string") {
    return record.payload.message;
  }
  return null;
}

function analyze(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    console.log("No log lines returned in the window.");
    process.exit(0);
  }

  let totalRecords = 0;
  let structuredCount = 0;
  let legacyCount = 0;
  const levelCounts = {};
  const samples = [];

  for (const line of lines) {
    let outer;
    try {
      outer = JSON.parse(line);
    } catch {
      continue;
    }
    totalRecords += 1;
    const level = outer.level ?? "unknown";
    levelCounts[level] = (levelCounts[level] ?? 0) + 1;

    const message = extractMessage(outer);
    if (!message) continue;

    let inner = null;
    try {
      inner = JSON.parse(message);
    } catch {
      inner = null;
    }

    if (
      inner &&
      typeof inner === "object" &&
      typeof inner.scope === "string" &&
      typeof inner.level === "string" &&
      typeof inner.timestamp === "string"
    ) {
      structuredCount += 1;
      if (samples.length < 3) samples.push(inner);
    } else if (/^\[[A-Za-z0-9/_-]+\]/.test(message)) {
      legacyCount += 1;
    }
  }

  console.log("");
  console.log(`Total log records: ${totalRecords}`);
  console.log("Levels:", levelCounts);
  console.log(`Structured (logger.ts JSON): ${structuredCount}`);
  console.log(`Legacy "[scope] msg" lines: ${legacyCount}`);

  if (samples.length > 0) {
    console.log("\nSample structured logs:");
    for (const s of samples) {
      console.log("  -", JSON.stringify(s));
    }
  }

  if (structuredCount > 0) {
    console.log("\nOK: structured JSON logs are being emitted.");
    process.exit(0);
  }
  if (legacyCount > 0) {
    console.log("\nFAIL: legacy unstructured error logs detected — replacement may be incomplete.");
    process.exit(1);
  }
  console.log("\nOK: no errors in the window.");
  process.exit(0);
}
