from flask import Blueprint, request, jsonify
from database import get_db_cursor 

modStock_bp = Blueprint('modStock', __name__)


@modStock_bp.route('/stock', methods=['POST', 'PUT'])  # type: ignore
def gerer_stock():
    data = request.get_json()

    try:
        with get_db_cursor() as (cursor,conn):
            # Ajout d'un nouveau lot de stock
            if request.method == "POST":
                insert_lot_query = """
                    INSERT INTO Lot_Stock (id_produit, quantite, date_approvisionnement, date_expiration,
                                           fournisseur, prix_achat, id_utilisateur)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)"""
                cursor.execute(insert_lot_query,(
                    data["id_produit"], data["quantite"], data["date_approvisionnement"],
                    data.get("date_expiration"), data["fournisseur"], data["prix_achat"], data["id_utilisateur"]))
                
                # Recupération de l'ID du lot inséré
                lot_id= cursor.lastrowid
                # Enregistrement du mouvement de stock
                cursor.execute("""
                    INSERT INTO Stock_Mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur,raison)
                    VALUES (%s, %s, 'entree', NOW(), %s,%s)""",(
                    lot_id, data["quantite"], data["id_utilisateur"], data["raison"]))
                conn.commit()
                return jsonify({"status": "success", "message": "Stock ajouté"})

            elif request.method == "PUT":
                ancien_v=0
                cursor.execute("SELECT quantite FROM Lot_Stock WHERE id_lot = %s", (data["id_lot"],))
                result = cursor.fetchone()["quantite"] # type: ignore
                if result is not None:
                    ancien_v = result
                cursor.execute("""
                    UPDATE Lot_Stock
                    SET quantite = %s, date_expiration = %s, fournisseur = %s, prix_achat = %s
                    WHERE id_lot = %s""",(
                    data["quantite"], data.get("date_expiration"), data["fournisseur"],
                    data["prix_achat"], data["id_lot"]))

                cursor.execute("""
                    INSERT INTO Stock_Mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur,raison)
                    VALUES (%s, %s, 'Modification Stock', NOW(), %s,%s)""",(
                    data["id_lot"], data["quantite"]-ancien_v, data["id_utilisateur"], data["raison"]))
                conn.commit()

                return jsonify({"status": "success", "message": "Stock modifié"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
