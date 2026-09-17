import { useRef, useState } from "react";
import { Button } from "@carbon/react";
import { Upload } from "@carbon/icons-react";
import { ACCEPTED_VIDEO_EXTENSIONS } from "../../design-tokens/videoFormats";

interface VideoDropZoneProps {
  onFileSelected: (file: File) => void;
}

/**
 * The dashed "Carbon File Uploader" box from the Upload screen (Figma node
 * 5:10): upload icon, "Drag and drop a video, or", and a tertiary "Browse
 * files" button. Built from Carbon parts rather than Carbon's stock
 * FileUploaderDropContainer, whose layout (text-only link, no icon, no
 * button) doesn't match the approved design.
 *
 * Keyboard/screen-reader users choose a file with the "Browse files"
 * button. The surrounding box only adds drag-and-drop and a larger mouse
 * target — it is deliberately NOT a focusable role="button", because a
 * button nested inside another button is an accessibility violation
 * (axe: nested-interactive) and would be announced confusingly.
 */
export function VideoDropZone({ onFileSelected }: VideoDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  return (
    <div
      data-testid="video-drop-zone"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        // preventDefault is what tells the browser this element accepts drops.
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 px-6 py-8"
      style={{
        // Blue 60 dashed border on Gray 10, per the design; the fill shifts
        // to Blue 10 while a file is dragged over, as drop feedback.
        border: "1.5px dashed #0f62fe",
        borderRadius: 4,
        backgroundColor: isDraggingOver ? "#edf5ff" : "#f4f4f4",
      }}
    >
      <Upload size={32} style={{ fill: "#0f62fe" }} aria-hidden="true" />
      <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>Drag and drop a video, or</p>
      <Button
        kind="tertiary"
        onClick={(e) => {
          e.stopPropagation(); // don't also trigger the box's own click handler
          inputRef.current?.click();
        }}
      >
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        aria-label="Choose a video file"
        accept={ACCEPTED_VIDEO_EXTENSIONS.join(",")}
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so choosing the same file again (e.g. after fixing consent)
          // still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}
