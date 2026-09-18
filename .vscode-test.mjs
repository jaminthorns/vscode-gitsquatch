import { defineConfig } from "@vscode/test-cli"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { initRepo } from "./out/test/setup.js"

const dataDir = mkdtempSync(join(tmpdir(), "gitsquatch-test-user-data-"))

export default defineConfig([
  {
    files: "out/test/activation.integration.test.js",
    launchArgs: ["--user-data-dir", dataDir],
    workspaceFolder: await initRepo(),
  },
])
