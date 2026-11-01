#!/usr/bin/env python3
"""Headless smoke launch: server.py must answer with index.html."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER = os.path.join(ROOT, "server.py")


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_listening(proc: subprocess.Popen, timeout: float = 8) -> int:
    deadline = time.time() + timeout
    buffer = ""
    while time.time() < deadline:
        if proc.poll() is not None:
            rest = proc.stdout.read() if proc.stdout else ""
            raise SystemExit("server exited early:\n%s%s" % (buffer, rest))
        line = proc.stdout.readline() if proc.stdout else ""
        if not line:
            time.sleep(0.05)
            continue
        buffer += line
        if line.startswith("LISTENING "):
            return int(line.split()[1])
    raise SystemExit("timed out waiting for LISTENING\n%s" % buffer)


def fetch(port: int) -> str:
    url = "http://127.0.0.1:%s/index.html" % port
    with urllib.request.urlopen(url, timeout=3) as response:
        body = response.read().decode("utf-8")
        if response.status != 200:
            raise SystemExit("expected 200, got %s" % response.status)
    return body


def start(port: int) -> subprocess.Popen:
    return subprocess.Popen(
        [sys.executable, SERVER, "--no-browser", "--port", str(port)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def stop(proc: subprocess.Popen) -> None:
    if proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


def expect_page(port: int) -> None:
    body = fetch(port)
    if "Tank Turf" not in body or "<canvas" not in body:
        raise SystemExit("index.html missing game markup:\n%s" % body[:400])
    module = "http://127.0.0.1:%s/src/ui/main.js" % port
    with urllib.request.urlopen(module, timeout=3) as response:
        script = response.read().decode("utf-8")
        if response.status != 200 or "createGame" not in script:
            raise SystemExit("main module was not served")


def test_serves_index() -> None:
    port = free_port()
    proc = start(port)
    try:
        heard = wait_listening(proc)
        if heard != port:
            raise SystemExit("expected port %s, got %s" % (port, heard))
        expect_page(heard)
    finally:
        stop(proc)


def test_port_fallback() -> None:
    busy = free_port()
    held = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    held.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    held.bind(("127.0.0.1", busy))
    held.listen(1)
    proc = start(busy)
    try:
        heard = wait_listening(proc)
        if heard == busy:
            raise SystemExit("server bound the occupied port %s" % busy)
        if heard < busy:
            raise SystemExit("fallback moved backwards to %s" % heard)
        expect_page(heard)
    finally:
        stop(proc)
        held.close()


def main() -> int:
    test_serves_index()
    test_port_fallback()
    print("smoke ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
