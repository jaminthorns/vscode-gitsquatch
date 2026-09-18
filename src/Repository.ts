import { resolve } from "path"
import * as vscode from "vscode"
import {
  FilenameStore,
  LocalBranchStore,
  ReferenceStore,
  RemoteBranchStore,
  RemoteProviderStore,
  TagStore,
} from "./stores"
import { git } from "./util/git"

export interface Repository extends vscode.Disposable {
  directory: vscode.Uri
  remoteProviders: RemoteProviderStore
  filenames: FilenameStore
  localBranches: ReferenceStore
  remoteBranches: ReferenceStore
  tags: ReferenceStore
}

export async function Repository(
  folder: vscode.WorkspaceFolder,
): Promise<Repository> {
  const directory = folder.uri
  const cwd = directory.fsPath

  const gitDirRel = await git("rev-parse", ["--git-common-dir"], { cwd })
  const gitDir = resolve(cwd, gitDirRel)

  const remoteProviders = RemoteProviderStore(gitDir, cwd)
  const filenames = await FilenameStore(gitDir, cwd)
  const localBranches = LocalBranchStore(gitDir, cwd)
  const remoteBranches = RemoteBranchStore(gitDir, cwd)
  const tags = TagStore(gitDir, cwd)

  return {
    directory,
    remoteProviders,
    filenames,
    localBranches,
    remoteBranches,
    tags,

    dispose() {
      remoteProviders.dispose()
      filenames.dispose()
      localBranches.dispose()
      remoteBranches.dispose()
      tags.dispose()
    },
  }
}
