from flask import Blueprint, request, jsonify
from database import get_db_cursor

lots_bp = Blueprint("lots", __name__)

@lots_bp.route("", methods=["GET"])
def list_lots():
    product_id = request.args.get("product_id")
    available_only = request.args.get("available_only", "0")
    if not product_id:
        return jsonify({"success": False, "error": "product_id requis"}), 400

    where = "WHERE ls.id_produit=%s"
    params = [int(product_id)]
    if available_only == "1":
        where += " AND ls.quantite > 0"

    sql = f"""
        SELECT ls.id_lot, ls.id_produit, ls.quantite, ls.date_expiration,
               ls.prix_achat, ls.fournisseur, ls.date_approvisionnement
        FROM lot_stock ls
        {where}
        ORDER BY (ls.date_expiration IS NULL), ls.date_expiration ASC, ls.id_lot ASC
    """

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@lots_bp.route("/for-sale", methods=["GET"])
def lot_for_sale():
    product_id = request.args.get("product_id")
    if not product_id:
        return jsonify({"success": False, "error": "product_id requis"}), 400

    # FEFO : expire le plus tôt (NULL en dernier), quantité>0
    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                SELECT ls.id_lot, ls.id_produit, ls.quantite, ls.date_expiration,
                       ls.prix_achat, ls.fournisseur, p.nom, p.prix_unitaire
                FROM lot_stock ls
                JOIN produits p ON p.id_produit = ls.id_produit
                WHERE ls.id_produit=%s AND ls.quantite > 0
                ORDER BY (ls.date_expiration IS NULL), ls.date_expiration ASC, ls.id_lot ASC
                LIMIT 1
            """, (int(product_id),))
            row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Aucun lot disponible"}), 404
        return jsonify({"success": True, "data": row})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@lots_bp.route("", methods=["POST"])
def create_lot():
    data = request.get_json(silent=True) or {}
    # champs requis min
    required = ["id_produit", "quantite", "prix_achat", "id_utilisateur"]
    for k in required:
        if data.get(k) in (None, "", 0):
            return jsonify({"success": False, "error": f"{k} requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                INSERT INTO lot_stock (id_produit, quantite, date_approvisionnement, date_expiration,
                                       fournisseur, prix_achat, id_utilisateur)
                VALUES (%s,%s, NOW(), %s, %s, %s, %s)
            """, (
                data["id_produit"],
                data["quantite"],
                data.get("date_expiration"),
                data.get("fournisseur"),
                data["prix_achat"],
                data["id_utilisateur"]
            ))
            lot_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO stock_mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur, raison)
                VALUES (%s,%s,'entree', NOW(), %s, %s)
            """, (lot_id, data["quantite"], data["id_utilisateur"], data.get("raison") or "Approvisionnement"))

            conn.commit()

        return jsonify({"success": True, "data": {"id_lot": lot_id}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@lots_bp.route("/<int:lot_id>", methods=["PUT"])
def update_lot(lot_id: int):
    data = request.get_json(silent=True) or {}
    required = ["quantite", "prix_achat", "id_utilisateur"]
    for k in required:
        if data.get(k) in (None, ""):
            return jsonify({"success": False, "error": f"{k} requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("SELECT quantite FROM lot_stock WHERE id_lot=%s", (lot_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "error": "Lot introuvable"}), 404
            old_qty = int(row["quantite"] or 0)
            new_qty = int(data["quantite"])
            delta = new_qty - old_qty

            cursor.execute("""
                UPDATE lot_stock
                SET quantite=%s, date_expiration=%s, fournisseur=%s, prix_achat=%s
                WHERE id_lot=%s
            """, (
                new_qty,
                data.get("date_expiration"),
                data.get("fournisseur"),
                data["prix_achat"],
                lot_id
            ))

            if delta != 0:
                cursor.execute("""
                    INSERT INTO stock_mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur, raison)
                    VALUES (%s,%s,'ajustement', NOW(), %s, %s)
                """, (lot_id, delta, data["id_utilisateur"], data.get("raison") or "Ajustement"))

            conn.commit()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
