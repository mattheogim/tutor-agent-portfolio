#!/usr/bin/env bun
/**
 * PostToolUse hook: auto-backup managed files before overwrite.
 * Reads hook input JSON from stdin, copies written file to .versions/,
 * appends to change_log.md, and logs to activity log.
 *
 * Exit 0 always — never block the main agent.
 */

import { copyFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { dirname, basename, extname, join } from "path";
import { logEvent } from "./activity-log.js";

function main(): void {
  let input = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try {
      const hookInput = JSON.parse(input);
      const toolInput = hookInput?.tool_input ?? {};
      const filePath: string = toolInput.file_path ?? "";

      if (!filePath || !existsSync(filePath)) {
        process.exit(0); // new file, nothing to back up
      }

      const fileDir = dirname(filePath);
      const fileName = basename(filePath);
      const ext = extname(fileName);
      const namePart = fileName.slice(0, -ext.length || undefined);

      // Create .versions/ directory
      const versionsDir = join(fileDir, ".versions");
      mkdirSync(versionsDir, { recursive: true });

      // Create timestamped backup
      const now = new Date();
      const ts = now.toISOString().replace(/[T:]/g, "_").replace(/\..+/, "").replace(/-/g, "-");
      const formattedTs = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      const backupName = `${namePart}_${formattedTs}${ext}`;
      const backupPath = join(versionsDir, backupName);

      copyFileSync(filePath, backupPath);

      // Find and append to change_log.md
      let searchDir = fileDir;
      let changeLogPath: string | null = null;
      for (let i = 0; i < 6; i++) {
        const candidate = join(searchDir, "analysis", "change_log.md");
        if (existsSync(join(searchDir, "analysis"))) {
          changeLogPath = candidate;
          break;
        }
        const parent = dirname(searchDir);
        if (parent === searchDir) break;
        searchDir = parent;
      }

      if (changeLogPath) {
        mkdirSync(dirname(changeLogPath), { recursive: true });
        const dateStr = now.toISOString().replace("T", " ").slice(0, 19);
        const entry =
          `\n## ${dateStr} — ${fileName} updated\n` +
          `- **Trigger**: hook (auto_backup)\n` +
          `- **Change**: pre-write backup created\n` +
          `- **Backup**: ${backupPath}\n`;
        appendFileSync(changeLogPath, entry, "utf-8");
      }

      // Log to activity log
      const shortBackup = `${fileName} → .versions/${backupName}`;
      logEvent("backup_created", shortBackup, "file");

      // Print feedback
      console.log(`💾 백업: ${shortBackup}`);
    } catch {
      // never fail, never block
    }
    process.exit(0);
  });
}

main();
