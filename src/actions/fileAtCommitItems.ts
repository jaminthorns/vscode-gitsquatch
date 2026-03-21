import { basename } from "path"
import * as vscode from "vscode"
import { Commit } from "../Commit"
import { SelectableQuickPickItem } from "../quickPick"
import { RemoteProvider } from "../remoteProviders"
import { Repository } from "../Repository"
import {
  CommitFilenamesOptions,
  commitFilenames,
  excludeNulls,
  reverseHistoryArgs,
  runCommandInTerminal,
  userGitCommand,
} from "../util"
import {
  diffNameStatuses,
  firstParentCommit,
  relativeGitUri,
  showItem,
} from "./common"
import { remoteAction } from "./remoteAction"

export function fileAtCommitItems(
  repository: Repository,
  remotes: Promise<RemoteProvider[]>,
  commit: Commit,
  filename: string,
): SelectableQuickPickItem[] {
  const fileLabel = `${basename(filename)} (${commit.short})`
  const variables = { revision: commit.full, filename }

  const getContext = (commitFilenamesOptions: CommitFilenamesOptions = {}) => ({
    commit,
    filename,
    commitFilenames: commitFilenames(
      commit.full,
      filename,
      repository.directory,
      commitFilenamesOptions,
    ),
  })

  return excludeNulls([
    {
      label: fileLabel,
      kind: vscode.QuickPickItemKind.Separator,
    },
    showItem({
      item: { label: "$(file) Open File at Commit" },
      configKey: "fileAtRevision",
      showOptions: {
        editor: {
          tooltip: "Open File at Commit (Editor)",
          onSelected: () => {
            const uri = relativeGitUri(filename, commit, repository.directory)

            vscode.commands.executeCommand("vscode.open", uri, {}, fileLabel)
          },
        },
        terminal: {
          tooltip: "Open File at Commit (Terminal)",
          onSelected: () => {
            runCommandInTerminal({
              name: fileLabel,
              icon: "file",
              cwd: repository.directory,
              command: userGitCommand({
                key: "openFileAtRevision",
                variables,
              }),
              context: getContext(),
            })
          },
        },
      },
    }),
    showItem({
      item: { label: "$(git-compare) File Diff at Commit" },
      configKey: "fileDiffAtRevision",
      showOptions: {
        editor: {
          tooltip: "File Diff at Commit (Editor)",
          onSelected: async () => {
            await openFileDiffInEditor(filename, commit, repository)
          },
        },
        terminal: {
          tooltip: "File Diff at Commit (Terminal)",
          onSelected: () => {
            runCommandInTerminal({
              name: fileLabel,
              icon: "git-compare",
              cwd: repository.directory,
              command: userGitCommand({
                key: "fileDiffAtRevision",
                variables,
              }),
              context: getContext(),
            })
          },
        },
      },
    }),
    {
      label: "$(history) File History from Commit",
      onSelected: () => {
        runCommandInTerminal({
          name: fileLabel,
          icon: "history",
          cwd: repository.directory,
          command: userGitCommand({
            key: "fileHistory",
            variables,
          }),
          context: getContext(),
        })
      },
      buttons: [
        {
          tooltip: "File History from Commit (Reverse)",
          iconPath: new vscode.ThemeIcon("history"),
          onSelected: () => {
            runCommandInTerminal({
              name: `${fileLabel} (Reverse)`,
              icon: "history",
              cwd: repository.directory,
              command: userGitCommand({
                key: "fileHistory",
                variables: { ...reverseHistoryArgs(commit.full), filename },
              }),
              context: getContext({ reverse: true }),
            })
          },
        },
      ],
    },
    {
      placeholder: { label: "$(loading~spin) Loading remotes..." },
      pending: remotes.then((remotes) => {
        return remoteAction(
          remotes,
          { label: "$(link-external) Open File on Remote" },
          (provider) => provider.fileAtCommitUrl(commit, filename),
        )
      }),
    },
  ])
}

async function openFileDiffInEditor(
  filename: string,
  commit: Commit,
  repository: Repository,
) {
  const { directory } = repository

  const firstParent = await firstParentCommit(commit.full, directory)
  const nameStatuses = await diffNameStatuses(firstParent, commit, directory)
  const nameStatus = nameStatuses.find((ns) => ns.filename === filename)

  if (nameStatus === undefined) {
    const message = `File has no changes at commit ${commit.short}.`
    vscode.window.showErrorMessage(message)

    return
  }

  const prevFilename =
    nameStatus.status === "R" ? nameStatus.fromFilename : nameStatus.filename

  let title

  if (firstParent === null) {
    title = `${basename(filename)} (added in ${commit.short})`
  } else {
    const left = `${basename(prevFilename)} (${firstParent.short})`
    const right = `${basename(filename)} (${commit.short})`

    title = `${left} ↔ ${right}`
  }

  vscode.commands.executeCommand(
    "vscode.diff",
    relativeGitUri(prevFilename, firstParent, directory),
    relativeGitUri(filename, commit, directory),
    title,
  )
}
