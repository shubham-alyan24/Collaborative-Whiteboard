import json
import os

import numpy as np
import tensorflow as tf
from preprocess import preprocess_stroke
from tensorflow.keras import layers, models

# --- CONFIGURATION ---
# Make sure these match the names of the .ndjson files you downloaded
CATEGORIES = ["circle", "square", "triangle", "line"]
DATA_DIR = "./dataset"
ITEMS_PER_CLASS = 10000  # 10k items per shape is plenty for high accuracy


def load_and_format_data():
    X = []
    y = []

    for class_idx, category in enumerate(CATEGORIES):
        file_path = os.path.join(DATA_DIR, f"{category}.ndjson")
        print(f"Loading {category} from {file_path}...")

        with open(file_path, "r") as f:
            count = 0
            for line in f:
                if count >= ITEMS_PER_CLASS:
                    break

                data = json.loads(line)

                raw_points = []
                for stroke in data["drawing"]:
                    xs = stroke[0]
                    ys = stroke[1]
                    for i in range(len(xs)):
                        raw_points.append([xs[i], ys[i]])

                # 1. The Original Drawing
                processed_tensor = preprocess_stroke(raw_points)[0]
                X.append(processed_tensor)
                y.append(class_idx)

                # --- DATA AUGMENTATION ---

                # 2. Upside-Down Flipped Version
                # Because preprocess_stroke scales everything between 0.0 and 1.0,
                # we can flip it upside down just by subtracting the Y values from 1.0
                flipped_tensor = np.copy(processed_tensor)
                flipped_tensor[:, 1] = 1.0 - flipped_tensor[:, 1]  # Invert Y axis
                X.append(flipped_tensor)
                y.append(class_idx)

                # 3. Reversed Drawing Direction Version
                # What if the user draws right-to-left instead of left-to-right?
                # We reverse the array sequence using [::-1]
                reversed_tensor = processed_tensor[::-1, :]
                X.append(reversed_tensor)
                y.append(class_idx)

                count += 1

    return np.array(X), np.array(y)


def build_model(num_classes):
    model = models.Sequential(
        [
            layers.Input(shape=(64, 2)),  # 64 points, X and Y
            # Look for local curves and corners
            layers.Conv1D(32, kernel_size=3, activation="relu"),
            layers.MaxPooling1D(pool_size=2),
            # Look for larger geometry
            layers.Conv1D(64, kernel_size=3, activation="relu"),
            layers.MaxPooling1D(pool_size=2),
            layers.Flatten(),
            layers.Dense(128, activation="relu"),
            layers.Dropout(0.3),  # Prevent overfitting
            layers.Dense(num_classes, activation="softmax"),
        ]
    )

    model.compile(
        optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"]
    )
    return model


if __name__ == "__main__":
    print("1. Loading and Preprocessing Data...")
    X, y = load_and_format_data()
    print(f"Dataset shape: {X.shape}")  # Should be (40000, 64, 2)

    # Shuffle the data
    indices = np.arange(X.shape[0])
    np.random.shuffle(indices)
    X = X[indices]
    y = y[indices]

    print("\n2. Building Model...")
    model = build_model(len(CATEGORIES))
    model.summary()

    print("\n3. Training Model...")
    # 20% of data used for validation to ensure it's actually learning
    model.fit(X, y, epochs=15, batch_size=64, validation_split=0.2)

    print("\n4. Saving Model...")
    model.save("shape_model.keras")
    print("Training complete! Model saved as shape_model.keras")
