#!/usr/bin/env bun
/**
 * PostToolUseFailure hook: log write failures to activity log.
 */

import { logEvent } from "./activity-log.js";

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const hookInput = JSON.parse(input);
    const filePath: string = hookInput?.tool_input?.file_path ?? "unknown";
    logEvent("write_failure", filePath, "guard");
    const filename = filePath.split("/").pop() ?? "unknown";
    console.log(`⚠️ 쓰기 실패: ${filename}`);
  } catch {
    // never fail
  }
  process.exit(0);
});
