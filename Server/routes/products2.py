from flask import Blueprint, request, jsonify
from database import get_db_cursor

products2_bp = Blueprint("products2", __name__)

@products2_bp.route("", methods=["GET"])
def list_products():
    search = (request.args.get("search") or "").strip()
    active = request.args.get("active")  # "1" / "0" / ""
    category = (request.args.get("category") or "").strip()
    limit = int(request.args.get("limit") or 60) # Default limit 60

    where = []
    params = []

    if search:
        where.append("(p.nom LIKE %s OR p.code_barre LIKE %s)")
        params.extend([f"%{search}%", f"%{search}%"])

    if active in ("0", "1"):
        where.append("p.actif = %s")
        params.append(int(active))

    if category:
        where.append("p.category = %s")
        params.append(category)

    sql = """
        SELECT
          p.id_produit, p.nom, p.description, p.prix_unitaire, p.code_barre,
          p.category, p.seuil, p.actif, p.date_creation
        FROM produits p
    """
    if where:
        sql += " WHERE " + " AND ".join(where)

    sql += " ORDER BY p.nom LIMIT %s"
    params.append(limit)

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@products2_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id: int):
    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                SELECT id_produit, nom, description, prix_unitaire, code_barre,
                       category, seuil, actif, date_creation
                FROM produits
                WHERE id_produit=%s
            """, (product_id,))
            row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Produit introuvable"}), 404
        return jsonify({"success": True, "data": row})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@products2_bp.route("", methods=["POST"])
def create_product():
    data = request.get_json(silent=True) or {}
    nom = (data.get("nom") or "").strip()
    if not nom:
        return jsonify({"success": False, "error": "nom requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                INSERT INTO produits (nom, description, prix_unitaire, code_barre, category, seuil, actif)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (
                nom,
                data.get("description"),
                data.get("prix_unitaire"),
                data.get("code_barre"),
                data.get("category"),
                data.get("seuil"),
                int(data.get("actif", 1)),
            ))
            conn.commit()
            new_id = cursor.lastrowid
        return jsonify({"success": True, "data": {"id_produit": new_id}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@products2_bp.route("/<int:product_id>", methods=["PUT"])
def update_product(product_id: int):
    data = request.get_json(silent=True) or {}
    nom = (data.get("nom") or "").strip()
    if not nom:
        return jsonify({"success": False, "error": "nom requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                UPDATE produits
                SET nom=%s, description=%s, prix_unitaire=%s, code_barre=%s,
                    category=%s, seuil=%s, actif=%s
                WHERE id_produit=%s
            """, (
                nom,
                data.get("description"),
                data.get("prix_unitaire"),
                data.get("code_barre"),
                data.get("category"),
                data.get("seuil"),
                int(data.get("actif", 1)),
                product_id
            ))
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@products2_bp.route("/<int:product_id>/status", methods=["PATCH"])
def set_status(product_id: int):
    data = request.get_json(silent=True) or {}
    actif = int(data.get("actif", 1))

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("UPDATE produits SET actif=%s WHERE id_produit=%s", (actif, product_id))
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@products2_bp.route("/by-barcode/<code>", methods=["GET"])
def by_barcode(code: str):
    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                SELECT id_produit, nom, prix_unitaire, code_barre, category, seuil, actif
                FROM produits
                WHERE code_barre=%s
            """, (code,))
            row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Produit introuvable"}), 404
        return jsonify({"success": True, "data": row})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
