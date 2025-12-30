from flask import Blueprint, request, jsonify
from database import get_db_cursor

stock2_bp = Blueprint("stock2", __name__)

@stock2_bp.route("/movements", methods=["GET"])
def movements():
    product_id = request.args.get("product_id")
    lot_id = request.args.get("lot_id")
    limit = int(request.args.get("limit") or 30)

    if not product_id and not lot_id:
        return jsonify({"success": False, "error": "product_id ou lot_id requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            if lot_id:
                cursor.execute("""
                    SELECT p.nom, sm.id_lot, sm.type_mouvement, sm.quantite,
                           DATE_FORMAT(sm.date_mouvement, '%%Y-%%m-%%d %%H:%%i') AS date_mouvement
                    FROM stock_mouvements sm
                    JOIN lot_stock ls ON sm.id_lot = ls.id_lot
                    JOIN produits p ON ls.id_produit = p.id_produit
                    WHERE sm.id_lot=%s
                    ORDER BY sm.date_mouvement DESC
                    LIMIT %s
                """, (int(lot_id), limit))
            else:
                cursor.execute("""
                    SELECT p.nom, sm.id_lot, sm.type_mouvement, sm.quantite,
                           DATE_FORMAT(sm.date_mouvement, '%%Y-%%m-%%d %%H:%%i') AS date_mouvement
                    FROM stock_mouvements sm
                    JOIN lot_stock ls ON sm.id_lot = ls.id_lot
                    JOIN produits p ON ls.id_produit = p.id_produit
                    WHERE p.id_produit=%s
                    ORDER BY sm.date_mouvement DESC
                    LIMIT %s
                """, (int(product_id), limit))

            rows = cursor.fetchall()

        return jsonify({"success": True, "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
