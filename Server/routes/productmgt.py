from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

productmgt_bp = Blueprint('productsmgt', __name__)


@productmgt_bp.route("/produit", methods=["POST", "PUT", "DELETE"]) 
def gerer_produit():
    data = request.get_json()
    action = data.get("action")  # 'create', 'update', 'delete'
    cascade = data.get("cascade", False)

    try:
        with get_db_cursor() as (cursor,conn):
            if action == "create":
                cursor.execute("""
                    INSERT INTO Produits (nom, description, prix_unitaire, code_barre, image_produit)
                    VALUES (?, ?, ?, ?, ?)""",
                    data["nom"], data.get("description"), data["prix_unitaire"],
                    data.get("code_barre"), data.get("image_produit"))
                conn.commit()
                return jsonify({"status": "success", "message": "Produit ajouté"})

            elif action == "update":
                cursor.execute("""
                    UPDATE Produits
                    SET nom = ?, description = ?, prix_unitaire = ?, code_barre = ?, image_produit = ?
                    WHERE id_produit = ?""",
                    data["nom"], data.get("description"), data["prix_unitaire"],
                    data.get("code_barre"), data.get("image_produit"), data["id_produit"])
                conn.commit()
                return jsonify({"status": "success", "message": "Produit mis à jour"})

            elif action == "delete":
                if cascade:
                    cursor.execute("DELETE FROM Lignes_vente WHERE id_lot IN (SELECT id_lot FROM Lot_Stock WHERE id_produit = ?)", data["id_produit"])
                    cursor.execute("DELETE FROM Stock_Mouvements WHERE id_lot IN (SELECT id_lot FROM Lot_Stock WHERE id_produit = ?)", data["id_produit"])
                    cursor.execute("DELETE FROM Lot_Stock WHERE id_produit = ?", data["id_produit"])
                cursor.execute("DELETE FROM Produits WHERE id_produit = ?", data["id_produit"])
                conn.commit()
                return jsonify({"status": "success", "message": "Produit supprimé"})

            else:
                return jsonify({"status": "error", "message": "Action inconnue"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
