from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from database import get_db_cursor
from routes.auth_api import require_auth, require_role  # ajuste l'import selon ton projet

users_api_bp = Blueprint("users_api", __name__)

@users_api_bp.route("/list", methods=["GET"])
@require_auth
@require_role("admin")
def list_users():
    q = (request.args.get("q") or "").strip()
    role = (request.args.get("role") or "").strip()
    actif = request.args.get("actif")  # "1" / "0" / None

    sql = """
        SELECT id_utilisateur, nom, username, role, actif, created_at, updated_at
        FROM utilisateurs
        WHERE 1=1
    """
    params = []

    if q:
        sql += " AND (nom LIKE %s OR username LIKE %s)"
        like = f"%{q}%"
        params += [like, like]

    if role:
        sql += " AND role = %s"
        params.append(role)

    if actif in ("0", "1"):
        sql += " AND actif = %s"
        params.append(int(actif))

    sql += " ORDER BY id_utilisateur DESC"

    with get_db_cursor() as (cursor, conn):
        cursor.execute(sql, params)
        rows = cursor.fetchall()
    return jsonify({"success": True, "data": rows})

@users_api_bp.route("/create", methods=["POST"])
@require_auth
@require_role("admin")
def create_user():
    payload = request.get_json(silent=True) or {}
    nom = (payload.get("nom") or "").strip()
    username = (payload.get("username") or "").strip()
    role = (payload.get("role") or "caissier").strip()
    password = (payload.get("password") or "").strip()

    if not nom or not username or not password:
        return jsonify({"success": False, "error": "nom, username et password requis"}), 400

    if role not in ("admin", "caissier", "manager"):
        return jsonify({"success": False, "error": "role invalide"}), 400

    pwd_hash = generate_password_hash(password)

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                INSERT INTO utilisateurs(nom, username, mot_de_passe, role, actif)
                VALUES(%s,%s,%s,%s,1)
            """, (nom, username, pwd_hash, role))
            conn.commit()
            new_id = cursor.lastrowid
        return jsonify({"success": True, "id_utilisateur": new_id})
    except Exception as e:
        # si username duplicate
        return jsonify({"success": False, "error": str(e)}), 400

@users_api_bp.route("/update/<int:user_id>", methods=["PUT"])
@require_auth
@require_role("admin")
def update_user(user_id):
    payload = request.get_json(silent=True) or {}
    nom = (payload.get("nom") or "").strip()
    role = (payload.get("role") or "").strip()
    actif = payload.get("actif")

    fields = []
    params = []

    if nom:
        fields.append("nom=%s")
        params.append(nom)

    if role:
        if role not in ("admin", "caissier", "manager"):
            return jsonify({"success": False, "error": "role invalide"}), 400
        fields.append("role=%s")
        params.append(role)

    if actif in (0, 1, True, False, "0", "1"):
        fields.append("actif=%s")
        params.append(int(str(actif) == "1" or actif is True))

    if not fields:
        return jsonify({"success": False, "error": "Aucune modification"}), 400

    params.append(user_id)

    with get_db_cursor() as (cursor, conn):
        cursor.execute(f"""
            UPDATE utilisateurs SET {", ".join(fields)}
            WHERE id_utilisateur=%s
        """, params)
        conn.commit()

    return jsonify({"success": True})

@users_api_bp.route("/reset_password/<int:user_id>", methods=["POST"])
@require_auth
@require_role("admin")
def reset_password(user_id):
    payload = request.get_json(silent=True) or {}
    new_password = (payload.get("new_password") or "").strip()

    if not new_password:
        return jsonify({"success": False, "error": "new_password requis"}), 400

    pwd_hash = generate_password_hash(new_password)

    with get_db_cursor() as (cursor, conn):
        cursor.execute("""
            UPDATE utilisateurs SET mot_de_passe=%s
            WHERE id_utilisateur=%s
        """, (pwd_hash, user_id))
        conn.commit()

    return jsonify({"success": True})
