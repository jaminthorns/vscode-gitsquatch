import { deepStrictEqual } from "assert/strict"
import { Trie } from "../Trie"

suite("StringTrie adding/removing", () => {
  test("add a string", () => {
    const trie = Trie<null>()

    deepStrictEqual(trie.findMatches("abc"), [])

    trie.set("abc", null)

    deepStrictEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: null },
    ])
  })

  test("remove a string", () => {
    const trie = Trie<null>()

    trie.set("abc", null)
    trie.set("xyz", null)

    deepStrictEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: null },
    ])

    trie.delete("abc")

    deepStrictEqual(trie.findMatches("abc"), [])
  })
})

suite("StringTrie matching", () => {
  const trie = Trie<null>()

  trie.set("abc", null)
  trie.set("a", null)
  trie.set("bc", null)
  trie.set("ade", null)
  trie.set("cdefg", null)
  trie.set("xyz", null)

  test("no matching members, no match", () => {
    deepStrictEqual(trie.findMatches("xy"), [])
  })

  test("single matching member, single match", () => {
    deepStrictEqual(trie.findMatches("xyz"), [
      { startIndex: 0, text: "xyz", value: null },
    ])
  })

  test("multiple matching members (overlapping, contained), single match", () => {
    deepStrictEqual(trie.findMatches("abc"), [
      { startIndex: 0, text: "abc", value: null },
    ])
  })

  test("multiple matching members (overlapping, not contained), single match", () => {
    deepStrictEqual(trie.findMatches("abcdefg"), [
      { startIndex: 2, text: "cdefg", value: null },
    ])
  })

  test("multiple matching members, multiple matches", () => {
    deepStrictEqual(trie.findMatches("abc xyz"), [
      { startIndex: 0, text: "abc", value: null },
      { startIndex: 4, text: "xyz", value: null },
    ])
  })

  test("get entries", () => {
    deepStrictEqual(trie.entries(), [
      ["a", null],
      ["abc", null],
      ["ade", null],
      ["bc", null],
      ["cdefg", null],
      ["xyz", null],
    ])

    deepStrictEqual(trie.entries("a"), [
      ["a", null],
      ["abc", null],
      ["ade", null],
    ])
  })
})
