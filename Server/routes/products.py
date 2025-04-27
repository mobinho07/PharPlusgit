from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

products_bp = Blueprint('products', __name__)

@products_bp.route('/stock', methods=['GET'])
def get_products_in_stock():
    try:
        with get_db_cursor() as (cursor,conn):
            query = """
            SELECT top 5 P.nom, LS.quantite, LS.date_expiration
            FROM Produits P
            JOIN Lot_Stock LS ON P.id_produit = LS.id_produit
            WHERE LS.quantite > 0
            ORDER BY LS.quantite desc
            """
            cursor.execute(query)
            columns = [column[0] for column in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500