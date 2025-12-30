from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

qte_stock_bp=Blueprint('qte_stock', __name__)

@qte_stock_bp.route("/lot_stock", methods=["POST"])
def qte_stock():
    try:
        data=request.get_json()
        
        if not data or 'quantite' not in data:
            return jsonify({'success':False,'error':'Paramètres manquants'}), 400
        
        #Recupération des données de la requête
        quantite=data['quantite']
        
        with get_db_cursor() as (cursor,conn):
            query="""
            SELECT ROW_NUMBER() OVER (ORDER BY nom) AS rang, P.nom, LS.quantite,  DATE_FORMAT(LS.date_expiration, "%%d-%%m-%%Y") AS date_expiration
            FROM produits P
            JOIN lot_stock LS ON P.id_produit = LS.id_produit
            WHERE LS.quantite > %s;
            """
            cursor.execute(query,(quantite,))
            resultat=cursor.fetchall()
            
            return jsonify({'success': True, 'data': resultat})
    except Exception as e:
        return jsonify({'success': False, 'error':str(e)}), 500