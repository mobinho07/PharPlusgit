from flask import Blueprint, request, jsonify
from database import get_db_cursor 

expire_bp=Blueprint('expire', __name__)

@expire_bp.route("/produit", methods=["POST"])
def qte_stock():
    try:
        data=request.get_json()
        
        if not data or 'nbJours' not in data:
            return jsonify({'success':False,'error':'Paramètres manquants'}), 400
        
        #Recupération des données de la requête
        nombre=data['nbJours']
        
        with get_db_cursor() as (cursor,conn):
            query="""
            SELECT P.nom, LS.date_expiration, LS.quantite
            FROM produits P
            JOIN lot_stock LS ON P.id_produit = LS.id_produit
            WHERE LS.date_expiration < DATE_ADD(NOW(),INTERVAL %s DAY)
            AND LS.quantite > 0;
            """
            cursor.execute(query,(nombre,))
            resultat=cursor.fetchall()
            
            
            return jsonify({'success': True, 'data': resultat})
    except Exception as e:
        return jsonify({'success': False, 'error':str(e)}), 500