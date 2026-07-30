const USER="ariesfelis";
const REPO="rpg-assets";
const ROOT="assets";
const BRANCH="main"; // adapte si ta branche par défaut a un autre nom

// transforme un chemin de fichier GitHub en URL jsDelivr
function toJsdelivr(path){
    return `https://cdn.jsdelivr.net/gh/${USER}/${REPO}@${BRANCH}/${path}`;
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

// récupérer le contenu d'un dossier github
async function getFolder(path){
    const url=`https://api.github.com/repos/${USER}/${REPO}/contents/${path}`;
    const res=await fetch(url);
    return await res.json();
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
        const cdnUrl = toJsdelivr(image.path); // <-- lien jsDelivr

        const card=document.createElement("div");
        card.className="icon";
        card.innerHTML=`
            <img src="${cdnUrl}" alt="">
            <button class="copy" title="Copier l'URL">⧉</button>
        `;
        const button=card.querySelector(".copy");
        const img = card.querySelector("img");

        img.onclick = ()=>{
            currentImageIndex = images.indexOf(image);
            openPreview();
        };

        button.onclick=(e)=>{
            e.stopPropagation();
            navigator.clipboard.writeText(cdnUrl); // <-- copie le lien jsDelivr
            button.textContent="✓";
            setTimeout(()=>{
                button.textContent="⧉";
            },1000);
        };
        gallery.appendChild(card);
    });
}

// charge un dossier
async function loadFolder(path){
    gallery.innerHTML = "";

    const files = await getFolder(path);

    const folders = files.filter(f => f.type === "dir");
    const images = files.filter(
        f => f.type === "file" && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name)
    );
    currentImages = images;

    showFolders(folders);
    showImages(images);

    if(path !== ROOT){
        back.classList.remove("hidden");
    }else{
        back.classList.add("hidden");
    }

    updateBreadcrumb(path);

    // met à jour l'URL pour refléter le dossier actuel
    location.hash = encodeURIComponent(path);
}
    // fil d'ariane
    updateBreadcrumb(path);
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
    previewImage.src = toJsdelivr(currentImages[currentImageIndex].path);
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

function showImage(index){
    if(index < 0){
        index = currentImages.length - 1;
    }else if(index >= currentImages.length){
        index = 0;
    }
    currentImageIndex = index;
    previewImage.src = toJsdelivr(currentImages[currentImageIndex].path);
}

// ajout fil d'ariane
function updateBreadcrumb(path){
    if(!breadcrumb) return;

    const parts = path.split("/");

    if(parts[0] === ROOT){
        parts.shift();
    }

    breadcrumb.textContent = parts.length ? parts.join(" / ") : "accueil";
}


// lance la galerie
loadFolder(currentPath);
