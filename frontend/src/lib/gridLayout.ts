export const MAX_ALBUMS = 6
export const CARD_PX = 330
export const GAP_PX = 24

/**
 * Grid placement for a given number of albums, shared by every poster grid
 * (Ranked, ColorSync).
 *
 * Counts that divide evenly (1, 2, 4, 6) use a plain N-column grid. Counts with
 * a short bottom row (3, 5) stagger it into the gaps of the row above: doubling
 * the column count and spanning two columns puts an item starting on an even
 * column exactly half a column off the row above, which centres it on a gap.
 * Cards stay the same width and the gap stays the same in every layout.
 */
export function gridLayout(count: number): {
  realCols: number
  columns: number
  placeFor: (i: number) => { gridColumn?: string; gridRow?: number }
} {
  switch (count) {
    case 6:
      return { realCols: 3, columns: 3, placeFor: () => ({}) }
    case 5:
      return {
        realCols: 3,
        columns: 6,
        placeFor: (i) =>
          i < 3
            ? { gridColumn: `${i * 2 + 1} / span 2`, gridRow: 1 }
            : { gridColumn: `${(i - 3) * 2 + 2} / span 2`, gridRow: 2 },
      }
    case 4:
      return { realCols: 2, columns: 2, placeFor: () => ({}) }
    case 3:
      return {
        realCols: 2,
        columns: 4,
        placeFor: (i) =>
          i < 2
            ? { gridColumn: `${i * 2 + 1} / span 2`, gridRow: 1 }
            : { gridColumn: '2 / span 2', gridRow: 2 },
      }
    default:
      // 1 and 2 both stack in a single column.
      return { realCols: 1, columns: 1, placeFor: () => ({}) }
  }
}
