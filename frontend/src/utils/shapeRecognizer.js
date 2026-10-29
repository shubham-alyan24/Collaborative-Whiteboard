// // frontend/src/utils/shapeRecognizer.js
//
// /**
//  * Generates perfect geometric coordinates matching the [x, y] format used by the canvas.
//  */
// const generateGeometry = {
//   line: (firstPoint, lastPoint) => [
//     [firstPoint[0], firstPoint[1]],
//     [lastPoint[0], lastPoint[1]],
//   ],
//
//   rectangle: (minX, minY, maxX, maxY) => [
//     [minX, minY], // Top-Left
//     [maxX, minY], // Top-Right
//     [maxX, maxY], // Bottom-Right
//     [minX, maxY], // Bottom-Left
//     [minX, minY], // Close path back to Top-Left
//   ],
//
//   triangle: (minX, minY, maxX, maxY) => {
//     const midX = minX + (maxX - minX) / 2;
//     return [
//       [midX, minY], // Top Apex
//       [maxX, maxY], // Bottom-Right
//       [minX, maxY], // Bottom-Left
//       [midX, minY], // Close path back to Top Apex
//     ];
//   },
//
//   circle: (minX, minY, maxX, maxY) => {
//     const points = [];
//     const cx = minX + (maxX - minX) / 2;
//     const cy = minY + (maxY - minY) / 2;
//
//     // Maintain standard bounding box scale or make it uniform (perfect circle radius)
//     const rx = (maxX - minX) / 2;
//     const ry = (maxY - minY) / 2;
//     const r = Math.max(rx, ry); // Snaps to a balanced circle uniform radius
//
//     // Generate 64 coordinate steps to build a perfectly smooth vector circle
//     for (let i = 0; i <= 64; i++) {
//       const theta = (i / 64) * 2 * Math.PI;
//       points.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
//     }
//     return points;
//   },
// };
//
// /**
//  * Parses user raw stroke coordinate data and snaps it to idealized shapes
//  * if it meets recognition criteria.
//  * @param {Array<Array<number>>} points - Array of [x, y] coordinates
//  * @returns {Array<Array<number>>} Snapped geometric point array
//  */
// export const recognizeAndSnap = (points) => {
//   if (!points || points.length < 8) return points;
//
//   // 1. Compute bounding box coordinates
//   let minX = Infinity,
//     maxX = -Infinity,
//     minY = Infinity,
//     maxY = -Infinity;
//
//   points.forEach(([x, y]) => {
//     if (x < minX) minX = x;
//     if (x > maxX) maxX = x;
//     if (y < minY) minY = y;
//     if (y > maxY) maxY = y;
//   });
//
//   const width = maxX - minX;
//   const height = maxY - minY;
//
//   if (width === 0 || height === 0) return points;
//
//   const firstPoint = points[0];
//   const lastPoint = points[points.length - 1];
//
//   // 2. Measure proximity closure
//   const closureDistance = Math.hypot(
//     firstPoint[0] - lastPoint[0],
//     firstPoint[1] - lastPoint[1],
//   );
//   const boxDiagonal = Math.hypot(width, height);
//   const isClosedShape = closureDistance < boxDiagonal * 0.35;
//
//   if (!isClosedShape) {
//     return generateGeometry.line(firstPoint, lastPoint);
//   }
//
//   // ----------------------------------------------------
//   // 3. UPDATED: Evaluate Geometries using "Tapering"
//   // ----------------------------------------------------
//   const aspectRatio = Math.max(width, height) / Math.min(width, height);
//   const cx = minX + width / 2;
//   const cy = minY + height / 2;
//
//   // Measure the bounds of the different quadrants
//   let minXTop = Infinity,
//     maxXTop = -Infinity;
//   let minXBot = Infinity,
//     maxXBot = -Infinity;
//   let minYLeft = Infinity,
//     maxYLeft = -Infinity;
//   let minYRight = Infinity,
//     maxYRight = -Infinity;
//
//   points.forEach(([x, y]) => {
//     // Top vs Bottom halves
//     if (y < cy) {
//       if (x < minXTop) minXTop = x;
//       if (x > maxXTop) maxXTop = x;
//     } else {
//       if (x < minXBot) minXBot = x;
//       if (x > maxXBot) maxXBot = x;
//     }
//     // Left vs Right halves
//     if (x < cx) {
//       if (y < minYLeft) minYLeft = y;
//       if (y > maxYLeft) maxYLeft = y;
//     } else {
//       if (y < minYRight) minYRight = y;
//       if (y > maxYRight) maxYRight = y;
//     }
//   });
//
//   // Calculate the width/height of the stroke in each sector
//   const topWidth = Math.max(0, maxXTop - minXTop);
//   const botWidth = Math.max(0, maxXBot - minXBot);
//   const leftHeight = Math.max(0, maxYLeft - minYLeft);
//   const rightHeight = Math.max(0, maxYRight - minYRight);
//
//   // TRIANGLE CHECK: If one end is significantly narrower than the other (tapers by 40% or more), it's a triangle
//   const isTriangle =
//     (topWidth > 0 &&
//       botWidth > 0 &&
//       (topWidth / botWidth < 0.6 || botWidth / topWidth < 0.6)) ||
//     (leftHeight > 0 &&
//       rightHeight > 0 &&
//       (leftHeight / rightHeight < 0.6 || rightHeight / leftHeight < 0.6));
//
//   if (isTriangle) {
//     return generateGeometry.triangle(minX, minY, maxX, maxY);
//   }
//
//   // STANDARD RECTANGLE / CIRCLE CHECK
//   if (aspectRatio < 1.25) {
//     return generateGeometry.circle(minX, minY, maxX, maxY);
//   } else {
//     return generateGeometry.rectangle(minX, minY, maxX, maxY);
//   }
// };
//
/**
 * Sends raw stroke coordinates to the local Python ML server for classification.
 * * @param {Array<number[]>} points - Array of [x, y] coordinates from the current stroke.
 * @returns {Promise<string>} The predicted shape name (e.g., "circle", "square", "unknown")
 */
export const recognizeShape = async (points) => {
  // We need at least a few points to even attempt recognition
  if (!points || points.length < 5) return "unknown";
  const API_URL = import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${API_URL}/api/recognize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // We pass the points array wrapped in the expected stroke schema
      body: JSON.stringify({ points: points }),
    });

    if (!response.ok) {
      console.warn(
        "Shape recognition server returned an error:",
        response.status,
      );
      return "unknown";
    }

    const data = await response.json();

    // We only accept the shape if the AI is fairly confident
    if (data.shapeType && data.confidence > 0.6) {
      return data.shapeType;
    }

    return "unknown";
  } catch (error) {
    console.error("Failed to connect to shape recognition server:", error);
    // Return unknown so the whiteboard falls back to a normal pen stroke
    return "unknown";
  }
};
