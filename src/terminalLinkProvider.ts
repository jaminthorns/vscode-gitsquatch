import * as vscode from "vscode"
import {
  CommitLinkMatcher,
  CommitRangeLinkMatcher,
  FileLinkMatcher,
  IssueLinkMatcher,
  LinkMatch,
  LocalBranchLinkMatcher,
  RemoteBranchLinkMatcher,
  TagLinkMatcher,
} from "./linkMatchers"
import { TerminalLinkWithMatches, matchesToLinks } from "./linkMatching"
import { showSelectableQuickPick } from "./quickPick"
import { Repository } from "./Repository"
import { RepositoryStore, TerminalFolderStore } from "./stores"
import { TerminalContext } from "./TerminalContext"

interface TerminalOptions extends vscode.TerminalOptions {
  context?: TerminalContext
}

export const matchers = {
  commit: CommitLinkMatcher,
  commitRange: CommitRangeLinkMatcher,
  file: FileLinkMatcher,
  issue: IssueLinkMatcher,
  localBranch: LocalBranchLinkMatcher,
  remoteBranch: RemoteBranchLinkMatcher,
  tag: TagLinkMatcher,
}

export type LinkMatcherType = keyof typeof matchers

export interface LinkMatchWithType<Context> extends LinkMatch<Context> {
  type: LinkMatcherType
}

interface TerminalLink extends TerminalLinkWithMatches<LinkMatchWithType<any>> {
  repository: Repository
  terminalContext: Partial<TerminalContext>
}

export function terminalLinkProvider(
  repositories: RepositoryStore,
  terminalFolders: TerminalFolderStore,
): vscode.Disposable {
  return vscode.window.registerTerminalLinkProvider({
    async provideTerminalLinks({ line, terminal }): Promise<TerminalLink[]> {
      const folder = await terminalFolders.getFolder(terminal)
      const repository = folder && repositories.getRepository(folder.uri)

      if (repository === undefined) {
        return []
      }

      const terminalOptions = terminal.creationOptions as TerminalOptions
      const terminalContext = terminalOptions.context ?? {}

      const matchesByType = await Promise.all(
        Object.entries(matchers)
          .filter(([, matcher]) =>
            matcher.shouldProvide(terminalContext, repository),
          )
          .map(async ([type, matcher]) => ({
            type: type as LinkMatcherType,
            matches: await matcher.findMatches(line, repository),
          })),
      )

      const matches: LinkMatchWithType<unknown>[] = matchesByType.flatMap(
        ({ type, matches }) => matches.map((match) => ({ ...match, type })),
      )

      return matchesToLinks(matches)
        .map(addLinkTooltip)
        .map((link) => ({ ...link, repository, terminalContext }))
    },

    handleTerminalLink({ repository, terminalContext, matches }: TerminalLink) {
      const items = matches.map(({ type, context }) => {
        const { icon, prompt, handleMatch } = matchers[type]

        return {
          label: `$(${icon}) ${prompt}`,
          onSelected: () => handleMatch(context, terminalContext, repository),
        }
      })

      if (items.length === 1) {
        items[0].onSelected()
      } else {
        showSelectableQuickPick({
          placeholder: "Multiple objects with the same name, choose what to do",
          items,
        })
      }
    },
  })
}

function addLinkTooltip(
  link: TerminalLinkWithMatches<LinkMatchWithType<unknown>>,
): TerminalLinkWithMatches<LinkMatchWithType<unknown>> {
  const theseMatchers = link.matches.map(({ type }) => matchers[type])

  let tooltip

  if (theseMatchers.length === 1) {
    tooltip = theseMatchers[0].prompt
  } else {
    const labels = link.matches.map(({ type }) => matchers[type].label)
    const choices = labels.map((l) => l.toLocaleLowerCase()).join("/")

    tooltip = `Choose what to do with ${choices}`
  }

  return { ...link, tooltip }
}
