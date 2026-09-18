import { fail } from "assert/strict"
import * as vscode from "vscode"
import { GitSquatchApi } from "../extension"

export async function activate(): Promise<GitSquatchApi> {
  const extension = vscode.extensions.getExtension<GitSquatchApi>(
    "jaminthorns.gitsquatch",
  )

  if (extension === undefined) {
    fail("Extension not found")
  }

  if (!extension.isActive) {
    await extension.activate()
  }

  return extension.exports
}
