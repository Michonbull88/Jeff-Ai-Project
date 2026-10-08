"""Assemble JEFF's Windows transfer folder without copying host-specific runtimes."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import secrets
import zipfile

source = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("destination", type=Path)
parser.add_argument("--ollama-models", type=Path, default=Path.home() / ".ollama" / "models")
args = parser.parse_args()
destination = args.destination.resolve()
archive = destination.parent / f"{destination.name}.zip"
if destination.exists() or archive.exists():
    raise SystemExit("Choose a new destination; existing transfer files will not be overwritten.")

manifest_path = Path("manifests/registry.ollama.ai/library/qwen3/1.7b")
manifest = json.loads((args.ollama_models / manifest_path).read_text())
blobs = [manifest["config"], *manifest["layers"]]
speech = source / ".jeff-data" / "speech" / "model"
for item in [speech / name for name in ["model.bin", "config.json", "tokenizer.json", "vocabulary.txt"]]:
    if not item.is_file():
        raise SystemExit(f"Missing speech model file: {item}")
for blob in blobs:
    item = args.ollama_models / "blobs" / blob["digest"].replace(":", "-")
    if not item.is_file() or item.stat().st_size != blob["size"]:
        raise SystemExit(f"Missing or incomplete AI model file: {item}")

destination.mkdir(parents=True)
app = destination / "app"
app.mkdir()
ignore = shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store")
for directory in ["app", "components", "hooks", "lib", "types", "scripts", "public", "knowledge", "tests", "packaging"]:
    shutil.copytree(source / directory, app / directory, ignore=ignore)
for name in ["package.json", "package-lock.json", "next.config.ts", "next-env.d.ts", "proxy.ts", "tsconfig.json", "postcss.config.mjs", "eslint.config.mjs", "playwright.config.ts", "README.md", "DEVELOPMENT_STATUS.md", "AGENTS.md", "CLAUDE.md", ".gitignore", ".prettierignore", ".env.example"]:
    if (source / name).is_file():
        shutil.copy2(source / name, app / name)
(app / ".env.local").write_text(f"OLLAMA_BASE_URL=http://127.0.0.1:11435\nOLLAMA_MODEL=qwen3:1.7b\nJEFF_ENABLE_OPENAI=false\nOPENAI_API_KEY=\nJEFF_ACCESS_CODE=\nJEFF_AUTH_SECRET={secrets.token_urlsafe(48)}\nAPP_ORIGIN=http://127.0.0.1:3000\n")

shutil.copytree(source / ".jeff-data" / "tutor-memory", app / ".jeff-data" / "tutor-memory")
course_documents = source / ".jeff-data" / "chatgpt-course-documents"
if course_documents.is_dir():
    shutil.copytree(course_documents, app / ".jeff-data" / "chatgpt-course-documents")
model_destination = app / ".jeff-data" / "speech" / "model"
model_destination.mkdir(parents=True)
for name in ["model.bin", "config.json", "tokenizer.json", "vocabulary.txt"]:
    shutil.copy2(speech / name, model_destination / name)
model_root = destination / "models"
(model_root / manifest_path).parent.mkdir(parents=True)
shutil.copy2(args.ollama_models / manifest_path, model_root / manifest_path)
(model_root / "blobs").mkdir()
for blob in blobs:
    name = blob["digest"].replace(":", "-")
    shutil.copy2(args.ollama_models / "blobs" / name, model_root / "blobs" / name)
for asset in (source / "packaging" / "windows").iterdir():
    if asset.suffix == ".cmd":
        asset_text = asset.read_text().replace("\r\n", "\n").replace("\n", "\r\n")
        (destination / asset.name).write_bytes(asset_text.encode("utf-8"))
    else:
        shutil.copy2(asset, destination / asset.name)

licenses = destination / "model-notices"
licenses.mkdir()
for blob in blobs:
    if blob["mediaType"] == "application/vnd.ollama.image.license":
        shutil.copy2(model_root / "blobs" / blob["digest"].replace(":", "-"), licenses / "qwen3-LICENSE.txt")
(licenses / "SOURCES.txt").write_text("AI model: qwen3:1.7b, copied from the existing Ollama installation.\nhttps://ollama.com/library/qwen3:1.7b\nSpeech weights: Systran/faster-whisper-base.en\nhttps://huggingface.co/Systran/faster-whisper-base.en\nSpeech runtime (installed during Windows setup): faster-whisper 1.2.1\nhttps://github.com/SYSTRAN/faster-whisper\n")

def digest(file):
    checksum = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()

contents = []
for file in sorted(destination.rglob("*")):
    if file.is_file():
        contents.append({"path": file.relative_to(destination).as_posix(), "bytes": file.stat().st_size, "sha256": digest(file)})
for blob in blobs:
    item = next(item for item in contents if item["path"] == "models/blobs/" + blob["digest"].replace(":", "-"))
    if item["sha256"] != blob["digest"].split(":")[1]:
        raise SystemExit("AI model checksum did not match; transfer not completed.")
(destination / "PACKAGE-CONTENTS.json").write_text(json.dumps({"format": "jeff-windows-transfer", "version": 1, "files": contents}, indent=2))
print(f"Folder ready: {destination}", flush=True)
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1, allowZip64=True) as output:
    for file in sorted(destination.rglob("*")):
        if file.is_file():
            output.write(file, Path(destination.name) / file.relative_to(destination))
with zipfile.ZipFile(archive) as check:
    failed = check.testzip()
    if failed:
        raise SystemExit(f"ZIP verification failed: {failed}")
print(json.dumps({"folder": str(destination), "zip": str(archive), "files": len(contents) + 1, "folderBytes": sum(item["bytes"] for item in contents), "zipBytes": archive.stat().st_size, "zipVerified": True}, indent=2), flush=True)
