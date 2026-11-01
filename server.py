#!/usr/bin/env python3
"""Local offline server for Tank Turf. Stdlib only, bound to 127.0.0.1."""

from __future__ import annotations

import argparse
import os
import socket
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
DEFAULT_PORT = 8809


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def port_is_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((HOST, port))
        except OSError:
            return False
    return True


def choose_port(start: int, attempts: int = 20) -> int:
    port = start
    for _ in range(attempts):
        if port_is_free(port):
            return port
        port += 1
    raise SystemExit(
        "No free port for Tank Turf between %s and %s." % (start, start + attempts - 1)
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Serve Tank Turf on localhost.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="preferred port (default 8809)")
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser window")
    args = parser.parse_args(argv)

    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)
    port = choose_port(args.port)
    server = ThreadingHTTPServer((HOST, port), QuietHandler)
    url = "http://%s:%s/index.html" % (HOST, port)
    print("LISTENING %s" % port, flush=True)
    print("Tank Turf is running at %s" % url, flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nTank Turf stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
