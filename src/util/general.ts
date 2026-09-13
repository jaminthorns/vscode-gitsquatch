export function excludeNulls<T>(items: T[]): Exclude<T, null>[] {
  return items.filter((item) => item !== null) as Exclude<T, null>[]
}

export async function filterAsync<T>(
  items: T[] | readonly T[],
  predicate: (item: T) => Promise<boolean>,
): Promise<T[]> {
  const itemsAndConditions = await Promise.all(
    items.map(async (item) => ({ item, keep: await predicate(item) })),
  )

  return itemsAndConditions.filter(({ keep }) => keep).map(({ item }) => item)
}

export function chunk<T>(items: T[], count: number): T[][] {
  return items.reduce((chunks: T[][], value, index) => {
    const chunkIndex = Math.floor(index / count)

    if (chunks[chunkIndex] === undefined) {
      chunks[chunkIndex] = []
    }

    chunks[chunkIndex].push(value)
    return chunks
  }, [])
}

export function truncate(text: string, maxLength: number): string {
  if (text.length > maxLength) {
    return text.slice(0, maxLength - 3) + "..."
  } else {
    return text
  }
}
