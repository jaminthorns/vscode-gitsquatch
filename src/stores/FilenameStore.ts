import { writeFile } from "fs"
import { join } from "path"
import * as vscode from "vscode"
import { ignoreReferenceFile } from "../references"
import { Trie } from "../Trie"
import { git } from "../util/git"
import { streamCommand } from "../util/os"
import { isDirectory } from "../util/vscode"

type FilenameTrie = Trie<null>

export interface FilenameStore extends vscode.Disposable {
  findMatches: FilenameTrie["findMatches"]
  writeToFile(): void
}

export async function FilenameStore(
  gitDir: string,
  cwd: string,
): Promise<FilenameStore> {
  const filenames: FilenameTrie = Trie()

  const filenameWatcher = await setupFilenameWatcher(filenames, gitDir, cwd)

  loadFilenames(filenames, cwd)

  return {
    findMatches(...args) {
      return filenames.findMatches(...args)
    },

    writeToFile() {
      const debugFilename = `filenames_${Date.now()}`
      const debugFilePath = join(cwd, debugFilename)
      const filenamesData = filenames
        .entries()
        .map(([filename]) => filename)
        .join("\n")

      writeFile(debugFilePath, filenamesData, () => {
        console.debug(`Filenames written to ${debugFilePath}`)
      })
    },

    dispose() {
      filenameWatcher.dispose()
      filenames.clear()
    },
  }
}

async function setupFilenameWatcher(
  filenames: FilenameTrie,
  gitDir: string,
  cwd: string,
): Promise<vscode.FileSystemWatcher> {
  const initialCommit = await git("rev-parse", ["HEAD"], { cwd })

  const dir = join(gitDir, "refs")
  const pattern = new vscode.RelativePattern(dir, "**/*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate(async (uri) => {
    if (ignoreReferenceFile(uri) || (await isDirectory(uri))) {
      return
    }

    const content = await vscode.workspace.fs.readFile(uri)
    const commit = content.toString().trim()

    loadFilenames(filenames, cwd, `${initialCommit}..${commit}`)
  })

  return watcher
}

function loadFilenames(filenames: FilenameTrie, cwd: string, range?: string) {
  let args = [
    "--name-only",
    "--no-renames",
    "--diff-merges=first-parent",
    "--diff-filter=A",
    "--format=",
  ]

  args = range === undefined ? ["--all", ...args] : [range, ...args]

  streamCommand("git", ["log", ...args], cwd, (filename) => {
    filenames.set(filename, null)
  })
}
