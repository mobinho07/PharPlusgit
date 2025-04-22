from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

qte_stock_bp=Blueprint('qte_stock', __name__)

@qte_stock_bp.route("/lot_stock", methods=["GET"])
def qte_stock():
    try:
        data=request.get_json()
        
        if not data or 'quantite' not in data:
            return jsonify({'success':False,'error':'Paramètres manquants'}), 400
        
        #Recupération des données de la requête
        quantite=data['quantite']
        
        with get_db_cursor() as (cursor,conn):
            query="""
            SELECT ROW_NUMBER() OVER (ORDER BY nom) AS rang, P.nom, LS.quantite, LS.date_expiration
            FROM Produits P
            JOIN Lot_Stock LS ON P.id_produit = LS.id_produit
            WHERE LS.quantite > ?;
            """
            cursor.execute(query,quantite)
            
            colonnes=[column[0] for column in cursor.description]
            resultat=[]
            
            for ligne in cursor.fetchall():
                resultat.append(dict(zip(colonnes,ligne)))
            
            return jsonify({'success': True, 'data': resultat})
    except Exception as e:
        return jsonify({'success': False, 'error':str(e)}), 500