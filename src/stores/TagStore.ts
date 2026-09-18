import { ReferenceStore } from "./ReferenceStore"

export function TagStore(gitDir: string, cwd: string): ReferenceStore {
  return ReferenceStore({
    type: "tag",
    gitSubcommand: "tag",
    gitArgs: ["--format=%(refname:lstrip=2)"],
    debugFilePrefix: "tags",
    debugMessageLabel: "Tags",
    gitDir,
    cwd,
  })
}
