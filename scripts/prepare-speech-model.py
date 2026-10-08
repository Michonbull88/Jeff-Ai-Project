"""Download and validate a speech model without risking the working model."""
import json
from pathlib import Path
import shutil
import sys

from faster_whisper import WhisperModel
from faster_whisper.utils import download_model


root = Path(sys.argv[1])
model_name = sys.argv[2]
model = root / "model"
ready = root / "ready.json"
required = ["model.bin", "config.json", "tokenizer.json", "vocabulary.txt"]

try:
    installed = json.loads(ready.read_text()).get("model")
except (FileNotFoundError, json.JSONDecodeError):
    installed = None

if installed != model_name or not all((model / name).is_file() for name in required):
    pending = root / "model.pending"
    shutil.rmtree(pending, ignore_errors=True)
    download_model(model_name, output_dir=str(pending))
    WhisperModel(str(pending), device="cpu", compute_type="int8", local_files_only=True)
    previous = root / "model.previous"
    shutil.rmtree(previous, ignore_errors=True)
    if model.exists():
        model.rename(previous)
    pending.rename(model)
    shutil.rmtree(previous, ignore_errors=True)
else:
    WhisperModel(str(model), device="cpu", compute_type="int8", local_files_only=True)

ready.write_text(json.dumps({
    "model": model_name,
    "runtime": "faster-whisper==1.2.1",
    "decoding": "beam-5",
}))
