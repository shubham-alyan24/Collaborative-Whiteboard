/*const bbox = (start, end) => {
  const minX = Math.min(start[0], end[0]);
  const maxX = Math.max(start[0], end[0]);
  const minY = Math.min(start[1], end[1]);
  const maxY = Math.max(start[1], end[1]);
  return { minX, maxX, minY, maxY };
};

const rectanglePoints = (minX, minY, maxX, maxY) => [
  [minX, minY],
  [maxX, minY],
  [maxX, maxY],
  [minX, maxY],
  [minX, minY],
];

const trianglePoints = (minX, minY, maxX, maxY) => {
  const midX = minX + (maxX - minX) / 2;
  return [
    [midX, minY],
    [maxX, maxY],
    [minX, maxY],
    [midX, minY],
  ];
};

const diamondPoints = (minX, minY, maxX, maxY) => {
  const midX = minX + (maxX - minX) / 2;
  const midY = minY + (maxY - minY) / 2;
  return [
    [midX, minY],
    [maxX, midY],
    [midX, maxY],
    [minX, midY],
    [midX, minY],
  ];
};

const circlePoints = (minX, minY, maxX, maxY) => {
  const cx = minX + (maxX - minX) / 2;
  const cy = minY + (maxY - minY) / 2;
  const rx = Math.max((maxX - minX) / 2, 1);
  const ry = Math.max((maxY - minY) / 2, 1);
  const points = [];
  for (let i = 0; i <= 64; i++) {
    const theta = (i / 64) * 2 * Math.PI;
    points.push([cx + rx * Math.cos(theta), cy + ry * Math.sin(theta)]);
  }
  return points;
};

const starPoints = (minX, minY, maxX, maxY) => {
  const cx = minX + (maxX - minX) / 2;
  const cy = minY + (maxY - minY) / 2;
  const outerR = Math.max(Math.min(maxX - minX, maxY - minY) / 2, 1);
  const innerR = outerR * 0.4;
  const spikes = 5;
  const step = Math.PI / spikes;
  const points = [];
  let rot = -Math.PI / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    points.push([cx + Math.cos(rot) * r, cy + Math.sin(rot) * r]);
    rot += step;
  }
  points.push(points[0]);
  return points;
};

// Arrow is one continuous path: shaft -> barb -> tip -> barb,
// since strokes in this app render as a single connected polyline.
const arrowPoints = (start, end) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = Math.min(len * 0.3, 24);
  const headAngle = Math.PI / 7;

  const rotate = (vx, vy, angle) => [
    vx * Math.cos(angle) - vy * Math.sin(angle),
    vx * Math.sin(angle) + vy * Math.cos(angle),
  ];

  const [bx1, by1] = rotate(-ux, -uy, headAngle);
  const [bx2, by2] = rotate(-ux, -uy, -headAngle);

  return [
    start,
    end,
    [end[0] + bx1 * headLen, end[1] + by1 * headLen],
    end,
    [end[0] + bx2 * headLen, end[1] + by2 * headLen],
  ];
};

export const generateShapePoints = (shapeType, start, end) => {
  const { minX, minY, maxX, maxY } = bbox(start, end);

  switch (shapeType) {
    case "rectangle":
      return rectanglePoints(minX, minY, maxX, maxY);
    case "square": {
      const size = Math.max(maxX - minX, maxY - minY);
      const dirX = end[0] >= start[0] ? 1 : -1;
      const dirY = end[1] >= start[1] ? 1 : -1;
      const ex = start[0] + dirX * size;
      const ey = start[1] + dirY * size;
      return rectanglePoints(
        Math.min(start[0], ex),
        Math.min(start[1], ey),
        Math.max(start[0], ex),
        Math.max(start[1], ey),
      );
    }
    case "circle":
      return circlePoints(minX, minY, maxX, maxY);
    case "triangle":
      return trianglePoints(minX, minY, maxX, maxY);
    case "diamond":
      return diamondPoints(minX, minY, maxX, maxY);
    case "star":
      return starPoints(minX, minY, maxX, maxY);
    case "line":
      return [start, end];
    case "arrow":
      return arrowPoints(start, end);
    default:
      return rectanglePoints(minX, minY, maxX, maxY);
  }
};*/

/**
 * Calculates the bounding box of a messy stroke.
 */
export const getBounds = (points) => {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  points.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });

  return { minX, minY, maxX, maxY };
};

/**
 * Replaces raw points with perfect geometric coordinates based on the AI's prediction.
 */
export const generatePerfectShape = (points, shapeType) => {
  const { minX, minY, maxX, maxY } = getBounds(points);

  // Calculate center and dimensions
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;

  const perfectPoints = [];

  switch (shapeType) {
    case "square":
    case "rectangle":
      // 4 corners of a rectangle
      perfectPoints.push([minX, minY]);
      perfectPoints.push([maxX, minY]);
      perfectPoints.push([maxX, maxY]);
      perfectPoints.push([minX, maxY]);
      perfectPoints.push([minX, minY]); // close the loop
      break;

    case "circle":
      // Generate 60 points to make a smooth circle
      const radius = Math.max(width, height) / 2; // Use max dimension for a perfect circle
      for (let i = 0; i <= 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        perfectPoints.push([
          cx + radius * Math.cos(angle),
          cy + radius * Math.sin(angle),
        ]);
      }
      break;

    case "triangle":
      // Top center, bottom right, bottom left
      perfectPoints.push([cx, minY]);
      perfectPoints.push([maxX, maxY]);
      perfectPoints.push([minX, maxY]);
      perfectPoints.push([cx, minY]); // close the loop
      break;

    case "line":
      // Just snap from the absolute first point to the absolute last point
      perfectPoints.push(points[0]);
      perfectPoints.push(points[points.length - 1]);
      break;

    default:
      // If unknown, just return the messy drawing
      return points;
  }

  return perfectPoints;
};

/**
 * Generates perfect points for a shape being actively dragged (start to end coordinates)
 */
export const generateShapePoints = (shapeType, start, end) => {
  const [x1, y1] = start;
  const [x2, y2] = end;

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;

  const points = [];

  switch (shapeType) {
    case "rectangle":
      points.push(
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      );
      break;

    case "square": {
      // force equal sides, anchored at the drag's start point
      const size = Math.max(width, height);
      const dirX = x2 >= x1 ? 1 : -1;
      const dirY = y2 >= y1 ? 1 : -1;
      const sx1 = x1,
        sy1 = y1;
      const sx2 = x1 + dirX * size,
        sy2 = y1 + dirY * size;
      const sMinX = Math.min(sx1, sx2),
        sMaxX = Math.max(sx1, sx2);
      const sMinY = Math.min(sy1, sy2),
        sMaxY = Math.max(sy1, sy2);
      points.push(
        [sMinX, sMinY],
        [sMaxX, sMinY],
        [sMaxX, sMaxY],
        [sMinX, sMaxY],
        [sMinX, sMinY],
      );
      break;
    }

    case "circle": {
      const rx = width / 2;
      const ry = height / 2;
      for (let i = 0; i <= 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
      }
      break;
    }

    case "triangle":
      points.push([cx, minY], [maxX, maxY], [minX, maxY], [cx, minY]);
      break;

    case "diamond":
      points.push([cx, minY], [maxX, cy], [cx, maxY], [minX, cy], [cx, minY]);
      break;

    case "star": {
      const outerRx = width / 2;
      const outerRy = height / 2;
      const innerRatio = 0.42;
      const spikes = 5;
      let rot = -Math.PI / 2;
      const step = Math.PI / spikes;
      for (let i = 0; i <= spikes * 2; i++) {
        const idx = i % (spikes * 2);
        const isOuter = idx % 2 === 0;
        const rx = isOuter ? outerRx : outerRx * innerRatio;
        const ry = isOuter ? outerRy : outerRy * innerRatio;
        points.push([cx + Math.cos(rot) * rx, cy + Math.sin(rot) * ry]);
        rot += step;
      }
      break;
    }

    case "line":
      points.push([x1, y1], [x2, y2]);
      break;

    case "arrow": {
      // single continuous path: shaft -> tip -> barb -> tip -> barb
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const headLen = Math.min(len * 0.3, 24);
      const headAngle = Math.PI / 7;
      const rotate = (vx, vy, angle) => [
        vx * Math.cos(angle) - vy * Math.sin(angle),
        vx * Math.sin(angle) + vy * Math.cos(angle),
      ];
      const [bx1, by1] = rotate(-ux, -uy, headAngle);
      const [bx2, by2] = rotate(-ux, -uy, -headAngle);
      points.push(
        [x1, y1],
        [x2, y2],
        [x2 + bx1 * headLen, y2 + by1 * headLen],
        [x2, y2],
        [x2 + bx2 * headLen, y2 + by2 * headLen],
      );
      break;
    }

    default:
      points.push([x1, y1], [x2, y2]);
  }

  return points;
};
