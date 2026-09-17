import { useRef, useState } from "react";
import { Button } from "@carbon/react";
import { Upload } from "@carbon/icons-react";
import { ACCEPTED_VIDEO_EXTENSIONS } from "../../design-tokens/videoFormats";

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
  /** "Drag and drop a video, or" */
  prompt: string;
  /** Accessible name of the hidden file input. */
  inputLabel: string;
  accept: string;
  /**
   * "primary": the video uploader (Figma 5:10), border-interactive dashed
   * border on layer-01 with an upload icon. "secondary": the screenshot
   * uploader (72:74), a quieter border-subtle dashed border, no icon.
   */
  emphasis: "primary" | "secondary";
  testId: string;
}

/**
 * The dashed drag-and-drop file box used on the Upload screen variants.
 * Built from Carbon parts rather than Carbon's stock FileUploaderDropContainer,
 * whose layout (text-only link, no icon, no button) doesn't match the
 * approved design.
 *
 * Keyboard/screen-reader users choose a file with the "Browse files"
 * button. The surrounding box only adds drag-and-drop and a larger mouse
 * target — it is deliberately NOT a focusable role="button", because a
 * button nested inside another button is an accessibility violation
 * (axe: nested-interactive) and would be announced confusingly.
 */
export function FileDropZone({ onFileSelected, prompt, inputLabel, accept, emphasis, testId }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const primary = emphasis === "primary";

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  return (
    <div
      data-testid={testId}
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
      className={`flex w-full cursor-pointer flex-col items-center justify-center px-6 py-8 ${primary ? "gap-3" : "gap-2"}`}
      style={{
        border: primary ? "1.5px dashed var(--cds-border-interactive)" : "1px dashed var(--cds-border-subtle-00)",
        borderRadius: 4,
        // Info-blue fill while a file is dragged over, as drop feedback.
        backgroundColor: isDraggingOver
          ? "var(--cds-notification-background-info)"
          : primary
            ? "var(--cds-layer-01)"
            : "var(--cds-background)",
      }}
    >
      {primary && <Upload size={32} style={{ fill: "var(--cds-icon-interactive)" }} aria-hidden="true" />}
      <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>{prompt}</p>
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
        aria-label={inputLabel}
        accept={accept}
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

/** The video uploader from Screen 1 (Figma 5:10). */
export function VideoDropZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  return (
    <FileDropZone
      onFileSelected={onFileSelected}
      prompt="Drag and drop a video, or"
      inputLabel="Choose a video file"
      accept={ACCEPTED_VIDEO_EXTENSIONS.join(",")}
      emphasis="primary"
      testId="video-drop-zone"
    />
  );
}

/** The screenshot uploader from Screen 1c (Figma 72:74). */
export function ScreenshotDropZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  return (
    <FileDropZone
      onFileSelected={onFileSelected}
      prompt="Drag and drop a screenshot, or"
      inputLabel="Choose a screenshot image"
      accept=".png,.jpg,.jpeg"
      emphasis="secondary"
      testId="screenshot-drop-zone"
    />
  );
}
