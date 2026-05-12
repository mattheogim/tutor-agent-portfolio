#!/usr/bin/env bun
/**
 * UserPromptSubmit hook: log user messages to activity log.
 */

import { logEvent } from "./activity-log.js";

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const hookInput = JSON.parse(input);
    const msg = ((hookInput?.user_prompt as string) ?? "").slice(0, 80);
    logEvent("user_message", msg, "system");
  } catch {
    // never fail
  }
  process.exit(0);
});
