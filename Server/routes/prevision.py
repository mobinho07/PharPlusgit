from flask import Blueprint, jsonify
import pandas as pd 
import numpy as np 
from sklearn.linear_model import LinearRegression 
from datetime import timedelta

from database import get_db_cursor  # adapte si ton fichier DB a un autre nom

forecast_bp = Blueprint("forecast_bp", __name__)


def get_sales_history():
    sql = """
        SELECT 
            DATE(date_vente) AS jour,
            COALESCE(SUM(montant_total), 0) AS chiffre_affaires,
            COUNT(*) AS nb_ventes
        FROM ventes
        WHERE annule = '0'
        GROUP BY DATE(date_vente)
        ORDER BY jour;
    """

    with get_db_cursor() as (cursor, conn):
        cursor.execute(sql)
        rows = cursor.fetchall()

    return rows


@forecast_bp.route("/sales", methods=["GET"])
def forecast_sales():
    try:
        rows = get_sales_history()

        if len(rows) < 30:
            return jsonify({
                "success": False,
                "error": "Pas assez de données pour faire une prévision fiable."
            }), 400

        df = pd.DataFrame(rows)

        df["jour"] = pd.to_datetime(df["jour"])
        df["chiffre_affaires"] = df["chiffre_affaires"].astype(float)
        df["nb_ventes"] = df["nb_ventes"].astype(float)

        df["day_index"] = np.arange(len(df))
        df["day_of_week"] = df["jour"].dt.dayofweek
        df["month"] = df["jour"].dt.month

        X = df[["day_index", "day_of_week", "month"]]
        y_ca = df["chiffre_affaires"]
        y_nb = df["nb_ventes"]

        model_ca = LinearRegression()
        model_nb = LinearRegression()

        model_ca.fit(X, y_ca)
        model_nb.fit(X, y_nb)

        last_day = df["jour"].max()
        future_days = []

        for i in range(1, 31):
            future_date = last_day + timedelta(days=i)

            future_days.append({
                "date": future_date,
                "day_index": len(df) + i - 1,
                "day_of_week": future_date.dayofweek,
                "month": future_date.month
            })

        future_df = pd.DataFrame(future_days)

        X_future = future_df[["day_index", "day_of_week", "month"]]

        future_df["ca_prevu"] = model_ca.predict(X_future)
        future_df["ventes_prevues"] = model_nb.predict(X_future)

        future_df["ca_prevu"] = future_df["ca_prevu"].clip(lower=0).round(2)
        future_df["ventes_prevues"] = future_df["ventes_prevues"].clip(lower=0).round(0)

        demain = future_df.iloc[0]

        semaine = future_df.iloc[:7]
        mois = future_df.iloc[:30]
 
        return jsonify({
            "success": True,
            "last_history_date": str(last_day.date()),

            "demain": {
                "date": str(demain["date"].date()),
                "ca_prevu": float(demain["ca_prevu"]),
                "ventes_prevues": int(demain["ventes_prevues"])
            },

            "semaine_prochaine": {
                "date_debut": str(semaine.iloc[0]["date"].date()),
                "date_fin": str(semaine.iloc[-1]["date"].date()),
                "ca_prevu": round(float(semaine["ca_prevu"].sum()), 2),
                "ventes_prevues": int(semaine["ventes_prevues"].sum())
            },

            "mois_prochain": {
                "date_debut": str(mois.iloc[0]["date"].date()),
                "date_fin": str(mois.iloc[-1]["date"].date()),
                "ca_prevu": round(float(mois["ca_prevu"].sum()), 2),
                "ventes_prevues": int(mois["ventes_prevues"].sum())
            },

            "daily_forecast": [
                {
                    "date": str(row["date"].date()),
                    "ca_prevu": float(row["ca_prevu"]),
                    "ventes_prevues": int(row["ventes_prevues"])
                }
                for _, row in future_df.iterrows()
            ]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500