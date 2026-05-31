from flask import Blueprint, jsonify
import subprocess
import os
import sys

system_bp = Blueprint("system_bp", __name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

@system_bp.route("/version", methods=["GET"])
def system_version():
    try:
        result = subprocess.run(
            ["git", "describe", "--tags", "--always"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        return jsonify({
            "success": True,
            "version": result.stdout.strip()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@system_bp.route("/update", methods=["POST"])
def system_update():
    try:
        pull_result = subprocess.run(
            ["git", "pull", "origin", "main"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        if pull_result.returncode != 0:
            return jsonify({
                "success": False,
                "error": pull_result.stderr
            }), 500

        pip_result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True
        )

        return jsonify({
            "success": True,
            "message": "Mise à jour terminée. Redémarre l'application.",
            "git": pull_result.stdout,
            "pip": pip_result.stdout
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500