import cv2
import numpy as np

output_path = "scripts/frame-extraction/test_video.mp4"

width = 640
height = 360
fps = 30
duration_seconds = 20

fourcc = cv2.VideoWriter_fourcc(*"mp4v")

video = cv2.VideoWriter(
    output_path,
    fourcc,
    fps,
    (width, height)
)

for frame_number in range(fps * duration_seconds):
    frame = np.full(
        (height, width, 3),
        240,
        dtype=np.uint8
    )

    seconds = frame_number / fps

    cv2.putText(
        frame,
        f"Synthetic Test Video - {seconds:.1f}s",
        (90, 180),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 0, 0),
        2
    )

    video.write(frame)

video.release()

print(f"Synthetic test video created: {output_path}")