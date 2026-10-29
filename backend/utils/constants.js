export const COLORS = [
  "#E63946",
  "#2A9D8F",
  "#E9C46A",
  "#F4A261",
  "#A8DADC",
  "#457B9D",
  "#9B5DE5",
  "#F15BB5",
];

// CLIENT_URL may hold several comma-separated origins
export const ALLOWED_ORIGINS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const JWT_EXPIRY = "7d";
export const TOOLS = {
  PEN: "pen",
  ERASER: "eraser",
  HAND: "hand",
  SELECT: "select",
  IMAGE: "image",
  TEXT: "text",
};

export const ROLES = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
};
