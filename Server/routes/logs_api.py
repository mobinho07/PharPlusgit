import os
from datetime import datetime
from flask import Blueprint, request, jsonify

logs_api = Blueprint("logs_api", __name__)

# Dossier logs (non public)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))   # .../Server
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

MAX_LINE_LEN = 5000  # limite sécurité

def _append_line(line: str):
    line = (line or "").strip()
    if not line:
        return

    if len(line) > MAX_LINE_LEN:
        line = line[:MAX_LINE_LEN] + "…[TRUNCATED]"

    filename = f"pharplus_{datetime.now().strftime('%Y%m%d')}.log"
    filepath = os.path.join(LOG_DIR, filename)

    with open(filepath, "a", encoding="utf-8") as f:
        f.write(line + "\n")

@logs_api.post("")
def write_client_log():
    data = request.get_json(silent=True) or {}

    # ✅ batch
    lines = data.get("lines")
    if isinstance(lines, list) and lines:
        for line in lines:
            if isinstance(line, str):
                _append_line(line)
        return jsonify({"success": True, "count": len(lines)}), 200

    # ✅ single
    line = data.get("line")
    if isinstance(line, str) and line.strip():
        _append_line(line)
        return jsonify({"success": True, "count": 1}), 200

    return jsonify({"success": False, "error": "Missing 'line' or 'lines'"}), 400