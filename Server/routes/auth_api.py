# routes/auth_api.py
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_cursor
from functools import wraps
from flask import request, jsonify, current_app
from itsdangerous import BadSignature, SignatureExpired


auth_api_bp = Blueprint("auth_api", __name__)

def _serializer():
    secret = current_app.config.get("SECRET_KEY", "dev-secret-change-me")
    return URLSafeTimedSerializer(secret_key=secret, salt="pharmaplus-auth")

def make_token(user_dict: dict) -> str:
    # user_dict: {id_utilisateur, nom, username, role}
    s = _serializer()
    payload = {
        "id_utilisateur": user_dict["id_utilisateur"],
        "nom": user_dict.get("nom"),
        "username": user_dict.get("username"),
        "role": user_dict.get("role"),
    }
    return s.dumps(payload)

def verify_token(token: str, max_age_seconds: int = 8 * 3600) -> dict:
    s = _serializer()
    return s.loads(token, max_age=max_age_seconds)

def verify_password(stored: str, provided: str) -> bool:
    """
    Supporte:
    - mot_de_passe hashé (werkzeug) -> check_password_hash
    - mot_de_passe en clair (si tu as déjà des users comme ça) -> compare direct
    """
    if stored is None:
        return False
    stored = str(stored)
    provided = "" if provided is None else str(provided)

    # Heuristique: hash werkzeug commence souvent par "pbkdf2:" / "scrypt:" / "argon2:"
    if ":" in stored and stored.split(":", 1)[0] in {"pbkdf2", "scrypt", "argon2"}:
        return check_password_hash(stored, provided)
    return stored == provided

def decode_token(token: str, max_age=60*60*24):  # 24h
    s = _serializer()
    return s.loads(token, max_age=max_age)

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"success": False, "error": "Token manquant"}), 401

        token = auth.split(" ", 1)[1].strip()
        try:
            user = decode_token(token)
        except SignatureExpired:
            return jsonify({"success": False, "error": "Token expiré"}), 401
        except BadSignature:
            return jsonify({"success": False, "error": "Token invalide"}), 401

        request.current_user = user  # type: ignore # {id_utilisateur, nom, username, role}
        return f(*args, **kwargs)
    return wrapper

def require_role(*roles):
    def deco(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            u = getattr(request, "current_user", None)
            if not u or u.get("role") not in roles:
                return jsonify({"success": False, "error": "Accès refusé"}), 403
            return f(*args, **kwargs)
        return wrapper
    return deco

# Endpoint de login
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
            LIMIT 1
        """, (username,))
        u = cursor.fetchone()

    if not u or not verify_password(u.get("mot_de_passe"), password): # type: ignore
        return jsonify({"success": False, "error": "Identifiants invalides"}), 401

    token = make_token(u)

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id_utilisateur": u["id_utilisateur"],
            "nom": u.get("nom"),
            "username": u.get("username"),
            "role": u.get("role"),
        }
    })

# Endpoint pour vérifier le token et obtenir les infos de l'utilisateur connecté
@auth_api_bp.route("/me", methods=["GET"])
def me():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"success": False, "error": "Token manquant"}), 401

    token = auth.split(" ", 1)[1].strip()
    try:
        user = verify_token(token)
        return jsonify({"success": True, "user": user})
    except SignatureExpired:
        return jsonify({"success": False, "error": "Session expirée"}), 401
    except BadSignature:
        return jsonify({"success": False, "error": "Token invalide"}), 401
