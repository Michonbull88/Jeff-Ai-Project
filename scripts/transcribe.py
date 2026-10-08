"""Transcribe one short recording with the installed, offline English model."""
import json
import os
import sys

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import av
import numpy as np
from faster_whisper import WhisperModel


TUTOR_CONTEXT = (
    "A learner is asking JEFF, an English computer tutor, a short question. "
    "The question may mention Microsoft Excel, formulas, cells, rows, columns, "
    "worksheets, workbooks, Windows, files, folders, browsers, HTML, CSS, "
    "JavaScript, websites, ChatGPT, prompts, Power Query, PivotTables, SUM, "
    "AVERAGE, IF, XLOOKUP, VLOOKUP, and Ollama."
)

TUTOR_HOTWORDS = (
    "JEFF ChatGPT Microsoft Excel Windows Power Query PivotTable PivotTables "
    "XLOOKUP VLOOKUP SUM AVERAGE Ollama HTML CSS JavaScript"
)


def transcribe(audio_path, model_path):
    # Decode in bounded chunks: a small compressed upload can contain long audio.
    samples = []
    size = 0
    resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
    with av.open(audio_path) as container:
        for frame in container.decode(audio=0):
            for chunk in resampler.resample(frame):
                data = chunk.to_ndarray().flatten()
                size += data.size
                if size > 65 * 16000:
                    raise ValueError("Please keep spoken questions under one minute.")
                samples.append(data)
        for chunk in resampler.resample(None):
            data = chunk.to_ndarray().flatten()
            size += data.size
            if size > 65 * 16000:
                raise ValueError("Please keep spoken questions under one minute.")
            samples.append(data)
    if not size:
        return ""
    audio = np.concatenate(samples).astype(np.float32) / 32768.0
    model = WhisperModel(
        model_path, device="cpu", compute_type="int8", cpu_threads=4,
        local_files_only=True,
    )
    segments, _ = model.transcribe(
        audio,
        language="en",
        beam_size=8,
        best_of=8,
        patience=1.2,
        initial_prompt=TUTOR_CONTEXT,
        hotwords=TUTOR_HOTWORDS,
        vad_filter=True,
        vad_parameters={
            "min_silence_duration_ms": 900,
            "speech_pad_ms": 500,
        },
        condition_on_previous_text=False,
    )
    return " ".join(segment.text.strip() for segment in segments).strip()


if __name__ == "__main__":
    try:
        print(json.dumps({"text": transcribe(sys.argv[1], sys.argv[2])}))
    except ValueError as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
    except Exception:
        print(json.dumps({"error": "Could not transcribe this recording. Try speaking again."}))
        sys.exit(1)
