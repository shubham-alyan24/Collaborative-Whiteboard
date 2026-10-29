import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { whiteboardApi } from "../../api/whiteboard.api.js";

export default function ImageTool({ boardId, onInsertImage }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsUploading(true);
    try {
      const { imageUrl } = await whiteboardApi.uploadImage(boardId, file);
      onInsertImage(imageUrl);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-foreground/50 leading-snug">
        Upload an image to drop it onto the canvas, centered in your current
        view. Use the Select tool afterward to move or resize it.
      </p>
      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center justify-center gap-2 h-10 rounded-lg
          bg-primary text-primary-foreground hover:bg-primary-hover
          transition-all cursor-pointer text-sm font-semibold
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <ImagePlus size={15} />
        )}
        {isUploading ? "Uploading..." : "Upload image"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
