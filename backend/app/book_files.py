from pathlib import Path


# Distribution is limited to reviewed, packaged files. Catalog URLs never become fetch targets.
_FILES = {
    "https://eloquentjavascript.net/": "eloquent-javascript-4e.pdf",
}


def book_file(source_url: str, access_type: str) -> Path | None:
    filename = _FILES.get(source_url)
    if access_type != "free_to_read" or filename is None:
        return None
    path = Path(__file__).parent / "data" / "downloads" / filename
    return path if path.is_file() else None
