const USER="ariesfelis";
const REPO="rpg-assets";
const ROOT="assets";
const BRANCH="main";
const PRIVATE_KEY = "taz";

function toImageUrl(path){
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return `https://af-rpg.fyi/${encodedPath}`;
}
 
const gallery=document.getElementById("gallery");
const back=document.getElementById("back");
let currentPath = ROOT;
let history = [];
let currentImages = [];
let currentImageIndex = 0;
const prevImage = document.getElementById("prevImage");
const nextImage = document.getElementById("nextImage");
const breadcrumb = document.getElementById("breadcrumb");
const searchInput = document.getElementById("search");
let ALL_FILES = [];
let ALL_FOLDERS = [];

function getReadableDate(filename) {
    const raw = extractDate(filename); 
    if (!raw) return ""; 
    const year = raw.substring(0, 4);
    const monthNum = parseInt(raw.substring(4, 6), 10);
    const day = raw.substring(6, 8);
    const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const monthName = months[monthNum - 1];
    return day ? `${day} ${monthName} ${year}` : `${monthName} ${year}`;
}

async function loadData(){
    const res = await fetch("./data.json");
    if (!res.ok) throw new Error(`Impossible de charger data.json (${res.status})`);
    const data = await res.json();
    ALL_FILES = data.files || [];
    ALL_FOLDERS = data.folders || [];
    const params = new URLSearchParams(location.search);
    if (params.get("key") === PRIVATE_KEY) {
        try {
            const privRes = await fetch("./data_prive.json");
            if (privRes.ok) {
                const privData = await privRes.json();
                ALL_FILES = ALL_FILES.concat(privData.files || []);
                ALL_FOLDERS = ALL_FOLDERS.concat(privData.folders || []);
            }
        } catch (err) { console.warn("data_prive.json introuvable", err); }
    }
}

function getFolder(path){
    const prefix = path.endsWith("/") ? path : path + "/";
    const seenFolders = new Set();
    const entries = [];
    ALL_FILES.forEach(filePath => {
        if (!filePath.startsWith(prefix)) return;
        const rest = filePath.slice(prefix.length);
        const slashIndex = rest.indexOf("/");
        if (slashIndex === -1) entries.push({ type: "file", name: rest, path: filePath });
        else {
            const folderName = rest.slice(0, slashIndex);
            if (!seenFolders.has(folderName)) { seenFolders.add(folderName); entries.push({ type: "dir", name: folderName, path: prefix + folderName }); }
        }
    });
    ALL_FOLDERS.forEach(folderPath => {
        if (!folderPath.startsWith(prefix)) return;
        const rest = folderPath.slice(prefix.length);
        if (rest === "" || rest.includes("/")) return;
        if (!seenFolders.has(rest)) { seenFolders.add(rest); entries.push({ type: "dir", name: rest, path: prefix + rest }); }
    });
    return entries;
}

function extractDate(filename){
    let m = filename.match(/^(\d{2})(\d{2})(\d{4})_/);
    if (m) return `${m[3]}${m[2]}${m[1]}`;
    m = filename.match(/_(\d{8})_/);
    if (m) return m[1];
    m = filename.match(/^(\d{1,2})(\d{4})_/);
    if (m) return `${m[2]}${m[1].padStart(2, '0')}`;
    return null;
}

function sortImagesByDate(images){
    return [...images].sort((a, b) => {
        const da = extractDate(a.name);
        const db = extractDate(b.name);
        if (da && db) return da === db ? b.name.localeCompare(a.name) : db.localeCompare(da);
        if (da) return -1;
        if (db) return 1;
        return b.name.localeCompare(a.name);
    });
}

function showImages(images){
    gallery.innerHTML = "";
    images.forEach(image=>{
        const cdnUrl = toImageUrl(image.path);
        const readableDate = getReadableDate(image.name);
        const card=document.createElement("div");
        card.className="icon";
        card.innerHTML=`
            <img src="${cdnUrl}" alt="" loading="lazy">
            <div class="image-date">${readableDate}</div>
            <button class="copy" title="Copier l'URL">⧉</button>
        `;
        card.querySelector("img").onclick = ()=>{ currentImageIndex = images.indexOf(image); openPreview(); };
        card.querySelector(".copy").onclick=(e)=>{ e.stopPropagation(); navigator.clipboard.writeText(cdnUrl); };
        gallery.appendChild(card);
    });
}

function loadFolder(path){
    const files = getFolder(path);
    const folders = files.filter(f => f.type === "dir");
    const images = sortImagesByDate(files.filter(f => f.type === "file" && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name)));
    currentImages = images;
    gallery.innerHTML = "";
    folders.forEach(f => {
        const card = document.createElement("div");
        card.className="folder";
        card.innerHTML=`<img class="folder-icon" src="./png/folder.png"><div class="name">${f.name}</div>`;
        card.onclick=()=>loadFolder(f.path);
        gallery.appendChild(card);
    });
    showImages(images);
}

(async function init(){
    try {
        await loadData();
        loadFolder(ROOT);
    } catch (err) {
        gallery.innerHTML = '<div class="loading">Erreur de chargement — vérifie que data.json existe bien à la racine.</div>';
    }
})();