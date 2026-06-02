import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import * as vscode from "vscode"
import { git } from "../util"

suite("Git repository", () => {
  test("create it", async () => {
    const repoPath = mkdtempSync(join(tmpdir(), "gitsquatch-test-repository-"))
    const directory = vscode.Uri.file(repoPath)

    await git("init", [], { directory })

    const testFilePath = join(repoPath, "test_file")

    writeFileSync(testFilePath, "test")

    await git("add", [testFilePath], { directory })
    await git("commit", ["--message=Test Commit"], { directory })
    await git("branch", ["test-branch"], { directory })

    const log = await git("log", [], { directory })

    console.log(log)

    rmSync(repoPath, { recursive: true, force: true })
  })
})
