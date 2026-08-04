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
USER = "ariesfelis"
REPO = "rpg-assets"
# ------------------

OUTPUT_FILE = "data.json"
PRIVATE_DATA_FILE = "data_prive.json"  # a uploader sur GitHub aussi (voir explications)
PRIVATE_LINKS_FILE = "liens_prives.txt"  # reste en LOCAL, ne pas uploader sur GitHub

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
    hidden_files = []

    for file in assets_path.rglob("*"):
        if file.is_file() and file.suffix.lower() in IMAGE_EXTENSIONS:
            rel = file.relative_to(assets_path.parent)
            rel_str = str(rel).replace("\\", "/")

            if is_hidden(rel.parts[:-1]):
                hidden_files.append(rel_str)
                continue

            files.append(rel_str)

    # dossiers (y compris vides), pour qu'ils apparaissent dans la
    # navigation meme sans image dedans
    folders = []
    hidden_folders = []
    for folder in assets_path.rglob("*"):
        if folder.is_dir():
            rel = folder.relative_to(assets_path.parent)
            rel_str = str(rel).replace("\\", "/")

            if is_hidden(rel.parts):
                hidden_folders.append(rel_str)
                continue

            folders.append(rel_str)

    files.sort()
    folders.sort()
    hidden_files.sort()
    hidden_folders.sort()

    data = {"files": files, "folders": folders}

    output_path = Path(OUTPUT_FILE)
    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"{len(files)} fichier(s) et {len(folders)} dossier(s) liste(s) dans {output_path.resolve()}")

    if hidden_files or hidden_folders:
        # data_prive.json : a uploader sur GitHub comme data.json, mais
        # jamais reference dans index.html -> invisible sauf si on connait
        # son nom exact et la cle secrete configuree dans script.js
        private_data = {"files": hidden_files, "folders": hidden_folders}
        private_data_path = Path(PRIVATE_DATA_FILE)
        private_data_path.write_text(
            json.dumps(private_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"{len(hidden_files)} fichier(s) et {len(hidden_folders)} dossier(s) prive(s) -> {private_data_path.resolve()}")
        print("(ce fichier data_prive.json doit etre uploade sur GitHub, comme data.json)")

        # fichier de liens plats, pour toi en local uniquement
        private_path = Path(PRIVATE_LINKS_FILE)
        lines = [f"{USER}.github.io/{REPO}/" + "/".join(
            part.replace(" ", "%20") for part in f.split("/")
        ) for f in hidden_files]
        lines = ["https://" + l for l in lines]
        private_path.write_text("\n".join(lines), encoding="utf-8")

        print(f"Liens directs individuels sauvegardes dans {private_path.resolve()} (LOCAL, ne pas uploader)")

    print("Copie data.json (et data_prive.json si present) a la racine de ton repo GitHub, puis commit.")


if __name__ == "__main__":
    main()
    input("\nAppuie sur Entrée pour fermer...")
