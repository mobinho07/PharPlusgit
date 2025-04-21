from flask import Blueprint, request, jsonify
from database import get_db_cursor

stock_bp = Blueprint('stock', __name__)

@stock_bp.route('/movements', methods=['POST'])
def get_stock_movements():
    try:
        data = request.get_json()
        
        if not data or 'id_produit' not in data:
            return jsonify({'success': False, 'error': 'ID produit manquant'}), 400
        
        product_id = data['id_produit']
        
        with get_db_cursor() as (cursor,conn):
            query = """
            SELECT P.nom, SM.type_mouvement, SM.quantite, SM.date_mouvement
            FROM Stock_Mouvements SM
            JOIN Lot_Stock LS ON SM.id_lot = LS.id_lot
            JOIN Produits P ON LS.id_produit = P.id_produit
            WHERE P.id_produit = ?
            ORDER BY SM.date_mouvement DESC
            """
            cursor.execute(query, (product_id,))
            
            columns = [column[0] for column in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500