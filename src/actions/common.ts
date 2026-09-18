import { join } from "path"
import * as vscode from "vscode"
import { Commit } from "../Commit"
import { SelectableQuickPickItem } from "../quickPick"
import { RemoteProvider } from "../remoteProviders"
import { Repository } from "../Repository"
import { git } from "../util/git"

export function relativeGitUri(
  filename: string,
  commit: Commit | null,
  cwd: string,
): vscode.Uri {
  const path = join(cwd, filename)
  const ref = commit?.full ?? "0000000000000000000000000000000000000000"

  return vscode.Uri.from({
    scheme: "git",
    path,
    query: JSON.stringify({ path, ref }),
  })
}

export async function commitRemotes(
  commit: Commit,
  repository: Repository,
): Promise<RemoteProvider[]> {
  const remoteProviders = repository.remoteProviders.sorted()

  if (remoteProviders.length === 0) {
    return []
  }

  // The performance of checking whether every remote branch contains a commit
  // becomes noticeably slow in repositories with long history and many remote
  // branches.
  const args = ["-r", "--contains", commit.full]
  const output = await git("branch", args, { cwd: repository.directory.fsPath })
  const branches = output.split("\n").map((b) => b.trim())

  return remoteProviders.filter(({ remote }) => {
    const match = branches.find((b) => b.startsWith(remote.name))
    return match !== undefined
  })
}

type ShowOption = "editor" | "terminal"

interface ShowOptions {
  tooltip: string
  onSelected: () => void
}

const showIcons = {
  editor: "go-to-file",
  terminal: "terminal",
}

export function showItem({
  item,
  configKey,
  showOptions,
}: {
  item: SelectableQuickPickItem
  configKey: string
  showOptions: Record<ShowOption, ShowOptions>
}) {
  const showDefault = vscode.workspace
    .getConfiguration("gitsquatch.showDefault")
    .get(configKey) as ShowOption
  const showSecondary = showDefault === "editor" ? "terminal" : "editor"
  const showDefaultOptions = showOptions[showDefault]
  const showSecondaryOptions = showOptions[showSecondary]

  return {
    ...item,
    onSelected: showDefaultOptions.onSelected,
    buttons: [
      {
        tooltip: showSecondaryOptions.tooltip,
        iconPath: new vscode.ThemeIcon(showIcons[showSecondary]),
        onSelected: showSecondaryOptions.onSelected,
      },
    ],
  }
}

export async function openDiffInEditor(
  fromCommit: Commit | null,
  toCommit: Commit,
  title: string,
  repository: Repository,
) {
  const cwd = repository.directory.fsPath

  const nameStatuses = await diffNameStatuses(fromCommit, toCommit, cwd)

  const resources = nameStatuses.map((ns) => {
    switch (ns.status) {
      case "A":
        return {
          originalUri: undefined,
          modifiedUri: relativeGitUri(ns.filename, toCommit, cwd),
        }

      case "M":
        return {
          originalUri: relativeGitUri(ns.filename, fromCommit, cwd),
          modifiedUri: relativeGitUri(ns.filename, toCommit, cwd),
        }

      case "D":
        return {
          originalUri: relativeGitUri(ns.filename, fromCommit, cwd),
          modifiedUri: undefined,
        }

      case "R":
        return {
          originalUri: relativeGitUri(ns.fromFilename, fromCommit, cwd),
          modifiedUri: relativeGitUri(ns.filename, toCommit, cwd),
        }
    }
  })

  const multiDiffSourceUri = vscode.Uri.from({
    scheme: "git-commit",
    path: cwd,
    query: JSON.stringify({
      path: cwd,
      ref: toCommit.full,
    }),
  })

  vscode.commands.executeCommand("_workbench.openMultiDiffEditor", {
    multiDiffSourceUri,
    title,
    resources,
  })
}

type DiffNameStatus =
  | {
      status: "A" | "D" | "M"
      filename: string
    }
  | {
      status: "R"
      filename: string
      fromFilename: string
    }

export async function diffNameStatuses(
  fromCommit: Commit | null,
  toCommit: Commit,
  cwd: string,
): Promise<DiffNameStatus[]> {
  const commits =
    fromCommit === null ? [toCommit.full] : [fromCommit.full, toCommit.full]

  const args = [
    "-r",
    "--root",
    "--no-commit-id",
    "--find-renames",
    "--name-status",
    "--diff-filter=ADMR",
    ...commits,
  ]

  const output = await git("diff-tree", args, { cwd })
  const lines = output.split("\n").map((line) => line.split("\t"))

  return lines.map(([status, ...filenames]): DiffNameStatus => {
    if (status === "A" || status === "D" || status === "M") {
      return {
        status,
        filename: filenames[0],
      }
    } else if (status.startsWith("R")) {
      return {
        status: "R",
        fromFilename: filenames[0],
        filename: filenames[1],
      }
    }

    throw Error(`Unexpected diff status: ${status}`)
  })
}

export async function firstParentCommit(
  revision: string,
  cwd: string,
): Promise<Commit | null> {
  return await Commit(`${revision}^`, cwd)
}
