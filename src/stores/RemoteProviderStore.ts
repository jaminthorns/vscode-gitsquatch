import { basename, join } from "path"
import * as vscode from "vscode"
import { Remote } from "../Remote"
import { RemoteProvider } from "../remoteProviders"
import { excludeNulls } from "../util/general"
import { git } from "../util/git"

export interface RemoteProviderStore extends vscode.Disposable {
  sorted(): RemoteProvider[]
}

export function RemoteProviderStore(
  gitDir: string,
  cwd: string,
): RemoteProviderStore {
  const providers: Map<string, RemoteProvider> = new Map()

  const remoteWatcher = setupRemoteWatcher(providers, gitDir, cwd)

  loadProviders(providers, cwd)

  return {
    sorted() {
      return Array.from(providers.values()).sort((a, b) => {
        // Show "origin" remote at the top with the rest sorted alphabetically.
        switch (true) {
          case a.remote.name === "origin":
            return -1
          case b.remote.name === "origin":
            return 1
          default:
            return a.remote.name.localeCompare(b.remote.name)
        }
      })
    },

    dispose() {
      remoteWatcher.dispose()
    },
  }
}

function setupRemoteWatcher(
  providers: Map<string, RemoteProvider>,
  gitDir: string,
  cwd: string,
): vscode.FileSystemWatcher {
  const dir = join(gitDir, "refs", "remotes")
  const pattern = new vscode.RelativePattern(dir, "*")
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)

  watcher.onDidCreate(async (uri) => {
    const name = basename(uri.fsPath)
    const remote = await Remote(name, cwd)

    if (remote !== null) {
      providers.set(name, RemoteProvider(remote))
    }
  })

  watcher.onDidDelete((uri) => {
    providers.delete(basename(uri.fsPath))
  })

  return watcher
}

async function loadProviders(
  providers: Map<string, RemoteProvider>,
  cwd: string,
): Promise<void> {
  const output = await git("remote", [], { cwd })
  const names = output === "" ? [] : output.split("\n")
  const remotes = await Promise.all(names.map((n) => Remote(n, cwd)))
  const remoteProviders = excludeNulls(remotes).map(RemoteProvider)

  remoteProviders.forEach((provider) => {
    providers.set(provider.remote.name, provider)
  })
}
