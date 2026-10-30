import http.server
import socketserver

PORT = 8000

class HeaderHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        # Dev server: never cache, so CSS/JS/HTML edits always show on reload.
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def guess_type(self, path):
        mimetype = super().guess_type(path)
        if str(path).endswith('.wasm'):
            return 'application/wasm'
        return mimetype

    def log_message(self, format, *args):
        pass

with socketserver.TCPServer(("", PORT), HeaderHandler) as httpd:
    print(f"Serving InfoBlocks at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()