from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

saleMvt_bp = Blueprint('saleMvt', __name__)

@saleMvt_bp.route("/vente", methods=["POST"]) 
def enregistrer_vente():
    data = request.get_json()
    lignes = data["lignes"]  # liste d'objets {id_lot, quantite, prix_unitaire}
    id_utilisateur = data["id_utilisateur"]

    try:
        with get_db_cursor() as (cursor,conn):
            cursor.execute("""
                INSERT INTO Ventes (date_vente, montant_total, id_utilisateur)
                VALUES (GETDATE(), ?, ?);
                SELECT SCOPE_IDENTITY();
            """, data["montant_total"], id_utilisateur)
        

            cursor.nextset()  # ⬅️ passage au SELECT
            id_vente = cursor.fetchone()[0]

            for ligne in lignes:
                cursor.execute("""
                    INSERT INTO Lignes_vente (id_vente, id_lot, quantite, prix_unitaire)
                    VALUES (?, ?, ?, ?)""",
                    id_vente, ligne["id_lot"], ligne["quantite"], ligne["prix_unitaire"])
                cursor.execute("""
                    UPDATE Lot_Stock SET quantite = quantite - ? WHERE id_lot = ?""",
                    ligne["quantite"], ligne["id_lot"])
                cursor.execute("""
                    INSERT INTO Stock_Mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur)
                    VALUES (?, ?, 'sortie', GETDATE(), ?)""",
                    ligne["id_lot"], ligne["quantite"], id_utilisateur)

            conn.commit()
            return jsonify({"status": "success", "message": "Vente enregistrée", "id_vente": id_vente})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
