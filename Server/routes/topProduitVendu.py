from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

topProduitVendu_bp = Blueprint('topProduitVendu', __name__)

@topProduitVendu_bp.route('/resultat', methods=['GET'])
def get_products_in_stock():
    data = request.get_json()
    try:
        with get_db_cursor() as (cursor,conn):
            query = """
            SELECT TOP 5
                P.nom AS 'Nom_produit',
                SUM(LV.quantite * LV.prix_unitaire) AS 'Montant_vendu',
                SUM(LV.quantite) AS 'Quantite_vendue',
                (SELECT ISNULL(SUM(LS.quantite), 0) 
                FROM Lot_Stock LS 
                WHERE LS.id_produit = P.id_produit) AS 'Quantite_stock'
            FROM 
                Produits P
            JOIN 
                Lot_Stock LS ON P.id_produit = LS.id_produit
            JOIN 
                Lignes_vente LV ON LS.id_lot = LV.id_lot
            JOIN 
                Ventes V ON LV.id_vente = V.id_vente
            WHERE 
                CAST(V.date_vente AS DATE) BETWEEN ? AND ?
            GROUP BY 
                P.nom, P.id_produit
            ORDER BY 
                SUM(LV.quantite * LV.prix_unitaire) DESC;
            """
            cursor.execute(query,data.get('date_debut'),data.get('date_fin'))
            columns = [column[0] for column in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500