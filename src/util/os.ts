import { spawn } from "child_process"
import { createInterface } from "readline"
import * as vscode from "vscode"

export interface CommandOptions {
  directory?: vscode.Uri
  stdin?: string
  ignoreNonZeroExitCode?: boolean
}

export async function runCommand(
  command: string,
  args: string[],
  options: CommandOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdoutData: Uint8Array[] = []
    const stderrData: Uint8Array[] = []
    const process = spawn(command, args, { cwd: options.directory?.fsPath })

    if (options.stdin !== undefined) {
      process.stdin.end(options.stdin)
    }

    process.stdout.on("data", (data) => stdoutData.push(data))
    process.stderr.on("data", (data) => stderrData.push(data))

    process.on("close", (code) => {
      if (code === 0 || options.ignoreNonZeroExitCode) {
        const stdout = Buffer.concat(stdoutData).toString()
        resolve(stdout.trim())
      } else {
        const stderr = Buffer.concat(stderrData).toString()
        reject(new Error(stderr.trim()))
      }
    })
  })
}

export function streamCommand(
  command: string,
  args: string[],
  directory: vscode.Uri | undefined,
  onLineOutput: (output: string) => unknown,
) {
  const process = spawn(command, args, { cwd: directory?.fsPath })
  const readline = createInterface({ input: process.stdout, terminal: false })

  readline.on("line", onLineOutput)
}
