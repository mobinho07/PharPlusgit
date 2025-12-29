from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

topProduitVendu_bp = Blueprint('produitVendu', __name__)

@topProduitVendu_bp.route('/resultat', methods=['POST'])
def get_products_in_stock():
    data = request.get_json()
    try:
        with get_db_cursor() as (cursor,conn):
            if (data["lite"]=="Y"):
                query = """
                SELECT 
                    P.nom AS 'Nom_produit',
                    SUM(LV.quantite * LV.prix_unitaire) AS Montant_vendu,
                    SUM(LV.quantite) AS Quantite_vendue,
                    (SELECT COALESCE(SUM(LS.quantite), 0) 
                    FROM Lot_Stock LS 
                    WHERE LS.id_produit = P.id_produit) AS Quantite_stock, date_format(V.date_vente, "%%d-%%m-%%Y") AS date_vente
                FROM 
                    Produits P
                JOIN 
                    Lot_Stock LS ON P.id_produit = LS.id_produit
                JOIN 
                    Lignes_vente LV ON LS.id_lot = LV.id_lot
                JOIN 
                    Ventes V ON LV.id_vente = V.id_vente
                WHERE 
                    CAST(V.date_vente AS DATE) BETWEEN %s AND %s
                GROUP BY 
                    P.nom, P.id_produit, date_vente
                ORDER BY 
                    SUM(LV.quantite * LV.prix_unitaire) DESC
                LIMIT %s"""
            else:
                query = """
                SELECT 
                    P.nom AS 'Nom_produit',
                    SUM(LV.quantite * LV.prix_unitaire) AS Montant_vendu,
                    SUM(LV.quantite) AS Quantite_vendue,
                    (SELECT COALESCE(SUM(LS.quantite), 0) 
                    FROM Lot_Stock LS 
                    WHERE LS.id_produit = P.id_produit) AS Quantite_stock
                FROM 
                    Produits P
                JOIN 
                    Lot_Stock LS ON P.id_produit = LS.id_produit
                JOIN 
                    Lignes_vente LV ON LS.id_lot = LV.id_lot
                JOIN 
                    Ventes V ON LV.id_vente = V.id_vente
                WHERE 
                    CAST(V.date_vente AS DATE) BETWEEN %s AND %s
                GROUP BY 
                    P.nom, P.id_produit
                ORDER BY 
                    SUM(LV.quantite * LV.prix_unitaire) DESC
                LIMIT %s"""
            cursor.execute(query,(data.get('date_debut'),data.get('date_fin'), data.get('limit'))) 
            results = cursor.fetchall() 
            
            return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500