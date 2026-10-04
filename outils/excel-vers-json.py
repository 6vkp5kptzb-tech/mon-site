"""Convertit data/musique.xlsx en data/musique.json pour la page Musique.

Lancement : double-clic sur mettre-a-jour-musique.bat (à la racine du site),
ou `python outils/excel-vers-json.py`.

Colonnes attendues sur la première ligne de la première feuille (l'ordre n'a pas d'importance) :
  titre | style | date | lien | sunoId
`sunoId` est facultatif : s'il est vide et que `lien` est de la forme
https://suno.com/song/<identifiant>, l'identifiant est repris automatiquement.

Aucune dépendance : seul Python est nécessaire.
"""

import json
import re
import sys
import unicodedata
import zipfile
from datetime import date, datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "data" / "musique.xlsx"
CIBLE = RACINE / "data" / "musique.json"

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
COLONNES = ["titre", "style", "date", "lien", "sunoId"]
SUNO_ID = re.compile(r"suno\.com/(?:song|embed)/([0-9a-fA-F-]{36})")


def normaliser(texte):
    """« Suno ID » -> « sunoid » : insensible aux accents, espaces et majuscules."""
    texte = unicodedata.normalize("NFD", str(texte)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", texte.lower())


def lire_premiere_feuille(chemin):
    """Renvoie les lignes de la première feuille sous forme de listes de valeurs."""
    with zipfile.ZipFile(chemin) as z:
        partages = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
                partages.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))

        classeur = ET.fromstring(z.read("xl/workbook.xml"))
        feuille = classeur.find("m:sheets/m:sheet", NS)
        rid = feuille.get("{%s}id" % NS["r"])
        liens = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        cible = next(r.get("Target") for r in liens.findall("rel:Relationship", NS) if r.get("Id") == rid)
        cible = cible.lstrip("/")
        chemin_feuille = cible if cible.startswith("xl/") else "xl/" + cible

        lignes = []
        for row in ET.fromstring(z.read(chemin_feuille)).iter("{%s}row" % NS["m"]):
            valeurs = {}
            for c in row.findall("m:c", NS):
                colonne = index_colonne(c.get("r"))
                type_ = c.get("t")
                v = c.find("m:v", NS)
                if type_ == "s" and v is not None:
                    valeur = partages[int(v.text)]
                elif type_ == "inlineStr":
                    valeur = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
                elif v is not None:
                    valeur = v.text if type_ in ("str", "e") else nombre(v.text)
                else:
                    valeur = None
                valeurs[colonne] = valeur
            if valeurs:
                lignes.append([valeurs.get(i) for i in range(max(valeurs) + 1)])
        return lignes


def index_colonne(reference):
    lettres = re.match(r"[A-Z]+", reference).group()
    n = 0
    for l in lettres:
        n = n * 26 + ord(l) - 64
    return n - 1


def nombre(texte):
    f = float(texte)
    return int(f) if f.is_integer() else f


def en_date(valeur, numero_ligne):
    """Accepte une date Excel, « 2026-10-02 » ou « 02/10/2026 ». Renvoie « AAAA-MM-JJ »."""
    if valeur in (None, ""):
        return ""
    if isinstance(valeur, (int, float)):
        return (date(1899, 12, 30) + timedelta(days=int(valeur))).isoformat()
    texte = str(valeur).strip()
    for format_ in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(texte, format_).date().isoformat()
        except ValueError:
            pass
    raise ValueError("ligne %d : date « %s » non reconnue (utilise JJ/MM/AAAA)" % (numero_ligne, texte))


def texte(valeur):
    if valeur is None:
        return ""
    if isinstance(valeur, float) and valeur.is_integer():
        valeur = int(valeur)
    return str(valeur).strip()


def main():
    if not SOURCE.exists():
        raise SystemExit("Fichier introuvable : %s" % SOURCE)

    lignes = lire_premiere_feuille(SOURCE)
    if not lignes:
        raise SystemExit("Le fichier Excel est vide.")

    entetes = [normaliser(h or "") for h in lignes[0]]
    positions = {}
    for nom in COLONNES:
        if normaliser(nom) in entetes:
            positions[nom] = entetes.index(normaliser(nom))
    manquantes = [n for n in ("titre", "style", "date", "lien") if n not in positions]
    if manquantes:
        raise SystemExit("Colonne(s) manquante(s) sur la 1re ligne : " + ", ".join(manquantes))

    def cellule(ligne, nom):
        i = positions.get(nom)
        return ligne[i] if i is not None and i < len(ligne) else None

    morceaux = []
    for numero, ligne in enumerate(lignes[1:], start=2):
        titre = texte(cellule(ligne, "titre"))
        if not titre:
            continue  # ligne vide
        m = {
            "titre": titre,
            "style": texte(cellule(ligne, "style")),
            "date": en_date(cellule(ligne, "date"), numero),
            "lien": texte(cellule(ligne, "lien")),
        }
        suno_id = texte(cellule(ligne, "sunoId"))
        if not suno_id:
            trouve = SUNO_ID.search(m["lien"])
            suno_id = trouve.group(1) if trouve else ""
        if suno_id:
            m["sunoId"] = suno_id
        morceaux.append(m)

    contenu = "{\n  \"morceaux\": [\n"
    contenu += ",\n".join("    " + json.dumps(m, ensure_ascii=False) for m in morceaux)
    contenu += "\n  ]\n}\n"
    CIBLE.write_text(contenu, encoding="utf-8")

    avec_lecteur = sum(1 for m in morceaux if "sunoId" in m)
    print("OK : %d morceaux écrits dans data/musique.json (%d avec lecteur embarqué)."
          % (len(morceaux), avec_lecteur))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, zipfile.BadZipFile, PermissionError) as e:
        print("Erreur :", e)
        sys.exit(1)
