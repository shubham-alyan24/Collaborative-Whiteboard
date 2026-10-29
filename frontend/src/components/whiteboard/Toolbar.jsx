import {
  PenLine,
  Hand,
  Eraser,
  Shapes,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  MousePointer2,
  Image as ImageIcon,
  Type,
} from "lucide-react";
import PenTool from "../ToolDetails/PenTool";
import EraserTool from "../ToolDetails/EraserTool";
import ShapesTool from "../ToolDetails/ShapesTool";
import ToolSidePanel from "./ToolSidePanel";
import ImageTool from "../ToolDetails/ImageTool";
import TextTool from "../ToolDetails/TextTool";

function ToolBtn({ active, onClick, title, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-md transition-all cursor-pointer
        active:scale-90
        ${
          active
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover"
            : "text-foreground/70 hover:text-foreground hover:bg-background-highlight"
        } ${className}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 flex-shrink-0" />;
}

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  penSize,
  setPenSize,
  eraserSize,
  setEraserSize,
  shapeType,
  setShapeType,
  activePanel,
  setActivePanel = () => {},
  scale,
  zoomIn,
  zoomOut,
  clearCanvas,
  undo,
  redo,
  onInsertImage,
  textColor,
  setTextColor,
  textFontSize,
  setTextFontSize,
  boardId,
}) {
  const handleToolClick = (panelName, toolName) => {
    setTool(toolName);
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  return (
    <>
      {/* Right-side sliding tool panels, below the header */}
      <ToolSidePanel
        open={activePanel === "pen"}
        title="Pen"
        icon={<PenLine size={15} />}
        onClose={() => setActivePanel(null)}
      >
        <PenTool
          color={color}
          setColor={setColor}
          penSize={penSize}
          setPenSize={setPenSize}
        />
      </ToolSidePanel>
      <ToolSidePanel
        open={activePanel === "shapes"}
        title="Shapes"
        icon={<Shapes size={15} />}
        onClose={() => setActivePanel(null)}
      >
        <ShapesTool
          shapeType={shapeType}
          setShapeType={setShapeType}
          color={color}
          setColor={setColor}
        />
      </ToolSidePanel>

      <ToolSidePanel
        open={activePanel === "eraser"}
        title="Eraser"
        icon={<Eraser size={15} />}
        onClose={() => setActivePanel(null)}
      >
        <EraserTool
          eraserSize={eraserSize}
          setEraserSize={setEraserSize}
          clearCanvas={clearCanvas}
        />
      </ToolSidePanel>
      <ToolSidePanel
        open={activePanel === "image"}
        title="Image"
        icon={<ImageIcon size={15} />}
        onClose={() => setActivePanel(null)}
      >
        <ImageTool boardId={boardId} onInsertImage={onInsertImage} />
      </ToolSidePanel>

      <ToolSidePanel
        open={activePanel === "text"}
        title="Text"
        icon={<Type size={15} />}
        onClose={() => setActivePanel(null)}
      >
        <TextTool
          textColor={textColor}
          setTextColor={setTextColor}
          textFontSize={textFontSize}
          setTextFontSize={setTextFontSize}
        />
      </ToolSidePanel>
      {/* Main pill, centred at the bottom */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
        <div
          className="flex items-center gap-0.5 px-2 py-1.5
          bg-background border border-border/40
          rounded-2xl shadow-lg backdrop-blur-md text-foreground"
        >
          <ToolBtn onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 size={17} />
          </ToolBtn>
          <ToolBtn onClick={redo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={17} />
          </ToolBtn>
          <Divider />
          <ToolBtn onClick={zoomOut} title="Zoom out">
            <ZoomOut size={17} />
          </ToolBtn>
          <div className="w-12 text-center text-xs font-semibold text-foreground/60 tabular-nums select-none">
            {(scale * 100).toFixed(0)}%
          </div>
          <ToolBtn onClick={zoomIn} title="Zoom in">
            <ZoomIn size={17} />
          </ToolBtn>
          <Divider />
          <ToolBtn
            active={tool === "pen"}
            onClick={() => handleToolClick("pen", "pen")}
            title="Pen"
          >
            <PenLine size={17} />
          </ToolBtn>
          <ToolBtn
            active={tool === "select"}
            onClick={() => handleToolClick(null, "select")}
            title="Select"
          >
            <MousePointer2 size={17} />
          </ToolBtn>
          <ToolBtn
            active={tool === "shape"}
            onClick={() => handleToolClick("shapes", "shape")}
            title="Shapes"
          >
            <Shapes size={17} />
          </ToolBtn>
          <ToolBtn
            active={tool === "hand"}
            onClick={() => handleToolClick(null, "hand")}
            title="Hand (Space)"
          >
            <Hand size={17} />
          </ToolBtn>
          <ToolBtn
            active={tool === "image"}
            onClick={() => handleToolClick("image", "image")}
            title="Image"
          >
            <ImageIcon size={17} />
          </ToolBtn>
          <ToolBtn
            active={tool === "text"}
            onClick={() => handleToolClick("text", "text")}
            title="Text"
          >
            <Type size={17} />
          </ToolBtn>{" "}
          <ToolBtn
            active={tool === "eraser"}
            onClick={() => handleToolClick("eraser", "eraser")}
            title="Eraser"
          >
            <Eraser size={17} />
          </ToolBtn>
          {(tool === "pen" || tool === "shape") && (
            <>
              <Divider />
              <div
                className="w-5 h-5 rounded-full ring-2 ring-offset-2 ring-offset-foreground 
                ring-border/40 cursor-pointer flex-shrink-0 mx-1"
                style={{ backgroundColor: color }}
                onClick={() =>
                  handleToolClick(tool === "pen" ? "pen" : "shapes", tool)
                }
                title="Color"
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
