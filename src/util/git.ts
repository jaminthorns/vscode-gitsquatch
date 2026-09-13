import { basename } from "path"
import * as vscode from "vscode"
import { CommitFilenames } from "../TerminalContext"
import { chunk } from "./general"
import { CommandOptions, runCommand } from "./os"

export interface GitCommandOptions extends CommandOptions {
  directory: vscode.Uri
}

export async function git(
  subCommand: string,
  args: string[],
  options: GitCommandOptions,
): Promise<string> {
  return await runCommand("git", [subCommand, ...args], options)
}

export function reverseHistoryArgs(revision: string): {
  revision: string
  reverseFlags: string[]
} {
  return {
    revision: `${revision}..HEAD`,
    reverseFlags: ["--reverse", "--ancestry-path"],
  }
}

// TODO: This needs to be refactored to provide the revision and a relative path
export function uriRevision(uri: vscode.Uri): string {
  if (uri.scheme === "file") {
    return "HEAD"
  } else if (uri.scheme === "git" || uri.scheme === "git-commit") {
    return JSON.parse(uri.query).ref
  } else if (uri.scheme === "scm-history-item" && uri.query !== "") {
    return JSON.parse(uri.query).historyItemId
  } else if (uri.scheme === "scm-history-item" && uri.query === "") {
    return basename(uri.path).split("..")[1]
  } else {
    throw Error(`Cannot get revision from URI: ${uri}`)
  }
}

export interface CommitFilenamesOptions {
  reverse?: boolean
}

// Get a mapping of commits to historical filenames for every commit in which a
// given path was changed.
export async function commitFilenames(
  revision: string,
  path: string,
  directory: vscode.Uri,
  options: CommitFilenamesOptions = {},
): Promise<CommitFilenames | null> {
  try {
    const { revision: revisionArg, reverseFlags } =
      (options.reverse ?? false)
        ? reverseHistoryArgs(revision)
        : { revision, reverseFlags: [] }

    const args = [
      "--follow",
      "--name-only",
      "--format=%H",
      ...reverseFlags,
      revisionArg,
      "--",
      path,
    ]

    const output = await git("log", args, { directory })

    return new Map(chunk(output.split(/\n+/), 2) as [string, string][])
  } catch (error) {
    return null
  }
}
