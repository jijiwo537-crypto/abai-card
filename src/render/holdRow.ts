/**
 * Keeping a row still while a fight is being drawn.
 *
 * The engine removes a casualty the instant the rules resolve. The board cannot follow it
 * that quickly: a row that closes its gap immediately re-centres under blows that are
 * still in the air, and every card left standing slides sideways mid-swing. So a casualty
 * keeps its place until the whole exchange is over, and this is what puts it back where it
 * stood — appending it to the end would shunt everything after it along, which is the very
 * thing the hold exists to prevent.
 */

/** Where a card should sit, given the order the row was last drawn in. */
export function slotHeld<T extends { instanceId: string }>(
  live: T[], ghosts: T[], order: string[],
): T[] {
  if (!ghosts.length) return live;
  const rank = (iid: string) => {
    const i = order.indexOf(iid);
    // A card the row has not seen before joins at the end, in the order the engine gave it.
    return i >= 0 ? i : order.length + Math.max(0, live.findIndex((c) => c.instanceId === iid));
  };
  return [...live, ...ghosts].sort((a, b) => rank(a.instanceId) - rank(b.instanceId));
}
