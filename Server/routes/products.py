from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

products_bp = Blueprint('products', __name__)

@products_bp.route('/stock', methods=['GET'])
def get_products_in_stock():
    data = request.get_json()
    try:
        with get_db_cursor() as (cursor,conn):
            query = """
                SELECT * FROM v_stock
                LIMIT %s
            """

            cursor.execute(query, data["limit"]) 
            results = cursor.fetchall()
            
        return jsonify({'success': True, 'data': results})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500