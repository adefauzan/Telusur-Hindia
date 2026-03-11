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

L.control.layers({ "Peta Jalan": streetView, "Satelit": satelliteView }, null, { position: 'topright' }).addTo(map);

// 2. Variabel State
const apiFolderUrl = 'https://api.github.com/repos/adefauzan/Telusur-Hindia/contents/database';
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-sidebar');
const body = document.body;
const yearSlider = document.getElementById('year-slider');
const floatingYear = document.getElementById('floating-year');
const searchInput = document.getElementById('search-input');
const filterListDiv = document.getElementById('filter-list');
const ticksContainer = document.getElementById('timeline-ticks');

let allMapFeatures = []; 
let uniqueCategories = new Set();

// 3. Fungsi Visual: Ticks (Garis Pembagi Tahun)
function createTicks() {
    const min = parseInt(yearSlider.min);
    const max = parseInt(yearSlider.max);
    const count = max - min;
    
    for (let i = 0; i <= count; i++) {
        const tick = document.createElement('div');
        tick.className = 'tick';
        const currentYear = min + i;
        // Tandai garis besar setiap 10 tahun atau tahun penting
        if (currentYear % 10 === 0 || [1864, 1903, 1945].includes(currentYear)) {
            tick.classList.add('major');
        }
        ticksContainer.appendChild(tick);
    }
}

// 4. Fungsi Interaksi: Toggle Sidebar
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    body.classList.toggle('expanded-state');
    body.classList.toggle('collapsed-state');
    setTimeout(() => map.invalidateSize(), 400);
});

// 5. Fungsi Logika: Update Tahun & Filter
function updateFloatingYear() {
    const val = yearSlider.value;
    const min = yearSlider.min;
    const max = yearSlider.max;
    const percent = (val - min) / (max - min) * 100;
    
    floatingYear.innerText = val;
    floatingYear.style.left = `calc(${percent}% + (${8 - percent * 0.15}px))`;
    
    runGlobalFilter();
}

// 6. Penarikan Data dari Database (GitHub GeoJSON)
function loadDatabase() {
    fetch(apiFolderUrl)
        .then(res => res.ok ? res.json() : Promise.reject('Gagal akses database GitHub'))
        .then(daftarFile => {
            const geojsonFiles = daftarFile.filter(f => f.name.endsWith('.geojson'));
            // Kita ambil semua file dalam folder database agar tergabung otomatis
            return Promise.all(geojsonFiles.map(file => fetch(file.download_url).then(r => r.json())));
        })
        .then(allGeoData => {
            allGeoData.forEach(data => {
                L.geoJSON(data, {
                    style: { color: "#c0392b", weight: 2, fillOpacity: 0.3 },
                    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                        radius: 7, fillColor: "#c0392b", color: "#fff", weight: 1, fillOpacity: 0.8
                    }),
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties || {};
                        const kategori = props.jenis || props.kategori || props.tipe || "Lainnya";
                        const nama = props.nama || props.Nama || "Objek Tanpa Nama";
                        
                        // Ekstraksi Tahun (Snap ke Timeline)
                        let thnRaw = props.tahun || props.year || props.Year || props.Tahun;
                        let tahun = thnRaw ? parseInt(thnRaw) : null;

                        uniqueCategories.add(kategori);
                        allMapFeatures.push({ layer, kategori, nama, tahun });

                        // Desain Popup
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
        })
        .catch(err => {
            console.error(err);
            filterListDiv.innerHTML = '<p style="color:red">Error Database!</p>';
        });
}

// 7. Filter Gabungan (Pencarian + Tahun + Kategori)
function runGlobalFilter() {
    const selectedYear = parseInt(yearSlider.value);
    const searchTerm = searchInput.value.toLowerCase();
    const checkedCats = Array.from(document.querySelectorAll('.filter-item input:checked')).map(i => i.value);

    allMapFeatures.forEach(item => {
        const matchSearch = item.nama.toLowerCase().includes(searchTerm);
        const matchCat = checkedCats.includes(item.kategori);
        const matchYear = item.tahun ? (item.tahun <= selectedYear) : true;

        if (matchSearch && matchCat && matchYear) {
            if (!map.hasLayer(item.layer)) map.addLayer(item.layer);
        } else {
            if (map.hasLayer(item.layer)) map.removeLayer(item.layer);
        }
    });
}

// 8. Render UI Checkbox
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

// Jalankan Inisialisasi
createTicks();
loadDatabase();
yearSlider.addEventListener('input', updateFloatingYear);
searchInput.addEventListener('input', runGlobalFilter);