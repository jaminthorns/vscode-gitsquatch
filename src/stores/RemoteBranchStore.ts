import { ReferenceStore } from "./ReferenceStore"

export function RemoteBranchStore(gitDir: string, cwd: string): ReferenceStore {
  return ReferenceStore({
    type: "remoteBranch",
    gitSubcommand: "branch",
    gitArgs: ["--remotes", "--format=%(refname:lstrip=2)"],
    debugFilePrefix: "remote_branches",
    debugMessageLabel: "Remote branches",
    gitDir,
    cwd,
  })
}
