"""Install JEFF's optional local speech runtime and download its English model."""
import os
from pathlib import Path
import subprocess
import sys
import venv

root = Path(__file__).resolve().parent.parent / ".jeff-data" / "speech"
root.mkdir(parents=True, exist_ok=True)
python = root / "venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
if not python.exists():
    venv.create(root / "venv", with_pip=True)
subprocess.run([
    str(python), "-m", "pip", "install", "--disable-pip-version-check", "faster-whisper==1.2.1",
], check=True)
subprocess.run([
    str(python), str(Path(__file__).resolve().parent / "prepare-speech-model.py"),
    str(root), "base.en",
], check=True)
print("Local speech recognition is ready. Refresh JEFF in your browser.")
