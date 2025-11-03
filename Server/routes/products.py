from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

products_bp = Blueprint('products', __name__)

@products_bp.route('/stock', methods=['GET'])
def get_products_in_stock():
    try:
        with get_db_cursor() as (cursor,conn):
            query = """
                SELECT P.nom, sum(LS.quantite) as quantite, DATE_FORMAT(LS.date_expiration, '%d-%m-%Y') AS date_expiration, LS.prix_achat, LS.fournisseur
                FROM Produits P
                JOIN Lot_Stock LS ON P.id_produit = LS.id_produit
                WHERE LS.quantite > 0
                GROUP BY P.nom, LS.date_expiration, LS.prix_achat, LS.fournisseur
                ORDER BY 3 desc,2
                LIMIT 10
            """
            cursor.execute(query) 
            results = cursor.fetchall()
            
        return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500