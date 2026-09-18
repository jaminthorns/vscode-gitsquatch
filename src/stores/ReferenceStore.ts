import { writeFile } from "fs"
import { join, relative } from "path"
import * as vscode from "vscode"
import {
  ReferenceType,
  ignoreReferenceFile,
  referenceInfo,
  referenceValid,
} from "../references"
import { Trie } from "../Trie"
import { streamCommand } from "../util/os"
import { isDirectory } from "../util/vscode"

type ReferenceTrie = Trie<null>

export interface ReferenceStore extends vscode.Disposable {
  findMatches: ReferenceTrie["findMatches"]
  entries: ReferenceTrie["entries"]
  writeToFile(): void
}

export function ReferenceStore({
  type,
  gitSubcommand,
  gitArgs,
  debugFilePrefix,
  debugMessageLabel,
  gitDir,
  cwd,
}: {
  type: ReferenceType
  gitSubcommand: string
  gitArgs: string[]
  debugFilePrefix: string
  debugMessageLabel: string
  gitDir: string
  cwd: string
}): ReferenceStore {
  const references: ReferenceTrie = Trie()

  const referencesWatcher = setupReferenceWatcher(type, references, gitDir, cwd)

  loadReferences(references, gitSubcommand, gitArgs, cwd)

  return {
    findMatches(...args) {
      return references.findMatches(...args)
    },

    entries(...args) {
      return references.entries(...args)
    },

    writeToFile() {
      const debugFilename = `${debugFilePrefix}_${Date.now()}`
      const debugFilePath = join(cwd, debugFilename)
      const referencesData = references
        .entries()
        .map(([reference]) => reference)
        .join("\n")

      writeFile(debugFilePath, referencesData, () => {
        console.debug(`${debugMessageLabel} written to ${debugFilePath}`)
      })
    },

    dispose() {
      referencesWatcher.dispose()
    },
  }
}

// TODO: Handle reftable repositories.
//
// Solution: Read the reflog! (credit to Claude for idea)
export function setupReferenceWatcher(
  type: ReferenceType,
  references: ReferenceTrie,
  gitDir: string,
  cwd: string,
): vscode.FileSystemWatcher {
  const refDir = referenceInfo[type].directory
  const refsDir = join(gitDir, "refs", refDir)
  const pattern = new vscode.RelativePattern(refsDir, "**/*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate(async (uri) => {
    if (ignoreReferenceFile(uri) || (await isDirectory(uri))) {
      return
    }

    const ref = relative(refsDir, uri.fsPath)

    references.set(ref, null)
  })

  // TODO: Handle deleting of packed refs.
  watcher.onDidDelete((uri) => {
    if (ignoreReferenceFile(uri)) {
      return
    }

    const refOrDir = relative(refsDir, uri.fsPath)

    references.entries(refOrDir).forEach(async ([ref]) => {
      // Valid references get deleted when being packed.
      if (await referenceValid(ref, type, cwd)) {
        return
      }

      references.delete(ref)
    })
  })

  return watcher
}

export function loadReferences(
  references: ReferenceTrie,
  gitSubcommand: string,
  gitArgs: string[],
  cwd: string,
) {
  streamCommand("git", [gitSubcommand, ...gitArgs], cwd, (ref) => {
    references.set(ref, null)
  })
}
