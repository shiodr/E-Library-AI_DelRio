"""Build WASIX dependencies and copy backend source without credentials or local data."""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
OUTPUT = BACKEND / ".wasmer-build"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packages", type=Path, help="Reuse an already-resolved directory of WASIX wheels")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix=".wasmer-stage-", dir=BACKEND) as staging:
        stage = Path(staging)
        packages = stage / "packages"
        if args.packages:
            source = args.packages.resolve()
            if not (source / "pydantic_core").is_dir():
                parser.error("--packages must point to resolved WASIX packages.")
            shutil.copytree(source, packages, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        else:
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    "-r",
                    str(BACKEND / "requirements-wasmer.txt"),
                    "--platform",
                    "wasix_wasm32",
                    "--python-version",
                    "3.13",
                    "--only-binary=:all:",
                    "--no-compile",
                    "--target",
                    str(packages),
                ],
                check=True,
            )
        app = stage / "app"
        app.mkdir()
        for directory in ["app", "alembic"]:
            shutil.copytree(
                BACKEND / directory,
                app / directory,
                ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".env", ".env.*"),
            )
        for filename in ["main.py", "alembic.ini"]:
            shutil.copy2(BACKEND / filename, app / filename)
        shutil.copy2(BACKEND / "scripts" / "check_runtime.py", app / "check_runtime.py")
        if OUTPUT.exists():
            # OUTPUT is a fixed generated directory, never a caller-supplied path.
            shutil.rmtree(OUTPUT)
        shutil.copytree(stage, OUTPUT)
    print(f"Prepared {OUTPUT}; .env files, credentials, frontend, and database files were excluded.")
    print(f"Next: wasmer package build --check {BACKEND}")


if __name__ == "__main__":
    main()
