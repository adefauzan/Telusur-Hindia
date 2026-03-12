/**
 * script.js - Logika Database & Interaksi Peta "Telusur Hindia"
 */

// 1. Inisialisasi Peta & Basemaps
const streetView = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    attribution: '&copy; OpenStreetMap contributors' 
});
const satelliteView = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
    attribution: 'Tiles &copy; Esri' 
});

const map = L.map('map', { 
    center: [-2.5489, 118.0149], 
    zoom: 5, 
    layers: [streetView] 
});

// Menambahkan kontrol pilihan peta di pojok kanan atas
L.control.layers({ "Peta Jalan": streetView, "Satelit": satelliteView }, null, { position: 'topright' }).addTo(map);

// 2. Variabel State & Selektor UI
const apiFolderUrl = 'https://api.github.com/repos/adefauzan/Telusur-Hindia/contents/database';
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-sidebar');
const yearSlider = document.getElementById('year-slider');
const floatingYear = document.getElementById('floating-year');
const searchInput = document.getElementById('search-input');
const filterListDiv = document.getElementById('filter-list');
const ticksContainer = document.getElementById('timeline-ticks');
const errorOverlay = document.getElementById('error-overlay');

let allMapFeatures = []; 
let uniqueCategories = new Set();

// 3. Generasi Garis Ticks Timeline
function createTicks() {
    const min = parseInt(yearSlider.min);
    const max = parseInt(yearSlider.max);
    const count = max - min;
    
    for (let i = 0; i <= count; i++) {
        const tick = document.createElement('div');
        tick.className = 'tick';
        const currentYear = min + i;
        // Menandai garis besar setiap 10 tahun atau tahun milestone sejarah
        if (currentYear % 10 === 0 || [1864, 1903, 1945].includes(currentYear)) {
            tick.classList.add('major');
        }
        ticksContainer.appendChild(tick);
    }
}

// 4. Logika Sembunyikan Sidebar
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('collapsed-state');
    // Berikan waktu animasi selesai sebelum menghitung ulang ukuran peta
    setTimeout(() => map.invalidateSize(), 400);
});

// 5. Update Indikator Tahun & Snap Logic
function updateFloatingYear() {
    const val = yearSlider.value;
    const min = yearSlider.min;
    const max = yearSlider.max;
    const percent = (val - min) / (max - min) * 100;
    
    floatingYear.innerText = val;
    // Menyesuaikan posisi horizontal indikator agar presisi di atas thumb slider
    floatingYear.style.left = `calc(${percent}% + (${8 - percent * 0.15}px))`;
    
    runGlobalFilter();
}

// 6. Pengambilan Data dari GitHub Database
async function loadDatabase() {
    try {
        const res = await fetch(apiFolderUrl);
        if (!res.ok) {
            if (res.status === 404) throw new Error("Folder 'database' tidak ditemukan.");
            if (res.status === 403) throw new Error("GitHub API Limit tercapai (tunggu sebentar).");
            throw new Error("Gagal akses database GitHub.");
        }
        
        const daftarFile = await res.json();
        const geojsonFiles = daftarFile.filter(f => f.name.endsWith('.geojson'));

        if (geojsonFiles.length === 0) throw new Error("Tidak ada data GeoJSON ditemukan.");

        // Mengambil isi data dari seluruh file secara paralel
        const allGeoData = await Promise.all(geojsonFiles.map(async file => {
            const r = await fetch(file.download_url);
            return await r.json();
        }));

        allGeoData.forEach(data => {
            L.geoJSON(data, {
                style: { color: "#c0392b", weight: 2, fillOpacity: 0.3 },
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                    radius: 7, fillColor: "#c0392b", color: "#fff", weight: 1, fillOpacity: 0.8
                }),
                onEachFeature: (feature, layer) => {
                    const props = feature.properties || {};
                    // Deteksi kategori/jenis objek
                    const kategori = props.JENISOB || props.kategori || props.tipe || "Lainnya";
                    const nama = props.nama || props.Nama || "Objek Tanpa Nama";
                    
                    // Deteksi tahun (prioritas pada atribut tahun/year)
                    let thnRaw = props.THN_PT || props.year || props.Year || props.Tahun;
                    let tahun = thnRaw ? parseInt(thnRaw) : null;

                    uniqueCategories.add(kategori);
                    allMapFeatures.push({ layer, kategori, nama, tahun });

                    // Desain Konten Popup
                    let popupHtml = `<div class="popup-title">${nama}</div><table class="popup-table">`;
                    for (let key in props) {
                        if(key.toLowerCase() !== 'nama') {
                            popupHtml += `<tr><td class="popup-label">${key}</td><td>${props[key]}</td></tr>`;
                        }
                    }
                    layer.bindPopup(popupHtml + `</table>`, { maxWidth: 280 });
                }
            }).addTo(map);
        });

        renderFilters();
        updateFloatingYear();
        errorOverlay.style.display = 'none';

    } catch (err) {
        console.error(err);
        errorOverlay.innerText = "Error: " + err.message;
        errorOverlay.style.display = 'block';
        filterListDiv.innerHTML = `<p style="color:#e74c3c; font-size:12px;">${err.message}</p>`;
    }
}

// 7. Sistem Filter Global (Waktu + Cari + Kategori)
function runGlobalFilter() {
    const selectedYear = parseInt(yearSlider.value);
    const searchTerm = searchInput.value.toLowerCase();
    const checkedCats = Array.from(document.querySelectorAll('.filter-item input:checked')).map(i => i.value);

    allMapFeatures.forEach(item => {
        const matchSearch = item.nama.toLowerCase().includes(searchTerm);
        const matchCat = checkedCats.includes(item.kategori);
        // Tampilkan jika tahun objek <= tahun slider, atau jika tidak ada info tahun
        const matchYear = item.tahun ? (item.tahun <= selectedYear) : true;
        
        if (matchSearch && matchCat && matchYear) {
            if (!map.hasLayer(item.layer)) map.addLayer(item.layer);
        } else {
            if (map.hasLayer(item.layer)) map.removeLayer(item.layer);
        }
    });
}

// 8. Render UI Filter Kategori
function renderFilters() {
    filterListDiv.innerHTML = '';
    const sortedCats = Array.from(uniqueCategories).sort();
    sortedCats.forEach(cat => {
        const label = document.createElement('label');
        label.className = 'filter-item';
        label.innerHTML = `<input type="checkbox" value="${cat}" checked> <span>${cat}</span>`;
        label.querySelector('input').addEventListener('change', runGlobalFilter);
        filterListDiv.appendChild(label);
    });
}

// Inisialisasi Aplikasi
createTicks();
loadDatabase();
yearSlider.addEventListener('input', updateFloatingYear);
searchInput.addEventListener('input', runGlobalFilter);