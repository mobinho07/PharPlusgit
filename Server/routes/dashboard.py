from flask import Blueprint, request, jsonify
from database import get_db_cursor

dashboard_bp = Blueprint('dashboard', __name__)

QUERIES = {
    # KPIs
    "kpi_ca_jour": """
        SELECT COALESCE(SUM(montant_total),0) AS ca_jour
        FROM ventes
        WHERE DATE(date_vente) = CURDATE() AND annule='0';
    """,
    "kpi_nb_ventes_jour": """
        SELECT COUNT(*) AS nb_ventes_jour
        FROM ventes
        WHERE DATE(date_vente) = CURDATE() AND annule='0';
    """,
    "kpi_nb_alertes_stock": """
        SELECT COUNT(*) AS nb_alertes_stock
        FROM vue_produits_stock_bas;
    """,
    "kpi_nb_produits_actifs": """
        SELECT COUNT(DISTINCT p.id_produit) AS nb_produits_actifs
        FROM produits p
        JOIN lot_stock ls ON p.id_produit = ls.id_produit
        WHERE p.actif = 1 AND ls.quantite > 0;
    """,
    "kpi_valeur_stock": """
        SELECT COALESCE(SUM(ls.quantite * ls.prix_achat),0) AS valeur_stock
        FROM lot_stock ls;
    """,
    "kpi_ca_ytd": """
        SELECT COALESCE(SUM(montant_total),0) AS ca_ytd
        FROM ventes
        WHERE annule='0' AND date_vente >= DATE_FORMAT(CURDATE(),'%Y-01-01');
    """,

    # Graphs ventes
    "chart_ventes_30j": """
        SELECT jour, total_ventes
        FROM vue_ventes_30_jours
        ORDER BY jour;
    """,
    "chart_ca_mensuel_ytd": """
        SELECT DATE_FORMAT(date_vente,'%Y-%m') AS mois,
               SUM(montant_total) AS ca_mois
        FROM ventes
        WHERE annule='0' AND YEAR(date_vente)=YEAR(CURDATE())
        GROUP BY DATE_FORMAT(date_vente,'%Y-%m')
        ORDER BY mois;
    """,
    "chart_ca_par_semaine_12": """
        SELECT YEARWEEK(date_vente, 3) AS an_semaine,
               MIN(DATE(date_vente)) AS debut_semaine,
               SUM(montant_total) AS ca_semaine
        FROM ventes
        WHERE annule='0' AND date_vente >= (CURDATE() - INTERVAL 84 DAY)
        GROUP BY YEARWEEK(date_vente,3)
        ORDER BY an_semaine;
    """,

    # Top & répartition
    "top5_produits_30j": """
        SELECT produit, total_vendu
        FROM vue_top_produits_vendus
        ORDER BY total_vendu DESC
        LIMIT 5;
    """,
    "repartition_categorie_30j": """
        SELECT p.category, COALESCE(SUM(v.montant_total),0) AS ca
        FROM ventes v
        JOIN lignes_vente lv ON v.id_vente=lv.id_vente
        JOIN lot_stock ls ON lv.id_lot=ls.id_lot
        JOIN produits p ON ls.id_produit=p.id_produit
        WHERE v.annule='0' AND v.date_vente >= (CURDATE() - INTERVAL 30 DAY)
        GROUP BY p.category
        ORDER BY ca DESC;
    """,

    # Alertes / stock
    "alertes_expiration_30j": """
        SELECT produit, DATE_FORMAT(date_expiration, '%d-%m-%Y') as date_expiration, quantite

        FROM vue_produits_expiration_proche
        ORDER BY date_expiration ASC;
    """,
    "stock_bas": """
        SELECT produit, total_stock, seuil
        FROM vue_produits_stock_bas
        ORDER BY total_stock ASC;
    """,
    "resume_stock": """
        SELECT produit, total_stock
        FROM vue_resume_stock
        ORDER BY total_stock DESC;
    """,
    "stock_delta_30j": """
        SELECT DATE(date_mouvement) AS jour,
               SUM(CASE WHEN type_mouvement='entree' THEN quantite
                        WHEN type_mouvement='sortie' THEN -quantite
                        ELSE 0 END) AS delta
        FROM stock_mouvements
        WHERE date_mouvement >= (CURDATE() - INTERVAL 30 DAY)
        GROUP BY DATE(date_mouvement)
        ORDER BY jour;
    """,

    # Prévision
    "forecast_sma7": """
        WITH d AS (
          SELECT DATE(date_vente) AS jour, SUM(montant_total) AS ca
          FROM ventes
          WHERE annule='0' AND date_vente >= (CURDATE() - INTERVAL 60 DAY)
          GROUP BY DATE(date_vente)
        )
        SELECT jour, ca,
               AVG(ca) OVER (ORDER BY jour ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS sma7
        FROM d
        ORDER BY jour;
    """
}

@dashboard_bp.route('/query', methods=["POST"])
def dashboard():
    payload = request.get_json(silent=True) or {}
    name = payload.get("name")
    if not name:
        return jsonify({"success": False, "error": "Paramètre 'name' requis"}), 400

    sql = QUERIES.get(name)
    if not sql:
        return jsonify({"success": False, "error": f"Requête inconnue: {name}"}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute(sql)
            rows = cursor.fetchall()  # DictCursor -> dicts
        return jsonify({"success": True, "name": name, "data": rows})
    except Exception as e:
        print("Erreur /api/dashboard:", e)
        return jsonify({"success": False, "error": str(e)}), 500
