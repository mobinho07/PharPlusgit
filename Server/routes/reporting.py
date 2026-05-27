from flask import Blueprint, request, jsonify
from database import get_db_cursor

reporting_bp = Blueprint("reporting", __name__)

REPORTS = {
    "sales_by_day": """
        SELECT DATE_FORMAT(DATE(v.date_vente), '%%Y-%%m-%%d') AS periode,
               COUNT(*) AS nb_ventes,
               COALESCE(SUM(v.montant_total),0) AS chiffre_affaires
        FROM ventes v
        WHERE v.annule='0'
          AND DATE(v.date_vente) BETWEEN %s AND %s
        GROUP BY DATE_FORMAT(DATE(v.date_vente), '%%Y-%%m-%%d')
        ORDER BY periode;
    """,
    "sales_by_month": """
        SELECT DATE_FORMAT(v.date_vente, '%%Y-%%m') AS periode,
               COUNT(*) AS nb_ventes,
               COALESCE(SUM(v.montant_total),0) AS chiffre_affaires
        FROM ventes v
        WHERE v.annule='0'
          AND DATE(v.date_vente) BETWEEN %s AND %s
        GROUP BY DATE_FORMAT(v.date_vente, '%%Y-%%m')
        ORDER BY periode;
    """,
    "top_products": """
        SELECT p.nom AS produit,
               COALESCE(SUM(lv.quantite),0) AS quantite_vendue,
               COALESCE(SUM(lv.quantite * lv.prix_unitaire),0) AS chiffre_affaires
        FROM ventes v
        JOIN lignes_vente lv ON lv.id_vente = v.id_vente
        JOIN lot_stock ls ON ls.id_lot = lv.id_lot
        JOIN produits p ON p.id_produit = ls.id_produit
        WHERE v.annule='0'
          AND DATE(v.date_vente) BETWEEN %s AND %s
        GROUP BY p.id_produit, p.nom
        ORDER BY chiffre_affaires DESC
        LIMIT 20;
    """,
    "gross_margin_by_month": """
        SELECT DATE_FORMAT(v.date_vente, '%%Y-%%m') AS periode,
               COALESCE(SUM(lv.quantite * lv.prix_unitaire),0) AS ventes,
               COALESCE(SUM(lv.quantite * ls.prix_achat),0) AS cout_achat,
               COALESCE(SUM((lv.prix_unitaire - ls.prix_achat) * lv.quantite),0) AS marge_brute
        FROM ventes v
        JOIN lignes_vente lv ON lv.id_vente = v.id_vente
        JOIN lot_stock ls ON ls.id_lot = lv.id_lot
        WHERE v.annule='0'
          AND DATE(v.date_vente) BETWEEN %s AND %s
        GROUP BY DATE_FORMAT(v.date_vente, '%%Y-%%m')
        ORDER BY periode;
    """,
    "purchases_by_supplier": """
        SELECT COALESCE(f.nom, 'Non défini') AS fournisseur,
               COUNT(ls.id_lot) AS nb_lots,
               COALESCE(SUM(ls.quantite),0) AS quantite_approvisionnee,
               COALESCE(SUM(ls.quantite * ls.prix_achat),0) AS valeur_achat
        FROM lot_stock ls
        LEFT JOIN fournisseurs f ON f.id_fournisseur = ls.fournisseur
        WHERE DATE(ls.date_approvisionnement) BETWEEN %s AND %s
        GROUP BY fournisseur
        ORDER BY valeur_achat DESC
        LIMIT 20;
    """,
    "stock_movements": """
        SELECT DATE_FORMAT(DATE(sm.date_mouvement), '%%Y-%%m-%%d') AS periode,
               sm.type_mouvement,
               COUNT(*) AS nb_mouvements,
               COALESCE(SUM(sm.quantite),0) AS quantite
        FROM stock_mouvements sm
        WHERE DATE(sm.date_mouvement) BETWEEN %s AND %s
        GROUP BY DATE_FORMAT(DATE(sm.date_mouvement), '%%Y-%%m-%%d'), sm.type_mouvement
        ORDER BY periode DESC, sm.type_mouvement;
    """,
    "declassements_ajustements": """
        SELECT DATE_FORMAT(DATE(sm.date_mouvement), '%%Y-%%m-%%d') AS periode,
               p.nom AS produit,
               sm.id_lot,
               sm.type_mouvement,
               sm.quantite,
               COALESCE(sm.raison, '') AS raison
        FROM stock_mouvements sm
        JOIN lot_stock ls ON ls.id_lot = sm.id_lot
        JOIN produits p ON p.id_produit = ls.id_produit
        WHERE DATE(sm.date_mouvement) BETWEEN %s AND %s
          AND LOWER(sm.type_mouvement) IN ('ajustement','declassement','déclassement','perte','expiration','modification stock')
        ORDER BY sm.date_mouvement DESC
        LIMIT 200;
    """,
    "expiring_stock": """
        SELECT p.nom AS produit,
               ls.id_lot,
               ls.quantite,
               DATE_FORMAT(ls.date_expiration, '%%Y-%%m-%%d') AS date_expiration,
               COALESCE(f.nom, 'Non défini') AS fournisseur,
               ls.prix_achat
        FROM lot_stock ls
        JOIN produits p ON p.id_produit = ls.id_produit
        LEFT JOIN fournisseurs f ON f.id_fournisseur = ls.fournisseur
        WHERE ls.quantite > 0
          AND ls.date_expiration IS NOT NULL
          AND DATE(ls.date_expiration) BETWEEN %s AND %s
        ORDER BY ls.date_expiration ASC
        LIMIT 200;
    """
}

@reporting_bp.route("/reports", methods=["GET"])
def list_reports():
    return jsonify({"success": True, "data": list(REPORTS.keys())})

@reporting_bp.route("/query", methods=["POST"])
def run_report():
    payload = request.get_json(silent=True) or {}
    name = payload.get("name")
    date_from = payload.get("date_from")
    date_to = payload.get("date_to")

    if not name or name not in REPORTS:
        return jsonify({"success": False, "error": "Rapport inconnu"}), 400
    if not date_from or not date_to:
        return jsonify({"success": False, "error": "date_from et date_to requis"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute(REPORTS[name], (date_from, date_to))
            rows = cursor.fetchall()
        return jsonify({"success": True, "name": name, "data": rows})
    except Exception as e:
        print("Erreur /api/reporting:", e)
        return jsonify({"success": False, "error": str(e)}), 500
