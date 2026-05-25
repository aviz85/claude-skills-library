#!/bin/bash
# Stop the running realtime transcription
PID_FILE="/tmp/realtime-transcribe.pid"
STOP_FILE="/tmp/realtime-transcribe.stop"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        touch "$STOP_FILE"
        # Wait up to 5 seconds for graceful stop
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 0.5
        done
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID" 2>/dev/null
        fi
        rm -f "$PID_FILE" "$STOP_FILE"
        echo "Transcription stopped."
    else
        rm -f "$PID_FILE"
        echo "Transcription process not running (stale PID file removed)."
    fi
else
    echo "No active transcription found."
fi
