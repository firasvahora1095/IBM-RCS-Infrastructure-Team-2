SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi"}

# Basic file-integrity check (UR-VU-08): confirm the header bytes match a
# real container for the claimed extension. This is not malware scanning
# (explicitly out of MVP scope per UR-VU-08's notes) - just a check that
# the bytes aren't garbage/truncated/mislabeled before the file is stored.
_ISO_BASE_MEDIA_ATOMS = (b"ftyp", b"moov", b"mdat", b"wide", b"free", b"skip")


def get_extension(filename):
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def validate_video(filename, file_bytes):
    extension = get_extension(filename)

    if extension not in SUPPORTED_VIDEO_EXTENSIONS:
        raise ValueError(
            f"Unsupported video format '{extension}'. "
            f"Accepted formats: MP4, MOV, WEBM, AVI."
        )

    if len(file_bytes) < 12:
        raise ValueError("File is too small to be a valid video")

    if extension in (".mp4", ".mov"):
        if file_bytes[4:8] not in _ISO_BASE_MEDIA_ATOMS:
            raise ValueError(f"File contents do not match a valid {extension} file")
    elif extension == ".webm":
        if file_bytes[0:4] != bytes.fromhex("1A45DFA3"):
            raise ValueError("File contents do not match a valid WEBM file")
    elif extension == ".avi":
        if file_bytes[0:4] != b"RIFF" or file_bytes[8:12] != b"AVI ":
            raise ValueError("File contents do not match a valid AVI file")

    return extension
