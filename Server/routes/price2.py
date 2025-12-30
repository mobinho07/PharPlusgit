from flask import Blueprint, request, jsonify
from database import get_db_cursor

price2_bp = Blueprint("price2", __name__)

@price2_bp.route("/history", methods=["GET"])
def history():
    product_id = request.args.get("product_id")
    limit = int(request.args.get("limit") or 30)
    if not product_id:
        return jsonify({"success": False, "error": "product_id requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                SELECT ancien_prix, nouveau_prix, modifie_par, motif,
                       DATE_FORMAT(date_modification, '%%Y-%%m-%%d %%H:%%i') AS date_modif
                FROM historique_prix
                WHERE id_produit=%s
                ORDER BY date_modif DESC
                LIMIT %s
            """, (int(product_id), limit))
            rows = cursor.fetchall()
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@price2_bp.route("/change", methods=["POST"])
def change_price():
    data = request.get_json(silent=True) or {}
    required = ["id_produit", "nouveau_prix", "id_utilisateur"]
    for k in required:
        if data.get(k) in (None, "", 0):
            return jsonify({"success": False, "error": f"{k} requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("SELECT prix_unitaire FROM produits WHERE id_produit=%s", (data["id_produit"],))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "error": "Produit introuvable"}), 404

            ancien = float(row["prix_unitaire"] or 0)
            nouveau = float(data["nouveau_prix"])

            cursor.execute("UPDATE produits SET prix_unitaire=%s WHERE id_produit=%s", (nouveau, data["id_produit"]))
            cursor.execute("""
                INSERT INTO historique_prix (id_produit, ancien_prix, nouveau_prix, modifie_par, motif)
                VALUES (%s,%s,%s,%s,%s)
            """, (
                data["id_produit"], ancien, nouveau, data["id_utilisateur"], data.get("motif") or "Ajustement"
            ))
            conn.commit()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
