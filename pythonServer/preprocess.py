import numpy as np


def preprocess_stroke(points, num_points=64):
    """
    Takes raw stroke coordinates from Mongoose and returns a normalized (1, 64, 2) tensor.
    """
    # Convert incoming array to a NumPy float array
    arr = np.array(points, dtype=np.float32)

    # Edge Case: If the stroke is just a single click (dot) or empty
    if len(arr) < 2:
        return np.zeros((1, num_points, 2))

    # ==========================================
    # 1. RESAMPLING (Linear Interpolation)
    # ==========================================
    # Calculate the Euclidean distance between all consecutive points
    diffs = np.diff(arr, axis=0)
    distances = np.linalg.norm(diffs, axis=1)

    # Calculate cumulative distance along the stroke path
    cum_dist = np.insert(np.cumsum(distances), 0, 0.0)
    total_length = cum_dist[-1]

    # If the user held the pen down but didn't move it
    if total_length == 0:
        return np.zeros((1, num_points, 2))

    # Create an array of 64 perfectly evenly spaced targets along that total length
    even_spacing = np.linspace(0, total_length, num_points)

    # Mathematically guess (interpolate) where the X and Y should be at those even spaces
    resampled_x = np.interp(even_spacing, cum_dist, arr[:, 0])
    resampled_y = np.interp(even_spacing, cum_dist, arr[:, 1])

    # Combine back into [[x1, y1], [x2, y2], ...]
    resampled_points = np.column_stack((resampled_x, resampled_y))

    # ==========================================
    # 2. NORMALIZATION (Bounding Box Scaling)
    # ==========================================
    min_vals = np.min(resampled_points, axis=0)
    max_vals = np.max(resampled_points, axis=0)

    # Shift the entire drawing so its top-left corner is at (0, 0)
    shifted_points = resampled_points - min_vals

    # Scale it down so the longest side is exactly 1.0.
    # We use uniform scaling to preserve the aspect ratio (so circles don't become ovals!)
    scale_factor = np.max(max_vals - min_vals)

    if scale_factor > 0:
        normalized_points = shifted_points / scale_factor
    else:
        normalized_points = shifted_points

    # ==========================================
    # 3. TENSOR FORMATTING
    # ==========================================
    # TensorFlow expects inputs in the shape of (Batch_Size, Sequence_Length, Features)
    # We add an extra dimension to the front to represent a Batch Size of 1.
    return np.expand_dims(normalized_points, axis=0)
