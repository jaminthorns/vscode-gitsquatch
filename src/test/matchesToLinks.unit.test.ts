import { partialDeepStrictEqual } from "assert/strict"
import { matchesToLinks } from "../linkMatching"

suite("matchesToLinks", () => {
  test("separate links (not touching)", () => {
    const a = { startIndex: 0, length: 5 }
    const b = { startIndex: 7, length: 5 }

    partialDeepStrictEqual(matchesToLinks([a, b]), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
      { startIndex: b.startIndex, length: b.length, matches: [b] },
    ])
  })

  test("separate links (touching)", () => {
    const a = { startIndex: 0, length: 5 }
    const b = { startIndex: 5, length: 5 }

    partialDeepStrictEqual(matchesToLinks([a, b]), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
      { startIndex: b.startIndex, length: b.length, matches: [b] },
    ])
  })

  test("overlapping links (outer wins)", () => {
    const a = { startIndex: 0, length: 5 }
    const b = { startIndex: 1, length: 3 }

    partialDeepStrictEqual(matchesToLinks([a, b]), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
    ])
  })

  test("overlapping links (earlier wins)", () => {
    const a = { startIndex: 0, length: 5 }
    const b = { startIndex: 3, length: 5 }

    partialDeepStrictEqual(matchesToLinks([a, b]), [
      { startIndex: a.startIndex, length: a.length, matches: [a] },
    ])
  })

  test("equal links", () => {
    const a = { startIndex: 0, length: 5 }
    const b = { startIndex: 0, length: 5 }

    partialDeepStrictEqual(matchesToLinks([a, b]), [
      { startIndex: a.startIndex, length: a.length, matches: [a, b] },
    ])
  })
})
