import assert, { fail } from "assert/strict"
import * as vscode from "vscode"
import { activate } from "./util"

suite("Activation", () => {
  test("initializes repositories", async () => {
    const api = await activate()
    const repositories = api.repositories.allRepositories()

    const folders = vscode.workspace.workspaceFolders

    if (folders === undefined || folders.length === 0) {
      fail("Expected a workspace folder")
    }

    const directory = folders[0].uri

    assert(repositories.some((r) => r.directory.fsPath === directory.fsPath))
  })

  test("initializes branches", async () => {
    const api = await activate()
    const repositories = api.repositories.allRepositories()

    if (repositories.length === 0) {
      fail("Expected a repository")
    }

    const repository = repositories[0]

    assert(repository.localBranches.findMatches("test-branch").length === 1)
  })

  test("initializes filenames", async () => {
    const api = await activate()
    const repositories = api.repositories.allRepositories()

    if (repositories.length === 0) {
      fail("Expected a repository")
    }

    const repository = repositories[0]

    assert(repository.filenames.findMatches("test_file").length === 1)
  })
})
