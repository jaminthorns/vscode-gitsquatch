import * as vscode from "vscode"
import { Repository } from "../Repository"
import { RepositoryStore } from "../stores"
import { TerminalContext } from "../TerminalContext"
import { UserGitCommand } from "../UserGitCommand"
import { git, uriRevision } from "./git"

export async function isDirectory(uri: vscode.Uri): Promise<boolean> {
  const { type } = await vscode.workspace.fs.stat(uri)
  return type === vscode.FileType.Directory
}

// Needed for opening URLs without encoding issues.
// https://github.com/microsoft/vscode/issues/85930
export async function openUrl(url: vscode.Uri): Promise<Boolean> {
  return await (
    vscode.env.openExternal as unknown as (target: string) => Thenable<boolean>
  )(url.toString())
}

export function runCommandInTerminal({
  name,
  icon,
  cwd,
  command,
  context,
  env,
  onClose,
}: {
  name: string
  icon: string
  cwd: vscode.Uri
  command: string
  context?: TerminalContext
  env?: Record<string, string>
  onClose?: Function
}) {
  const iconPath = new vscode.ThemeIcon(icon)
  const options = { name, iconPath, cwd, context, env }
  const terminal = vscode.window.createTerminal(options)

  if (onClose !== undefined) {
    const listener = vscode.window.onDidCloseTerminal((t) => {
      if (t === terminal) {
        onClose()
        listener.dispose()
      }
    })
  }

  terminal.show()
  terminal.sendText(command)
}

export function userGitCommand(command: UserGitCommand): string {
  const commandStr = vscode.workspace
    .getConfiguration("gitsquatch.gitCommands")
    .get(command.key) as string

  const matches = Array.from(commandStr.matchAll(/( *)\${(\w+)}( *)/g))
  const variables = command.variables as Record<string, string | string[]>

  return matches.reduce((commandStr, [substitution, lPad, name, rPad]) => {
    let variable = variables[name]
    const isString = typeof variable === "string"
    const isNonEmptyArray = Array.isArray(variable) && variable.length > 0

    if (isString || isNonEmptyArray) {
      if (Array.isArray(variable)) {
        variable = variable.join(" ")
      }

      return commandStr.replace(substitution, `${lPad}${variable}${rPad}`)
    } else {
      const noPad = `${lPad}${rPad}`.length === 0
      return commandStr.replace(substitution, noPad ? "" : " ")
    }
  }, commandStr)
}

export interface CommitFilenamesOptions {
  reverse?: boolean
}

export async function getValidatedRepository(
  uri: vscode.Uri,
  repositories: RepositoryStore,
  noun: string,
): Promise<Repository | undefined> {
  const repository = repositories.getRepository(uri)
  const filename = vscode.workspace.asRelativePath(uri, false)

  if (repository === undefined) {
    vscode.window.showErrorMessage(`${noun} not in repository: ${filename}`)
    return
  }

  if (uriRevision(uri) !== "HEAD") {
    return repository
  }

  try {
    await git("ls-files", ["--error-unmatch", filename], {
      directory: repository.directory,
    })

    return repository
  } catch (error) {
    vscode.window.showErrorMessage(`${noun} not tracked: ${filename}`)
    return
  }
}
