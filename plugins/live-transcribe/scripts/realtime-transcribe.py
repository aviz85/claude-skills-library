#!/usr/bin/env python3
"""
Realtime transcription via ElevenLabs Scribe v2 Realtime WebSocket API.
Captures microphone audio, streams to ElevenLabs, writes transcript to a temp file.
Supports fuzzy stop-phrase detection and external stop via signal/file.
"""

import asyncio
import base64
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import sounddevice as sd
import websockets
from rapidfuzz import fuzz

API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
WS_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
SOUNDS_DIR = Path(os.environ.get("LIVE_TRANSCRIBE_SOUNDS_DIR", str(Path(__file__).parent.parent / "assets")))
REMINDER_INTERVAL_SECS = 1800  # 30 minutes
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_DURATION_MS = 100
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION_MS / 1000)
STOP_PHRASES = [
    "אוקי זה מספיק בוא נעצור את התמלול",
    "אוקיי זה מספיק בוא נעצור את התימלול",
    "בוא נעצור את התמלול",
    "עצור תמלול",
    "stop transcription",
    "ok stop transcribing",
]
FUZZY_THRESHOLD = 82
PID_FILE = Path("/tmp/realtime-transcribe.pid")
STOP_FILE = Path("/tmp/realtime-transcribe.stop")


def play_sound(name: str, wait: bool = False):
    """Play a pre-recorded audio cue. wait=True blocks until playback finishes."""
    sound_file = SOUNDS_DIR / f"{name}.mp3"
    if sound_file.exists():
        p = subprocess.Popen(
            ["afplay", str(sound_file)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if wait:
            p.wait()


def get_output_path() -> Path:
    ts = time.strftime("%Y%m%d-%H%M%S")
    return Path(f"/tmp/transcribe-{ts}.txt")


def write_pid():
    PID_FILE.write_text(str(os.getpid()))


def cleanup_pid():
    PID_FILE.unlink(missing_ok=True)
    STOP_FILE.unlink(missing_ok=True)


def should_stop_external() -> bool:
    return STOP_FILE.exists()


def check_stop_phrase(text: str) -> bool:
    normalized = text.strip().lower()
    if len(normalized) < 5:
        return False
    for phrase in STOP_PHRASES:
        score = fuzz.partial_ratio(normalized, phrase.lower())
        if score >= FUZZY_THRESHOLD:
            return True
    # also check last ~60 chars of accumulated text for the phrase
    return False


def check_accumulated_stop(full_text: str) -> bool:
    tail = full_text[-120:].strip().lower() if len(full_text) > 10 else ""
    if not tail:
        return False
    for phrase in STOP_PHRASES:
        score = fuzz.partial_ratio(tail, phrase.lower())
        if score >= FUZZY_THRESHOLD:
            return True
    return False


async def main():
    if not API_KEY:
        print("ERROR: ELEVENLABS_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    output_path = get_output_path()
    output_path.write_text("")
    write_pid()
    STOP_FILE.unlink(missing_ok=True)

    print(json.dumps({
        "status": "started",
        "pid": os.getpid(),
        "output_file": str(output_path),
        "pid_file": str(PID_FILE),
        "stop_file": str(STOP_FILE),
    }))
    sys.stdout.flush()

    stop_event = asyncio.Event()
    audio_queue: asyncio.Queue = asyncio.Queue()
    committed_text_parts: list[str] = []
    current_partial = ""

    def signal_handler(sig, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    def audio_callback(indata, frames, time_info, status):
        if status:
            pass  # ignore overflow
        audio_queue.put_nowait(indata.copy())

    stream = sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
        blocksize=CHUNK_SAMPLES,
        callback=audio_callback,
    )

    ws_params = {
        "model_id": "scribe_v2_realtime",
        "audio_format": f"pcm_{SAMPLE_RATE}",
        "commit_strategy": "vad",
        "language_code": "he",
        "include_timestamps": "false",
        "no_verbatim": "false",
    }
    query = "&".join(f"{k}={v}" for k, v in ws_params.items())
    url = f"{WS_URL}?{query}"
    headers = {"xi-api-key": API_KEY}

    try:
        async with websockets.connect(url, additional_headers=headers, ping_interval=20) as ws:
            play_sound("start", wait=True)
            stream.start()
            print("Recording... speak now.", file=sys.stderr)

            async def reminder_loop():
                while not stop_event.is_set():
                    try:
                        await asyncio.wait_for(stop_event.wait(), timeout=REMINDER_INTERVAL_SECS)
                        break
                    except asyncio.TimeoutError:
                        play_sound("reminder")
                        print("[reminder] still transcribing...", file=sys.stderr)

            async def send_audio():
                while not stop_event.is_set():
                    try:
                        chunk = await asyncio.wait_for(audio_queue.get(), timeout=0.2)
                    except asyncio.TimeoutError:
                        if should_stop_external():
                            play_sound("stop")
                            stop_event.set()
                        continue

                    pcm_bytes = chunk.tobytes()
                    b64 = base64.b64encode(pcm_bytes).decode("ascii")
                    msg = {
                        "message_type": "input_audio_chunk",
                        "audio_base_64": b64,
                        "sample_rate": SAMPLE_RATE,
                    }
                    try:
                        await ws.send(json.dumps(msg))
                    except websockets.exceptions.ConnectionClosed:
                        stop_event.set()
                        break

                    if should_stop_external():
                        stop_event.set()

            async def receive_transcripts():
                nonlocal current_partial
                while not stop_event.is_set():
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=0.5)
                    except asyncio.TimeoutError:
                        continue
                    except websockets.exceptions.ConnectionClosed:
                        stop_event.set()
                        break

                    data = json.loads(raw)
                    msg_type = data.get("message_type", "")

                    if msg_type == "partial_transcript":
                        current_partial = data.get("text", "")

                    elif msg_type in ("committed_transcript", "committed_transcript_with_timestamps"):
                        text = data.get("text", "").strip()
                        if text:
                            committed_text_parts.append(text)
                            current_partial = ""
                            full = " ".join(committed_text_parts)
                            output_path.write_text(full, encoding="utf-8")
                            print(f"[committed] {text}", file=sys.stderr)

                            if check_accumulated_stop(full):
                                print("\n[Stop phrase detected in committed text]", file=sys.stderr)
                                play_sound("stop")
                                stop_event.set()
                                break

                    elif msg_type == "session_started":
                        print("[session started]", file=sys.stderr)

                    elif "error" in msg_type:
                        print(f"[error] {data}", file=sys.stderr)
                        stop_event.set()
                        break

            await asyncio.gather(send_audio(), receive_transcripts(), reminder_loop())

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
    finally:
        stream.stop()
        stream.close()
        full_text = " ".join(committed_text_parts)
        output_path.write_text(full_text, encoding="utf-8")
        cleanup_pid()
        print(f"\nTranscription saved to {output_path}", file=sys.stderr)
        print(json.dumps({"status": "stopped", "output_file": str(output_path), "words": len(full_text.split())}))


if __name__ == "__main__":
    asyncio.run(main())
