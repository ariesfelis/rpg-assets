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


def main():
    assets_path = Path(ASSETS_DIR)

    if not assets_path.exists():
        print(f"Dossier introuvable : {assets_path}")
        print("Verifie le chemin ASSETS_DIR en haut du script.")
        return

    files = []

    for file in assets_path.rglob("*"):
        if file.is_file() and file.suffix.lower() in IMAGE_EXTENSIONS:
            # chemin relatif incluant "assets/..." (meme format que l'API GitHub)
            rel = file.relative_to(assets_path.parent)
            files.append(str(rel).replace("\\", "/"))

    files.sort()

    data = {"files": files}

    output_path = Path(OUTPUT_FILE)
    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"{len(files)} fichier(s) liste(s) dans {output_path.resolve()}")
    print("Copie ce data.json a la racine de ton repo GitHub, puis commit.")


if __name__ == "__main__":
    main()
