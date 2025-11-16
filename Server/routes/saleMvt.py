from flask import Blueprint, request, jsonify
from database import get_db_cursor

saleMvt_bp = Blueprint('saleMvt', __name__)

@saleMvt_bp.route("/vente", methods=["POST"])
def enregistrer_vente():
    data = request.get_json()
    lignes = data.get("lignes", [])
    id_utilisateur = data.get("id_utilisateur")

    # ✅ Validation basique
    if not lignes:
        return jsonify({"status": "error", "message": "Aucune ligne de vente fournie."}), 400
    if not id_utilisateur:
        return jsonify({"status": "error", "message": "Utilisateur non spécifié."}), 400

    try:
        with get_db_cursor() as (cursor, conn):

            # 1️⃣ Création de la vente (montant total temporaire = 0)
            cursor.execute("""
                INSERT INTO ventes (date_vente, montant_total, id_utilisateur)
                VALUES (NOW(), 0, %s)
            """, (id_utilisateur,))
            id_vente = cursor.lastrowid

            montant_total_calcule = 0.0

            # 2️⃣ Traitement de chaque ligne
            for ligne in lignes:
                id_lot = ligne.get("id_lot")
                quantite = ligne.get("quantite")

                if not id_lot or not quantite:
                    raise ValueError("Chaque ligne doit contenir id_lot et quantite.")

                # 🔍 Récupérer le prix du lot et le stock actuel
                cursor.execute("""
                    SELECT ls.prix_achat, ls.quantite, p.prix_unitaire, ls.id_produit, p.nom
                    FROM lot_stock ls
                    JOIN produits p ON ls.id_produit = p.id_produit
                    WHERE ls.id_lot = %s
                """, (id_lot,))
                lot = cursor.fetchone()

                if not lot:
                    raise ValueError(f"Lot {id_lot} introuvable.")
                if lot["quantite"] < quantite:
                    raise ValueError(f'Stock insuffisant pour le produit "{lot["nom"]}" (disponible : {lot['quantite']}).')

                # 💰 Déterminer le prix de vente
                # → utilise prix_vente (produit) si défini, sinon prix_achat (lot)
                prix_unitaire = float(lot["prix_unitaire"] or lot["prix_achat"])
                sous_total = prix_unitaire * quantite
                montant_total_calcule += sous_total

                # ➕ Insertion ligne de vente
                cursor.execute("""
                    INSERT INTO lignes_vente (id_vente, id_lot, quantite, prix_unitaire)
                    VALUES (%s, %s, %s, %s)
                """, (id_vente, id_lot, quantite, prix_unitaire))

                # 🔄 Mise à jour du stock
                cursor.execute("""
                    UPDATE lot_stock
                    SET quantite = quantite - %s
                    WHERE id_lot = %s
                """, (quantite, id_lot))

                # 🧾 Mouvement de stock
                cursor.execute("""
                    INSERT INTO stock_mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur)
                    VALUES (%s, %s, 'sortie', NOW(), %s)
                """, (id_lot, quantite, id_utilisateur))

            # 3️⃣ Mise à jour du total réel
            cursor.execute("""
                UPDATE ventes
                SET montant_total = %s
                WHERE id_vente = %s
            """, (montant_total_calcule, id_vente))

            conn.commit()

            return jsonify({
                "status": "success",
                "message": "Vente enregistrée avec succès.",
                "id_vente": id_vente,
                "montant_total": montant_total_calcule
            })

    except Exception as e:
        print("Erreur SQL dans enregistrer_vente:", e)
        return jsonify({"status": "error", "message": str(e)}), 500

@saleMvt_bp.route("/annuler", methods=["POST"])
def annuler_vente():
    data = request.get_json()
    id_vente = data.get("id_vente")
    id_utilisateur = data.get("id_utilisateur")
    motif = data.get("motif", "Annulation manuelle de la vente")

    # 🔎 Validation d'entrée
    if not id_vente or not id_utilisateur:
        return jsonify({
            "status": "error",
            "message": "Les champs 'id_vente' et 'id_utilisateur' sont requis."
        }), 400

    try:
        with get_db_cursor() as (cursor, conn):

            # 1️⃣ Vérifier la vente
            cursor.execute("""
                SELECT id_vente, montant_total, annule
                FROM ventes
                WHERE id_vente = %s
            """, (id_vente,))
            vente = cursor.fetchone()

            if not vente:
                return jsonify({
                    "status": "error",
                    "message": f"La vente {id_vente} n'existe pas."
                }), 404

            if vente["annule"] == "1":
                return jsonify({
                    "status": "error",
                    "message": f"La vente {id_vente} est déjà annulée."
                }), 400

            # 2️⃣ Récupérer les lignes associées à cette vente
            cursor.execute("""
                SELECT id_lot, quantite
                FROM lignes_vente
                WHERE id_vente = %s
            """, (id_vente,))
            lignes = cursor.fetchall()

            if not lignes:
                return jsonify({
                    "status": "error",
                    "message": f"Aucune ligne de vente trouvée pour la vente {id_vente}."
                }), 400

            # 3️⃣ Exécuter toutes les opérations dans une transaction
            try:
                for ligne in lignes:
                    id_lot = ligne["id_lot"]
                    quantite = ligne["quantite"]

                    # ✅ Réintégration du stock
                    cursor.execute("""
                        UPDATE lot_stock
                        SET quantite = quantite + %s
                        WHERE id_lot = %s
                    """, (quantite, id_lot))

                    # 🧾 Enregistrement d’un mouvement d’annulation
                    cursor.execute("""
                        INSERT INTO stock_mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur)
                        VALUES (%s, %s, 'annulation vente', NOW(), %s)
                    """, (id_lot, quantite, id_utilisateur))

                # 4️⃣ Marquer la vente comme annulée + historique
                cursor.execute("""
                    UPDATE ventes
                    SET annule = '1',
                        annule_par = %s,
                        motif_annulation = %s
                    WHERE id_vente = %s
                """, (id_utilisateur, motif, id_vente))

                # ✅ Validation complète de la transaction
                conn.commit()

                return jsonify({
                    "status": "success",
                    "message": f"Vente {id_vente} annulée avec succès.",
                    "id_vente": id_vente,
                    "motif": motif
                })

            except Exception as inner_err:
                # 🚨 Rollback automatique en cas d’erreur
                conn.rollback()
                raise inner_err

    except Exception as e:
        print("Erreur SQL dans annuler_vente:", e)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@saleMvt_bp.route("/retour", methods=["POST"]) # ignore 
def retour_produits():
    data = request.get_json()
    id_vente = data.get("id_vente")
    id_utilisateur = data.get("id_utilisateur")
    produits_retour = data.get("produits", [])  # liste: [{id_lot, quantite}]
    motif = data.get("motif", "Retour client")

    # ✅ Validation des données
    if not id_vente or not id_utilisateur or not produits_retour:
        return jsonify({
            "status": "error",
            "message": "Champs 'id_vente', 'id_utilisateur' et 'produits' requis."
        }), 400

    try:
        with get_db_cursor() as (cursor, conn):

            # 🔹 Vérifier que la vente existe et non annulée
            cursor.execute("""
                SELECT id_vente, montant_total, annule
                FROM ventes
                WHERE id_vente = %s
            """, (id_vente,))
            vente = cursor.fetchone()

            if not vente:
                return jsonify({"status": "error", "message": f"Vente {id_vente} introuvable"}), 404
            if vente["annule"] == "1":
                return jsonify({"status": "error", "message": "Vente déjà annulée"}), 400

            montant_rembourse_total = 0.0

            # 🔹 Gérer chaque produit retourné
            for item in produits_retour:
                id_lot = item.get("id_lot")
                qte_retour = float(item.get("quantite", 0))

                # Vérifier que le produit existe dans la vente
                cursor.execute("""
                    SELECT quantite, prix_unitaire
                    FROM lignes_vente
                    WHERE id_vente = %s AND id_lot = %s
                """, (id_vente, id_lot))
                ligne = cursor.fetchone()

                if not ligne:
                    raise ValueError(f"Lot {id_lot} non trouvé dans la vente {id_vente}")
                if qte_retour > ligne["quantite"]:
                    raise ValueError(f"Quantité retournée ({qte_retour}) supérieure à vendue ({ligne['quantite']})")

                # 💰 Calcul du montant à rembourser
                montant_retour = qte_retour * float(ligne["prix_unitaire"])
                montant_rembourse_total += montant_retour

                # 🔄 Réintégration du stock
                cursor.execute("""
                    UPDATE lot_stock
                    SET quantite = quantite + %s
                    WHERE id_lot = %s
                """, (qte_retour, id_lot))

                # ✏️ Mise à jour de la ligne_vente
                nouvelle_quantite = ligne["quantite"] - qte_retour
                if nouvelle_quantite > 0:
                    cursor.execute("""
                        UPDATE lignes_vente
                        SET quantite = %s
                        WHERE id_vente = %s AND id_lot = %s
                    """, (nouvelle_quantite, id_vente, id_lot))
                else:
                    cursor.execute("""
                        DELETE FROM lignes_vente
                        WHERE id_vente = %s AND id_lot = %s
                    """, (id_vente, id_lot))

                # 📦 Mouvement de stock
                cursor.execute("""
                    INSERT INTO stock_mouvements (id_lot, quantite, type_mouvement, date_mouvement, id_utilisateur)
                    VALUES (%s, %s, 'retour', NOW(), %s)
                """, (id_lot, qte_retour, id_utilisateur))

            # 🔹 Recalcul du total de la vente
            cursor.execute("""
                SELECT SUM(quantite * prix_unitaire) AS nouveau_total
                FROM lignes_vente
                WHERE id_vente = %s
            """, (id_vente,))
            nouveau_total = cursor.fetchone()["nouveau_total"] or 0.0 # type: ignore

            cursor.execute("""
                UPDATE ventes
                SET montant_total = %s
                WHERE id_vente = %s
            """, (nouveau_total, id_vente))

            # 🔹 Historiser le retour
            cursor.execute("""
                INSERT INTO annulations_partielles (id_vente, montant_rembourse, date_annulation, id_utilisateur, motif)
                VALUES (%s, %s, NOW(), %s, %s)
            """, (id_vente, montant_rembourse_total, id_utilisateur, motif))

            conn.commit()

            return jsonify({
                "status": "success",
                "message": "Retour enregistré avec succès",
                "id_vente": id_vente,
                "montant_rembourse": montant_rembourse_total,
                "nouveau_total": nouveau_total
            })

    except Exception as e:
        print("Erreur dans retour_produits:", e)
        return jsonify({"status": "error", "message": str(e)}), 500
