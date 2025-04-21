from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

modStock_bp = Blueprint('modStock', __name__)


@modStock_bp.route("/stock", methods=["POST", "PUT"]) 
def gerer_stock():
    data = request.get_json()

    try:
        with get_db_cursor() as (cursor,conn):
            if request.method == "POST":
                cursor.execute("""
                    INSERT INTO Lot_Stock (id_produit, quantite, date_approvisionnement, date_expiration,
                                           fournisseur, prix_achat, id_utilisateur)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    data["id_produit"], data["quantite"], data["date_approvisionnement"],
                    data.get("date_expiration"), data["fournisseur"], data["prix_achat"], data["id_utilisateur"])
                lot_id = cursor.execute("SELECT SCOPE_IDENTITY()").fetchval()
                cursor.execute("""
                    INSERT INTO Stock_Mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur)
                    VALUES (?, ?, 'entree', GETDATE(), ?)""",
                    lot_id, data["quantite"], data["id_utilisateur"])
                conn.commit()
                return jsonify({"status": "success", "message": "Stock ajouté"})

            elif request.method == "PUT":
                cursor.execute("""
                    UPDATE Lot_Stock
                    SET quantite = ?, date_expiration = ?, fournisseur = ?, prix_achat = ?
                    WHERE id_lot = ?""",
                    data["quantite"], data.get("date_expiration"), data["fournisseur"],
                    data["prix_achat"], data["id_lot"])
                conn.commit()
                return jsonify({"status": "success", "message": "Stock modifié"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
