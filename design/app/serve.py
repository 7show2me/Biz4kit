"""Local server for the prototype: serves the repo root on 127.0.0.1 with caching off, so every reload
picks up edited JS / JSON. Usage (from the repo root): python design/app/serve.py [port]"""
import http.server
import socketserver
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROOT = Path(__file__).resolve().parents[2]


class NoCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), NoCache) as httpd:
    print(f"Biz4Kit prototype: http://127.0.0.1:{PORT}/design/app/")
    httpd.serve_forever()
