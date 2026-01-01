from flask import Blueprint, request, jsonify
from database import get_db_cursor

fournisseurs_bp = Blueprint("fournisseurs", __name__)

def _validate_payload(data, is_update=False):
    nom = (data.get("nom") or "").strip()
    if not is_update and not nom:
        return False, "Le champ 'nom' est requis."
    if nom and len(nom) > 100:
        return False, "Le champ 'nom' dépasse 100 caractères."

    email = (data.get("email") or "").strip()
    if email and len(email) > 100:
        return False, "Le champ 'email' dépasse 100 caractères."

    contact = (data.get("contact") or "").strip()
    if contact and len(contact) > 100:
        return False, "Le champ 'contact' dépasse 100 caractères."

    telephone = (data.get("telephone") or "").strip()
    if telephone and len(telephone) > 20:
        return False, "Le champ 'telephone' dépasse 20 caractères."

    return True, None


@fournisseurs_bp.get("/list")
def list_fournisseurs():
    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                SELECT id_fournisseur, nom, contact, telephone, email
                FROM fournisseurs
                ORDER BY nom ASC
            """)
            rows = cursor.fetchall()
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        print("Erreur /api/fournisseurs/list:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@fournisseurs_bp.get("/<int:id_fournisseur>")
def get_fournisseur(id_fournisseur):
    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                SELECT id_fournisseur, nom, contact, telephone, email
                FROM fournisseurs
                WHERE id_fournisseur = %s
            """, (id_fournisseur,))
            row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Fournisseur introuvable."}), 404
        return jsonify({"success": True, "data": row})
    except Exception as e:
        print("Erreur /api/fournisseurs/<id>:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@fournisseurs_bp.get("/search")
def search_fournisseurs():
    q = (request.args.get("q") or "").strip()
    limit = int(request.args.get("limit") or 10)
    limit = max(1, min(limit, 50))

    try:
        with get_db_cursor() as (cursor, conn):
            if not q:
                cursor.execute("""
                    SELECT id_fournisseur, nom, contact, telephone, email
                    FROM fournisseurs
                    ORDER BY nom ASC
                    LIMIT %s
                """, (limit,))
            else:
                like = f"%{q}%"
                cursor.execute("""
                    SELECT id_fournisseur, nom, contact, telephone, email
                    FROM fournisseurs
                    WHERE nom LIKE %s OR contact LIKE %s OR email LIKE %s
                    ORDER BY nom ASC
                    LIMIT %s
                """, (like, like, like, limit))
            rows = cursor.fetchall()
        return jsonify({"success": True, "data": rows})
    except Exception as e:
        print("Erreur /api/fournisseurs/search:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@fournisseurs_bp.post("")
def create_fournisseur():
    data = request.get_json(silent=True) or {}
    ok, err = _validate_payload(data, is_update=False)
    if not ok:
        return jsonify({"success": False, "error": err}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("""
                INSERT INTO fournisseurs (nom, contact, telephone, email)
                VALUES (%s, %s, %s, %s)
            """, (
                (data.get("nom") or "").strip(),
                (data.get("contact") or None),
                (data.get("telephone") or None),
                (data.get("email") or None),
            ))
            conn.commit()
            new_id = cursor.lastrowid

            cursor.execute("""
                SELECT id_fournisseur, nom, contact, telephone, email
                FROM fournisseurs
                WHERE id_fournisseur = %s
            """, (new_id,))
            row = cursor.fetchone()

        return jsonify({"success": True, "message": "Fournisseur créé.", "data": row})
    except Exception as e:
        print("Erreur /api/fournisseurs POST:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@fournisseurs_bp.put("/<int:id_fournisseur>")
def update_fournisseur(id_fournisseur):
    data = request.get_json(silent=True) or {}
    ok, err = _validate_payload(data, is_update=True)
    if not ok:
        return jsonify({"success": False, "error": err}), 400

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("SELECT id_fournisseur FROM fournisseurs WHERE id_fournisseur=%s", (id_fournisseur,))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Fournisseur introuvable."}), 404

            # Update “partiel” : si champ absent => on garde la valeur actuelle
            cursor.execute("""
                UPDATE fournisseurs
                SET
                    nom = COALESCE(%s, nom),
                    contact = COALESCE(%s, contact),
                    telephone = COALESCE(%s, telephone),
                    email = COALESCE(%s, email)
                WHERE id_fournisseur = %s
            """, (
                (data.get("nom").strip() if isinstance(data.get("nom"), str) else None), # type: ignore
                (data.get("contact") if data.get("contact") is not None else None),
                (data.get("telephone") if data.get("telephone") is not None else None),
                (data.get("email") if data.get("email") is not None else None),
                id_fournisseur
            ))
            conn.commit()

            cursor.execute("""
                SELECT id_fournisseur, nom, contact, telephone, email
                FROM fournisseurs
                WHERE id_fournisseur = %s
            """, (id_fournisseur,))
            row = cursor.fetchone()

        return jsonify({"success": True, "message": "Fournisseur mis à jour.", "data": row})
    except Exception as e:
        print("Erreur /api/fournisseurs PUT:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@fournisseurs_bp.delete("/<int:id_fournisseur>")
def delete_fournisseur(id_fournisseur):
    cascade = (request.args.get("cascade") or "0").strip() in ("1", "true", "True", "yes", "YES")

    try:
        with get_db_cursor() as (cursor, conn):
            cursor.execute("SELECT id_fournisseur FROM fournisseurs WHERE id_fournisseur=%s", (id_fournisseur,))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Fournisseur introuvable."}), 404

            cursor.execute("SELECT COUNT(*) AS n FROM lot_stock WHERE fournisseur=%s", (id_fournisseur,))
            n = int(cursor.fetchone()["n"]) # type: ignore

            if n > 0 and not cascade:
                return jsonify({
                    "success": False,
                    "error": f"Suppression refusée: fournisseur utilisé dans {n} lot(s). Utilise cascade=1 si tu veux détacher."
                }), 409

            if n > 0 and cascade:
                cursor.execute("UPDATE lot_stock SET fournisseur=NULL WHERE fournisseur=%s", (id_fournisseur,))

            cursor.execute("DELETE FROM fournisseurs WHERE id_fournisseur=%s", (id_fournisseur,))
            conn.commit()

        return jsonify({"success": True, "message": "Fournisseur supprimé."})
    except Exception as e:
        print("Erreur /api/fournisseurs DELETE:", e)
        return jsonify({"success": False, "error": str(e)}), 500
