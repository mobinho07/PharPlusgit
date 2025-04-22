from flask import Blueprint, request, jsonify
from database import get_db_cursor
import json

expire_bp=Blueprint('expire', __name__)

@expire_bp.route("/produit", methods=["GET"])
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
            FROM Produits P
            JOIN Lot_Stock LS ON P.id_produit = LS.id_produit
            WHERE LS.date_expiration < DATEADD(DAY, ?, GETDATE())
            AND LS.quantite > 0;
            """
            cursor.execute(query,nombre)
            
            colonnes=[column[0] for column in cursor.description]
            resultat=[]
            
            for ligne in cursor.fetchall():
                resultat.append(dict(zip(colonnes,ligne)))
            
            return jsonify({'success': True, 'data': resultat})
    except Exception as e:
        return jsonify({'success': False, 'error':str(e)}), 500