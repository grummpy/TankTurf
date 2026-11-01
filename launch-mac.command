#!/bin/bash
# One-click Tank Turf launcher for macOS.
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to launch Tank Turf."
  echo "Install Python 3, then run this launcher again."
  if [ -t 0 ]; then
    read -r -p "Press Enter to close..."
  fi
  exit 1
fi
python3 server.py
status=$?
if [ "$status" -ne 0 ] && [ -t 0 ]; then
  echo "Tank Turf stopped (exit $status)."
  read -r -p "Press Enter to close..."
fi
exit "$status"
