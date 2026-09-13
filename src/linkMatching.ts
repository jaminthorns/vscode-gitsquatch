import * as vscode from "vscode"

export interface TerminalLinkWithMatches<Match> extends vscode.TerminalLink {
  matches: Match[]
}

export function matchesToLinks<Link extends vscode.TerminalLink>(
  matches: Link[],
): TerminalLinkWithMatches<Link>[] {
  return matches
    .filter((match) => !someOther(match, matches, overlapsEarlier))
    .filter((match) => !someOther(match, matches, sameStartLonger))
    .reduce((links, match) => {
      const existing = links.find((link) => equal(link, match))

      if (existing === undefined) {
        links.push({
          startIndex: match.startIndex,
          length: match.length,
          matches: [match],
        })
      } else {
        existing.matches.push(match)
      }

      return links
    }, [] as TerminalLinkWithMatches<Link>[])
}

function someOther<T>(
  item: T,
  items: T[],
  predicate: (a: T, b: T) => boolean,
): boolean {
  return items
    .filter((other) => other !== item)
    .some((other) => predicate(other, item))
}

function overlapsEarlier(
  a: vscode.TerminalLink,
  b: vscode.TerminalLink,
): boolean {
  return a.startIndex < b.startIndex && b.startIndex < a.startIndex + a.length
}

function sameStartLonger(
  a: vscode.TerminalLink,
  b: vscode.TerminalLink,
): boolean {
  return a.startIndex === b.startIndex && a.length > b.length
}

function equal(a: vscode.TerminalLink, b: vscode.TerminalLink): boolean {
  return a.startIndex === b.startIndex && a.length === b.length
}
