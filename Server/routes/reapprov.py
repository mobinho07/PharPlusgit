from flask import Blueprint, jsonify
from database import get_db_cursor

reapprov_bp = Blueprint("reapprovisionnement", __name__)

@reapprov_bp.route("/suggestions", methods=["GET"])
def suggestions():
    sql = """
        SELECT
            p.id_produit,
            p.nom AS produit,
            COALESCE(SUM(ls.quantite), 0) AS stock_actuel,
            COALESCE(v30.quantite_vendue_30j, 0) AS quantite_vendue_30j,
            ROUND(COALESCE(v30.quantite_vendue_30j, 0) / 30, 2) AS conso_jour,

            CASE
                WHEN COALESCE(v30.quantite_vendue_30j, 0) = 0 THEN NULL
                ELSE ROUND(COALESCE(SUM(ls.quantite), 0) / (v30.quantite_vendue_30j / 30), 1)
            END AS jours_restants,

            p.stock_minimum,
            p.stock_maximum,
            p.delai_livraison_jours,
            p.stock_securite_jours,

            GREATEST(
                0,
                CEIL(
                    ((COALESCE(v30.quantite_vendue_30j, 0) / 30)
                    * (p.delai_livraison_jours + p.stock_securite_jours))
                    - COALESCE(SUM(ls.quantite), 0)
                )
            ) AS quantite_recommandee,

            CASE
                WHEN COALESCE(SUM(ls.quantite), 0) <= p.stock_minimum THEN 'CRITIQUE'
                WHEN COALESCE(v30.quantite_vendue_30j, 0) = 0 THEN 'A_SURVEILLER'
                WHEN COALESCE(SUM(ls.quantite), 0) / (v30.quantite_vendue_30j / 30) <= p.delai_livraison_jours THEN 'URGENT'
                WHEN COALESCE(SUM(ls.quantite), 0) / (v30.quantite_vendue_30j / 30) <= (p.delai_livraison_jours + p.stock_securite_jours) THEN 'A_COMMANDER'
                ELSE 'OK'
            END AS urgence

        FROM produits p
        LEFT JOIN lot_stock ls ON ls.id_produit = p.id_produit
        LEFT JOIN (
            SELECT
                ls2.id_produit,
                SUM(lv.quantite) AS quantite_vendue_30j
            FROM ventes v
            JOIN lignes_vente lv ON lv.id_vente = v.id_vente
            JOIN lot_stock ls2 ON ls2.id_lot = lv.id_lot
            WHERE v.annule = '0'
              AND v.date_vente >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY ls2.id_produit
        ) v30 ON v30.id_produit = p.id_produit

        WHERE p.actif = 1

        GROUP BY
            p.id_produit,
            p.nom,
            v30.quantite_vendue_30j,
            p.stock_minimum,
            p.stock_maximum,
            p.delai_livraison_jours,
            p.stock_securite_jours

        ORDER BY
            FIELD(urgence, 'CRITIQUE', 'URGENT', 'A_COMMANDER', 'A_SURVEILLER', 'OK'),
            quantite_recommandee DESC;
    """

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute(sql)
            rows = cursor.fetchall()

        return jsonify({"success": True, "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500