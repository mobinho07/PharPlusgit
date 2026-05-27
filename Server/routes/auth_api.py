# routes/auth_api.py
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash
from database import get_db_cursor


auth_api_bp = Blueprint("auth_api", __name__)


def verify_password(stored: str, provided: str) -> bool:
    """
    Supporte:
    - mot de passe hashé (werkzeug) -> check password hash
    - mot de passe en clair pour les comptes de test existants
    """
    if stored is None:
        return False
    stored = str(stored)
    provided = "" if provided is None else str(provided)
 
    if ":" in stored and stored.split(":", 1)[0] in {"pbkdf2", "scrypt", "argon2"}:
        return check_password_hash(stored, provided) 

    return stored == provided


@auth_api_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip().lower()
    password = payload.get("password") or payload.get("mot_de_passe")  # tolérant

    if not username or not password:
        return jsonify({"success": False, "error": "username et password requis"}), 400

    with get_db_cursor() as (cursor, conn):
        cursor.execute("""
            SELECT id_utilisateur, nom, username, mot_de_passe, role,email
            FROM utilisateurs
            WHERE LOWER(username)=LOWER(%s)
                AND COALESCE(actif,1)=1
            LIMIT 1
        """, (username,))
        u = cursor.fetchone()

    if not u or not verify_password(u.get("mot_de_passe"), password): # type: ignore
        return jsonify({"success": False, "error": "Identifiants invalides"}), 401

    
    return jsonify({
        "success": True, 
        "user": {
            "id_utilisateur": u["id_utilisateur"],
            "nom": u.get("nom"),
            "username": u.get("username"),
            "role": u.get("role"),
        }
    })
