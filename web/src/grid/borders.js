// Which cell edges are room boundaries (thick borders) vs interior (thin).
// A cell edge is a room border if the neighbour across it is a different room
// or off-grid.

export function cellBorders(rooms, r, c, n) {
  const here = rooms[r][c];
  const diff = (rr, cc) =>
    rr < 0 || cc < 0 || rr >= n || cc >= n || rooms[rr][cc] !== here;
  return {
    top: diff(r - 1, c),
    right: diff(r, c + 1),
    bottom: diff(r + 1, c),
    left: diff(r, c - 1),
  };
}
