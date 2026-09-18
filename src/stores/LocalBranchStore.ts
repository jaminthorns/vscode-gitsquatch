import { ReferenceStore } from "./ReferenceStore"

export function LocalBranchStore(gitDir: string, cwd: string): ReferenceStore {
  return ReferenceStore({
    type: "localBranch",
    gitSubcommand: "branch",
    gitArgs: ["--format=%(refname:lstrip=2)"],
    debugFilePrefix: "local_branches",
    debugMessageLabel: "Local branches",
    gitDir,
    cwd,
  })
}
