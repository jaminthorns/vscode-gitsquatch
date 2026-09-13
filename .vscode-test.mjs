import { defineConfig } from "@vscode/test-cli"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

const dataDir = mkdtempSync(join(tmpdir(), "gitsquatch-test-user-data-"))
const repoDir = mkdtempSync(join(tmpdir(), "gitsquatch-test-repository-"))

export default defineConfig([
  {
    files: "out/test/**/*.integration.test.js",
    launchArgs: ["--user-data-dir", dataDir],
    workspaceFolder: repoDir,
  },
])
