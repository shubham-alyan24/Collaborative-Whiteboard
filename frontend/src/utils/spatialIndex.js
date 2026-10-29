// Uniform-grid spatial index for world-space bounding boxes.
// Items are { minX, minY, maxX, maxY, ... }; search() returns those whose box
// intersects the query box (each item once).
const CELL = 256;

export const createSpatialIndex = () => {
  const cells = new Map();

  const forEachCell = (box, fn) => {
    const x0 = Math.floor(box.minX / CELL);
    const x1 = Math.floor(box.maxX / CELL);
    const y0 = Math.floor(box.minY / CELL);
    const y1 = Math.floor(box.maxY / CELL);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) fn(`${x},${y}`);
    }
  };

  return {
    insert(item) {
      forEachCell(item, (key) => {
        let cell = cells.get(key);
        if (!cell) cells.set(key, (cell = new Set()));
        cell.add(item);
      });
    },
    remove(item) {
      forEachCell(item, (key) => {
        const cell = cells.get(key);
        if (!cell) return;
        cell.delete(item);
        if (!cell.size) cells.delete(key);
      });
    },
    clear() {
      cells.clear();
    },
    search(box) {
      const found = new Set();
      forEachCell(box, (key) => {
        const cell = cells.get(key);
        if (!cell) return;
        for (const item of cell) {
          if (
            item.minX <= box.maxX &&
            item.maxX >= box.minX &&
            item.minY <= box.maxY &&
            item.maxY >= box.minY
          ) {
            found.add(item);
          }
        }
      });
      return [...found];
    },
  };
};
