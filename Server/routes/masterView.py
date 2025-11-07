from flask import Blueprint, request, jsonify
from database import get_db_cursor 

master_bp=Blueprint('master', __name__)

@master_bp.route("/list", methods=["GET"])
def qte_stock():
    try:
        data=request.get_json()
        
        if not data or 'nbJours' not in data:
            return jsonify({'success':False,'error':'Paramètres manquants'}), 400
        
        #Recupération des données de la requête
        nombre=data['nbJours']
        
        with get_db_cursor() as (cursor,conn):
            query="""
            SELECT * from vue_produits_disponibles;
            """
            cursor.execute(query)
            resultat=cursor.fetchall()
            
            
            return jsonify({'success': True, 'data': resultat})
    except Exception as e:
        return jsonify({'success': False, 'error':str(e)}), 500