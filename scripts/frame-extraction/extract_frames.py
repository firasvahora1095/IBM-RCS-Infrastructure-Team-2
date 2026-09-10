import cv2
import os
import sys


def extract_frames(video_path, output_dir, interval_seconds=5):
    os.makedirs(output_dir, exist_ok=True)

    video = cv2.VideoCapture(video_path)

    if not video.isOpened():
        print("Error: Could not open video.")
        return

    fps = video.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        print("Error: Invalid video FPS.")
        video.release()
        return

    frame_interval = int(fps * interval_seconds)

    frame_number = 0
    saved_count = 0

    while True:
        success, frame = video.read()

        if not success:
            break

        if frame_number % frame_interval == 0:
            timestamp_seconds = frame_number / fps

            output_path = os.path.join(
                output_dir,
                f"frame_{saved_count:04d}_{timestamp_seconds:.1f}s.jpg"
            )

            cv2.imwrite(output_path, frame)

            print(
                f"Saved frame at {timestamp_seconds:.1f}s -> "
                f"{output_path}"
            )

            saved_count += 1

        frame_number += 1

    video.release()

    print()
    print("Frame extraction completed.")
    print(f"Frames extracted: {saved_count}")
    print(f"Interval: {interval_seconds} seconds")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python extract_frames.py "
            "<video_path> <output_folder>"
        )
        sys.exit(1)

    extract_frames(
        sys.argv[1],
        sys.argv[2],
        interval_seconds=5
    )