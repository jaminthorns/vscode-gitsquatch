import { mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { git } from "../util/git"

export async function initRepo(): Promise<string> {
  const repoPath = mkdtempSync(join(tmpdir(), "gitsquatch-test-repository-"))

  await git("init", [], { cwd: repoPath })

  const testFilePath = join(repoPath, "test_file")

  writeFileSync(testFilePath, "test")

  await git("add", [testFilePath], { cwd: repoPath })
  await git("commit", ["--message=Test Commit"], { cwd: repoPath })
  await git("branch", ["test-branch"], { cwd: repoPath })

  return repoPath
}
