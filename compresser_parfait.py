import os
import subprocess
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

# Chemin absolu vers le gifsicle.exe local du dossier
GIFSICLE_EXE = os.path.join(BASE_DIR, "gifsicle.exe")

def compress_png(file_path):
    with Image.open(file_path) as img:
        img.save(file_path, "PNG", optimize=True)

def compress_jpg(file_path):
    with Image.open(file_path) as img:
        img.save(file_path, "JPEG", optimize=True, quality=88)

def compress_gif_gifsicle(file_path):
    """ Compression GIF autorisant une légère perte pour garantir un gain de poids """
    try:
        clean_path = os.path.abspath(file_path)
        
        # --lossy=35 permet de réduire le poids de 20 à 40% sans altérer la qualité visuelle
        result = subprocess.run(
            [GIFSICLE_EXE, "-b", "-O3", "--lossy=35", clean_path],
            capture_output=True,
            text=True
        )
        if result.returncode != 0 and result.stderr:
            print(f"Erreur Gifsicle sur {os.path.basename(file_path)}: {result.stderr.strip()}")
    except Exception as e:
        print(f"Erreur sur {os.path.basename(file_path)}: {e}")

def process_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    original_size = os.path.getsize(file_path)

    try:
        if ext == ".png":
            compress_png(file_path)
        elif ext in [".jpg", ".jpeg"]:
            compress_jpg(file_path)
        elif ext == ".gif":
            compress_gif_gifsicle(file_path)
        elif ext == ".webp":
            with Image.open(file_path) as img:
                img.save(file_path, "WEBP", quality=88)

        new_size = os.path.getsize(file_path)
        if new_size < original_size:
            gain = ((original_size - new_size) / original_size) * 100
            print(f"OK (-{gain:.1f}%) : {os.path.basename(file_path)}")
        else:
            print(f"Déjà optimal : {os.path.basename(file_path)}")
    except Exception as e:
        print(f"Erreur sur {os.path.basename(file_path)}: {e}")

def main():
    if not os.path.exists(ASSETS_DIR):
        print(f"Dossier introuvable : {ASSETS_DIR}")
        return

    print(f"Vérification de Gifsicle : {GIFSICLE_EXE}")
    print("Début du traitement...")
    count = 0
    for root, _, files in os.walk(ASSETS_DIR):
        for file in files:
            file_path = os.path.join(root, file)
            process_file(file_path)
            count += 1
    print(f"\nTerminé ! {count} fichiers traités.")

if __name__ == "__main__":
    main()