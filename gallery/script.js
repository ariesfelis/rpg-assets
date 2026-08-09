const USER="ariesfelis";
const REPO="rpg-assets";
const ROOT="assets";
const BRANCH="main"; // adapte si ta branche par défaut a un autre nom

// change cette valeur régulièrement, comme un mot de passe.
// Elle est visible dans le code source (donc pas une vraie sécurité),
// juste un frein pour que ce ne soit pas trouvable par hasard.
const PRIVATE_KEY = "taz";

// transforme un chemin de fichier GitHub en URL d'image utilisable partout
// (GitHub Pages sert directement les fichiers du repo sur un domaine
// github.io réputé, plus susceptible d'être accepté par les validateurs
// de forum stricts que raw.githubusercontent.com ou jsdelivr.net)
function toImageUrl(path){
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return `https://af-rpg.fyi/${encodedPath}`;
}
 
const gallery=document.getElementById("gallery");
const back=document.getElementById("back");

let currentPath = ROOT;
let history = [];

// si l'URL contient déjà un chemin (#...), on démarre directement dedans
const hashPath = decodeURIComponent(location.hash.replace("#", ""));
if (hashPath && hashPath.startsWith(ROOT)) {
    currentPath = hashPath;
}

let currentImages = [];
let currentImageIndex = 0;
const prevImage = document.getElementById("prevImage");
const nextImage = document.getElementById("nextImage");
const breadcrumb = document.getElementById("breadcrumb");
const searchInput = document.getElementById("search");

// --- Données statiques (data.json) ---
// Remplace les appels à l'API GitHub : ce fichier est généré en local
// via generer_data_json.py et republié à chaque mise à jour de la galerie.
// Chargé une seule fois au démarrage, ensuite tout est calculé en JS,
// sans plus jamais interroger api.github.com (donc aucun risque de
// limite de requêtes, peu importe le nombre de visiteurs).
let ALL_FILES = [];
let ALL_FOLDERS = [];

// --- Suivi GoatCounter ---
// Une "vue" par dossier consulté (pas juste 1 vue globale), et un
// "événement" à chaque copie de lien, regroupé par FC pour savoir
// quelles galeries sont le plus utilisées, pas juste regardées.
function trackPageview(path){
    if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: path, title: path, event: false });
    }
}
 
function trackCopyEvent(imagePath){
    if (window.goatcounter && window.goatcounter.count) {
        const folder = imagePath.substring(0, imagePath.lastIndexOf("/"));
        window.goatcounter.count({
            path: "copie-lien:" + folder,
            title: "Copie de lien - " + folder,
            event: true
        });
    }
}

async function loadData(){
    const res = await fetch("./data.json");
    if (!res.ok) {
        throw new Error(`Impossible de charger data.json (${res.status})`);
    }
    const data = await res.json();
    ALL_FILES = data.files || [];
    ALL_FOLDERS = data.folders || [];

    // mode galerie privée : seulement si la clé attendue est dans l'URL
    // (ex: https://.../index.html?key=change-moi-123)
    const params = new URLSearchParams(location.search);
    if (params.get("key") === PRIVATE_KEY) {
        try {
            const privRes = await fetch("./data_prive.json");
            if (privRes.ok) {
                const privData = await privRes.json();
                ALL_FILES = ALL_FILES.concat(privData.files || []);
                ALL_FOLDERS = ALL_FOLDERS.concat(privData.folders || []);
            }
        } catch (err) {
            console.warn("data_prive.json introuvable ou invalide :", err);
        }
    }
}

// simule la forme de réponse de l'ancienne API GitHub (liste de
// {type, name, path}) pour un dossier donné, à partir de ALL_FILES
// et ALL_FOLDERS (pour que les dossiers vides apparaissent aussi)
function getFolder(path){
    const prefix = path.endsWith("/") ? path : path + "/";
    const seenFolders = new Set();
    const entries = [];

    ALL_FILES.forEach(filePath => {
        if (!filePath.startsWith(prefix)) return;

        const rest = filePath.slice(prefix.length);
        const slashIndex = rest.indexOf("/");

        if (slashIndex === -1) {
            // fichier directement dans ce dossier
            entries.push({ type: "file", name: rest, path: filePath });
        } else {
            // sous-dossier (contient au moins une image)
            const folderName = rest.slice(0, slashIndex);
            if (!seenFolders.has(folderName)) {
                seenFolders.add(folderName);
                entries.push({ type: "dir", name: folderName, path: prefix + folderName });
            }
        }
    });

    // sous-dossiers vides, déclarés explicitement dans data.json
    ALL_FOLDERS.forEach(folderPath => {
        if (!folderPath.startsWith(prefix)) return;

        const rest = folderPath.slice(prefix.length);
        if (rest === "" || rest.includes("/")) return; // seulement les enfants directs

        if (!seenFolders.has(rest)) {
            seenFolders.add(rest);
            entries.push({ type: "dir", name: rest, path: prefix + rest });
        }
    });

    return entries;
}

// extrait une date normalisée AAAAMMJJ (ou AAAAMM) du nom de fichier, si présente.
// Reconnaît trois formats :
//   1. Nouvelle convention : jjmmaaaa_nom_nombre.ext (ex: 15032024_zendaya_1.png)
//   2. Ancien format TumblThree : ..._aaaammjj_... (ex: ..._20230131_ariesfelis_...)
//   3. mmaaaa_ en début de nom (ex: 032024_zendaya_1.png)
function extractDate(filename){
    // 1. jjmmaaaa au tout début du nom
    let m = filename.match(/^(\d{2})(\d{2})(\d{4})_/);
    if (m) {
        const [, dd, mm, yyyy] = m;
        return `${yyyy}${mm}${dd}`;
    }

    // 2. aaaammjj entouré d'underscores, ailleurs dans le nom
    m = filename.match(/_(\d{8})_/);
    if (m) return m[1];

    // 3. NOUVEAU : format MMAAAA_ en début de nom
    m = filename.match(/^(\d{2})(\d{4})_/);
    if (m) {
        const [, mm, yyyy] = m;
        // On retourne l'année PUIS le mois pour que le tri fonctionne correctement
        return `${yyyy}${mm}`;
    }

    return null;
}

// transforme la date brute (AAAAMMJJ ou AAAAMM) issue de extractDate()
// en un libellé lisible affiché sous chaque avatar (jj/mm/aaaa ou mm/aaaa)
function formatDateLabel(filename){
    const raw = extractDate(filename);
    if (!raw) return null;

    if (raw.length === 8) {
        const yyyy = raw.slice(0, 4);
        const mm = raw.slice(4, 6);
        const dd = raw.slice(6, 8);
        return `${dd}/${mm}/${yyyy}`;
    }

    if (raw.length === 6) {
        const yyyy = raw.slice(0, 4);
        const mm = raw.slice(4, 6);
        return `${mm}/${yyyy}`;
    }

    return null;
}

// trie les images : plus récentes en premier (date détectée),
// celles sans date reconnue sont placées à la fin, par ordre alphabétique
function sortImagesByDate(images){
    return [...images].sort((a, b) => {
        const da = extractDate(a.name);
        const db = extractDate(b.name);

        if (da && db) {
            // Si c'est exactement le même mois et la même année, on trie sur le numéro final (de Z à A)
            if (da === db) {
                 return b.name.localeCompare(a.name);
            }
            return db.localeCompare(da); // Tri du plus récent au plus ancien
        }
        
        if (da) return -1;
        if (db) return 1;
        return b.name.localeCompare(a.name);
    });
}
function showFolders(folders){

    folders.forEach(folder=>{
        const card=document.createElement("div");
        card.className="folder";
        card.innerHTML=`
		<img class="folder-icon" src="./png/folder.png" alt="folder">
		<div class="name">${folder.name}</div>
	`;

        card.onclick=()=>{
            history.push(currentPath);
            currentPath=folder.path;
            loadFolder(currentPath);
        };

        gallery.appendChild(card);
    });
}

function showImages(images){

    images.forEach(image=>{
        const cdnUrl = toImageUrl(image.path); // <-- lien direct GitHub
        const dateLabel = formatDateLabel(image.name);

        const card=document.createElement("div");
        card.className="icon";
        card.innerHTML=`
            <img src="${cdnUrl}" alt="" loading="lazy">
            <button class="copy" title="Copier l'URL">⧉</button>
            ${dateLabel ? `<div class="image-date">${dateLabel}</div>` : ""}
        `;
        const button=card.querySelector(".copy");
        const img = card.querySelector("img");

        img.onclick = ()=>{
            currentImageIndex = images.indexOf(image);
            openPreview();
        };

        button.onclick=(e)=>{
            e.stopPropagation();
            navigator.clipboard.writeText(cdnUrl); // <-- copie le lien direct GitHub
            trackCopyEvent(image.path);
            button.textContent="✓";
            setTimeout(()=>{
                button.textContent="⧉";
            },1000);
        };
        gallery.appendChild(card);
    });
}

// charge un dossier (aucun appel réseau, tout vient de ALL_FILES déjà en mémoire)
function loadFolder(path){
    if (searchInput) searchInput.value = "";

    const files = getFolder(path);

    const folders = files.filter(f => f.type === "dir");
    const images = sortImagesByDate(
        files.filter(f => f.type === "file" && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name))
    );
    currentImages = images;

    gallery.innerHTML = "";
    showFolders(folders);
    showImages(images);

    if (folders.length === 0 && images.length === 0) {
        gallery.innerHTML = '<div class="loading">Rien ici pour l\'instant — reviens bientôt !</div>';
    }

    if(path !== ROOT){
        back.classList.remove("hidden");
    }else{
        back.classList.add("hidden");
    }

    updateBreadcrumb(path);

    // met à jour l'URL pour refléter le dossier actuel
    location.hash = encodeURIComponent(path);

    trackPageview(path);
}

// back to homepage
back.onclick = ()=>{
    if (history.length > 0) {
        currentPath = history.pop();
        loadFolder(currentPath);
    } else {
        currentPath = ROOT;
        loadFolder(ROOT);
    }
};

// ajoute le preview

const preview = document.getElementById("preview");
const previewImage = document.getElementById("previewImage");

function openPreview(){
    if(!preview || !previewImage) return;
    previewImage.src = toImageUrl(currentImages[currentImageIndex].path);
    preview.classList.remove("hidden", "hide");
    requestAnimationFrame(() => {
        preview.classList.add("show");
    });
}

function hidePreview(){
    if(!preview || !previewImage) return;

    preview.classList.remove("show");
    preview.classList.add("hide");

    // pour l'animation
    setTimeout(() => {
        preview.classList.add("hidden");
        preview.classList.remove("hide");
        previewImage.src = "";
    }, 250);
}

// ferme quand je clique en-dehors de l'image
if(preview){
    preview.onclick = (e) => {
        if(e.target === preview){
            hidePreview();
        }
    };
}

// comportement du clic sur les flèches de preview
prevImage.onclick = (e) => {
    e.stopPropagation();
    showImage(currentImageIndex - 1);
};

nextImage.onclick = (e) => {
    e.stopPropagation();
    showImage(currentImageIndex + 1);
};

// navigation clavier dans la preview (flèches + échap)
document.addEventListener("keydown", (e) => {
    if (!preview || preview.classList.contains("hidden")) return;

    if (e.key === "ArrowLeft") {
        showImage(currentImageIndex - 1);
    } else if (e.key === "ArrowRight") {
        showImage(currentImageIndex + 1);
    } else if (e.key === "Escape") {
        hidePreview();
    }
});

function showImage(index){
    if(index < 0){
        index = currentImages.length - 1;
    }else if(index >= currentImages.length){
        index = 0;
    }
    currentImageIndex = index;
    previewImage.src = toImageUrl(currentImages[currentImageIndex].path);
}

// ajout fil d'ariane cliquable
function updateBreadcrumb(path){
    if(!breadcrumb) return;

    breadcrumb.innerHTML = "";

    const parts = path.split("/");
    if(parts[0] === ROOT) parts.shift();

    // "accueil" ramène toujours à la racine
    const homeLink = document.createElement("span");
    homeLink.textContent = "accueil";
    homeLink.className = "crumb";
    homeLink.onclick = () => navigateToPath(ROOT);
    breadcrumb.appendChild(homeLink);

    let cumulative = ROOT;
    parts.forEach((part, i) => {
        breadcrumb.appendChild(document.createTextNode(" / "));

        cumulative += "/" + part;
        const isLast = i === parts.length - 1;

        const span = document.createElement("span");
        span.textContent = part;
        span.className = isLast ? "crumb current" : "crumb";

        if (!isLast) {
            const targetPath = cumulative;
            span.onclick = () => navigateToPath(targetPath);
        }

        breadcrumb.appendChild(span);
    });
}

// navigue directement vers un chemin donné (depuis un clic sur le fil d'ariane
// ou sur un résultat de recherche), en reconstruisant l'historique pour que
// "Retour" reste cohérent ensuite
function navigateToPath(path){
    const segments = path.split("/");
    history = [];

    let cumulative = segments[0];
    for (let i = 1; i < segments.length; i++) {
        history.push(cumulative);
        cumulative += "/" + segments[i];
    }

    currentPath = path;
    loadFolder(path);
}

// --- Recherche globale de FC depuis n'importe quelle page ---
// Contrairement à un simple filtre du dossier courant, ceci cherche parmi
// TOUS les dossiers qui contiennent directement des avatars (donc les
// dossiers de FC, pas les dossiers de catégorie type "avatar homme/femme"
// ou de tri alphabétique), pour qu'on puisse taper un nom de FC depuis
// l'accueil sans avoir à naviguer dedans manuellement.
function getFCFolders(){
    const map = new Map(); // path -> name

    ALL_FILES.forEach(filePath => {
        if (!/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(filePath)) return;
        const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));
        if (!map.has(folderPath)) {
            map.set(folderPath, folderPath.substring(folderPath.lastIndexOf("/") + 1));
        }
    });

    return [...map.entries()].map(([path, name]) => ({ path, name }));
}

function showSearchResults(query){
    gallery.innerHTML = "";
    back.classList.add("hidden");

    if(breadcrumb){
        breadcrumb.innerHTML = "";
        const label = document.createElement("span");
        label.textContent = `résultats pour "${query}"`;
        breadcrumb.appendChild(label);
    }

    const q = query.toLowerCase();
    const matches = getFCFolders()
        .filter(f => f.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name));

    if(matches.length === 0){
        gallery.innerHTML = '<div class="loading">Aucun fc trouvé pour cette recherche.</div>';
        return;
    }

    matches.forEach(folder=>{
        const relative = folder.path.slice(ROOT.length + 1); // ex: "avatar femme/z/zendaya"
        const segments = relative.split("/");
        segments.pop();
        const parentLabel = segments.join(" / ");

        const card=document.createElement("div");
        card.className="folder";
        card.innerHTML=`
		<img class="folder-icon" src="./png/folder.png" alt="folder">
		<div class="name">${folder.name}</div>
		${parentLabel ? `<div class="folder-path">${parentLabel}</div>` : ""}
	`;

        card.onclick=()=>{
            navigateToPath(folder.path);
        };

        gallery.appendChild(card);
    });
}

// recherche globale : dès qu'une requête est tapée, on affiche les FC
// correspondants depuis toute la galerie plutôt que de filtrer le dossier
// courant ; on revient à la navigation normale quand le champ est vidé
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        if (query === "") {
            loadFolder(currentPath);
        } else {
            showSearchResults(query);
        }
    });
}

// --- Statistiques (avatars / FC) ---
// Calculées directement depuis ALL_FILES, déjà en mémoire : aucun
// coût réseau supplémentaire, donc plus besoin de mise en cache.
function computeStats() {
    const imagePaths = ALL_FILES.filter(p => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(p));
    const imageCount = imagePaths.length;

    // dossiers contenant directement des images
    const foldersWithImages = new Set(
        imagePaths.map(p => p.substring(0, p.lastIndexOf("/")))
    );

    // un FC = un dossier avec images, qui n'est parent d'aucun autre dossier avec images
    const fcCount = [...foldersWithImages].filter(folder =>
        ![...foldersWithImages].some(other => other !== folder && other.startsWith(folder + "/"))
    ).length;

    return { imageCount, fcCount };
}

function loadStats() {
    const statsEl = document.getElementById("stats");
    if (!statsEl) return;

    const { imageCount, fcCount } = computeStats();
    statsEl.textContent = `${imageCount} avatars · ${fcCount} faceclaims`;
}

// lance la galerie : on charge d'abord data.json, puis on affiche tout
(async function init(){
    try {
        await loadData();
        loadFolder(currentPath);
        loadStats();
    } catch (err) {
        console.error("Erreur au chargement de la galerie :", err);
        gallery.innerHTML = '<div class="loading">Erreur de chargement — vérifie que data.json existe bien à la racine du repo.</div>';
    }
})();