#!/usr/bin/env node
/**
 * QA loop gate — Cursor `stop` hook.
 *
 * Reads the stop event JSON on stdin and decides whether the agent is "done".
 * - If a gate command fails, returns { followup_message } so the agent keeps
 *   fixing (the loop). `loop_limit` in hooks.json caps runaway loops.
 * - If everything passes, prints nothing -> the agent stops.
 *
 * The hook is a NO-OP unless MOTUS_QA_LOOP=1, so normal sessions are unaffected.
 *
 * Env:
 *   MOTUS_QA_LOOP=1            enable the loop (required; otherwise no-op)
 *   MOTUS_ACTIVE_SPEC=path     spec file the loop is working against (for messaging)
 *   MOTUS_QA_CMDS="a;;b"       ';;'-separated shell commands to run as the gate.
 *                              Default: "npm run lint"
 *   MOTUS_QA_TYPECHECK=1       also run "npx tsc --noEmit" (off by default because
 *                              pre-existing type errors can trap the loop).
 *
 * No external deps (no jq). Pure Node + child_process.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Drain stdin (the stop-event JSON). We don't need the payload to decide the
// gate, but reading it keeps the hook protocol clean.
try {
  readFileSync(0, "utf8");
} catch {
  // no stdin available — fine.
}

function stop() {
  // Empty output => agent stops normally.
  process.exit(0);
}

function loopWith(message) {
  process.stdout.write(JSON.stringify({ followup_message: message }));
  process.exit(0);
}

// --- Gate disabled unless explicitly enabled ---------------------------------
if (process.env.MOTUS_QA_LOOP !== "1") {
  stop();
}

const activeSpec = process.env.MOTUS_ACTIVE_SPEC || "specs/<your-spec>.md";

const commands = (
  process.env.MOTUS_QA_CMDS
    ? process.env.MOTUS_QA_CMDS.split(";;")
    : ["npm run lint"]
)
  .map((c) => c.trim())
  .filter(Boolean);

if (process.env.MOTUS_QA_TYPECHECK === "1") {
  commands.push("npx tsc --noEmit");
}

const failures = [];

for (const cmd of commands) {
  try {
    execSync(cmd, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 240000,
      encoding: "utf8",
    });
  } catch (err) {
    const out = `${err.stdout || ""}${err.stderr || ""}`.trim();
    const tail = out.split("\n").slice(-40).join("\n");
    failures.push(`### \`${cmd}\` failed\n${tail || "(no output captured)"}`);
  }
}

if (failures.length === 0) {
  // All gates green -> stop the loop.
  stop();
}

const message = [
  `QA gate FAILED for spec \`${activeSpec}\`. Do not stop yet — fix and continue.`,
  ``,
  `Fix the issues below, then re-verify against the spec's acceptance criteria and Definition of Done (see specs/README.md). When all gate commands pass, stop.`,
  ``,
  failures.join("\n\n"),
].join("\n");

loopWith(message);
