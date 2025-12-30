from flask import Blueprint, request, jsonify
from database import get_db_cursor
from datetime import datetime, timedelta

sales_bp = Blueprint('sales', __name__)

@sales_bp.route('/top-sold', methods=['POST'])
def get_top_sold_products():
    try:
        data = request.get_json()
        
        # Validation des paramètres
        if not data or 'date_debut' not in data or 'date_fin' not in data:
            return jsonify({'success': False, 'error': 'Paramètres manquants'}), 400
        
        date_debut = data['date_debut']
        date_fin = data['date_fin']
        
        with get_db_cursor() as (cursor,conn):
            query = """
            SELECT P.nom, SUM(LV.quantite) AS total_quantite_vendue
            FROM lignes_vente LV
            JOIN lot_stock LS ON LV.id_lot = LS.id_lot
            JOIN produits P ON LS.id_produit = P.id_produit
            JOIN ventes V ON LV.id_vente = V.id_vente
            WHERE V.date_vente BETWEEN %s AND %s
            GROUP BY P.nom
            ORDER BY total_quantite_vendue DESC
            """
            cursor.execute(query, (date_debut, date_fin))
            
            columns = [column[0] for column in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500