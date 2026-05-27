# routes/users.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from database import get_db_cursor 

users_bp = Blueprint("users", __name__)

@users_bp.route("/", methods=["GET"]) 
def list_users():
    with get_db_cursor() as (cursor, conn):
        cursor.execute("""
            SELECT id_utilisateur, username,nom, role, date_creation, email
            FROM utilisateurs
            ORDER BY id_utilisateur DESC
        """)
        rows = cursor.fetchall()
    return jsonify({"success": True, "data": rows})

@users_bp.route("/", methods=["POST"]) 
def create_user():
    payload = request.get_json(silent=True) or {}
    nom = (payload.get("nom") or "").strip()
    username = (payload.get("username") or "").strip().lower()
    password = payload.get("password") or payload.get("mot_de_passe")
    role = payload.get("role") or "Vendeur"

    if not username or not password or role not in ("Admin", "Vendeur"):
        return jsonify({"success": False, "error": "username/password/role requis"}), 400

    pwd_hash = generate_password_hash(password)

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                INSERT INTO utilisateurs(nom, username, mot_de_passe, role)
                VALUES(%s,%s,%s,%s)
            """, (nom, username, pwd_hash, role))
            conn.commit()
            new_id = cursor.lastrowid
        return jsonify({"success": True, "id_utilisateur": new_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@users_bp.route("/<int:user_id>", methods=["PUT"]) 
def update_user(user_id):
    payload = request.get_json(silent=True) or {}
    nom = (payload.get("nom") or "").strip()
    username = (payload.get("username") or "").strip().lower()
    role = payload.get("role")

    fields = []
    params = []
    if nom:
        fields.append("nom=%s"); params.append(nom)
    if username:
        fields.append("username=%s"); params.append(username)
    if role in ("Admin", "Vendeur"):
        fields.append("role=%s"); params.append(role)

    if not fields:
        return jsonify({"success": False, "error": "Aucune modification"}), 400

    params.append(user_id)

    with get_db_cursor() as (cursor, conn):
        cursor.execute(f"UPDATE utilisateurs SET {', '.join(fields)} WHERE id_utilisateur=%s", tuple(params))
        conn.commit()

    return jsonify({"success": True})

@users_bp.route("/<int:user_id>/password", methods=["PUT"]) 
def reset_password(user_id):
    payload = request.get_json(silent=True) or {}
    password = payload.get("password") or payload.get("mot_de_passe")
    if not password:
        return jsonify({"success": False, "error": "password requis"}), 400

    pwd_hash = generate_password_hash(password)

    with get_db_cursor() as (cursor, conn):
        cursor.execute("UPDATE utilisateurs SET mot_de_passe=%s WHERE id_utilisateur=%s", (pwd_hash, user_id))
        conn.commit()

    return jsonify({"success": True})

@users_bp.route("/<int:user_id>", methods=["DELETE"]) 
def delete_user(user_id):
    with get_db_cursor() as (cursor, conn):
        cursor.execute("DELETE FROM utilisateurs WHERE id_utilisateur=%s", (user_id,))
        conn.commit()
    return jsonify({"success": True})
