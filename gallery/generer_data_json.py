"""
Genere data.json : la liste de tous les fichiers du dossier assets/.

Ce fichier remplace les appels a l'API GitHub pour la navigation et
les stats de la galerie -> plus aucun risque de rate limit, peu
importe le nombre de visiteurs, puisque data.json est juste un
fichier statique servi par GitHub Pages (pas l'API).

MODE D'EMPLOI :
1. Modifie ASSETS_DIR ci-dessous pour pointer vers ton dossier local
   "assets" (celui qui contient avatars_femmes, avatars_hommes, etc.)
2. Lance : python generer_data_json.py
3. Un fichier data.json est cree a cote du script.
4. Copie ce data.json a la racine de ton repo GitHub (a cote de
   index.html, script.js, style.css) et commit.
5. Recommence a chaque fois que tu ajoutes ou retires des avatars,
   puis republie data.json sur GitHub.
"""

import json
from pathlib import Path

# --- A MODIFIER ---
ASSETS_DIR = r"C:\Users\Lucie\Desktop\rpg-assets\assets"
# ------------------

OUTPUT_FILE = "data.json"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}


def is_hidden(parts):
    """Un dossier dont le nom (ou un parent) commence par '_' est exclu (non listé)."""
    return any(part.startswith("_") for part in parts)


def main():
    assets_path = Path(ASSETS_DIR)

    if not assets_path.exists():
        print(f"Dossier introuvable : {assets_path}")
        print("Verifie le chemin ASSETS_DIR en haut du script.")
        return

    files = []
    folders = []
    hidden_count = 0

    for file in assets_path.rglob("*"):
        if file.is_file() and file.suffix.lower() in IMAGE_EXTENSIONS:
            rel = file.relative_to(assets_path.parent)
            rel_str = str(rel).replace("\\", "/")

            if is_hidden(rel.parts[:-1]):
                hidden_count += 1
                continue

            files.append(rel_str)

    # dossiers (y compris vides), pour qu'ils apparaissent dans la
    # navigation meme sans image dedans
    for folder in assets_path.rglob("*"):
        if folder.is_dir():
            rel = folder.relative_to(assets_path.parent)

            if is_hidden(rel.parts):
                continue

            folders.append(str(rel).replace("\\", "/"))

    files.sort()
    folders.sort()

    data = {"files": files, "folders": folders}

    output_path = Path(OUTPUT_FILE)
    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"{len(files)} fichier(s) et {len(folders)} dossier(s) liste(s) dans {output_path.resolve()}")
    if hidden_count:
        print(f"{hidden_count} fichier(s) exclu(s) car dans un dossier prive (prefixe _)")
    print("Copie ce data.json a la racine de ton repo GitHub, puis commit.")


if __name__ == "__main__":
    main()
