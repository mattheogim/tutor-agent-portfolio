#!/usr/bin/env bun
/**
 * PreToolUse hook: BOUNDARY enforcement for SKILL.md and ETHOS.md.
 * Blocks Read access to skill definition files.
 *
 * Exit 0 = allow, Exit 1 = block (hook convention for PreToolUse).
 */

import { logEvent } from "./activity-log.js";

const BLOCKED_FILES = ["SKILL.md", "ETHOS.md"];

function main(): void {
  let input = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try {
      const hookInput = JSON.parse(input);
      const toolInput = hookInput?.tool_input ?? {};
      const filePath: string = toolInput.file_path ?? "";

      if (!filePath) process.exit(0);

      const filename = filePath.split("/").pop() ?? "";

      if (BLOCKED_FILES.includes(filename)) {
        logEvent("boundary_block", `${filename} 읽기 차단 (${filePath})`, "guard");
        process.stderr.write(`🛡️ BOUNDARY: ${filename} 읽기 차단\n`);
        process.exit(1);
      }

      process.exit(0);
    } catch {
      process.exit(0); // on error, don't block
    }
  });
}

main();
