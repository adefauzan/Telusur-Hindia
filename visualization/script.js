// 1. Initialize Map
const map = L.map('map', {
    zoomControl: false, 
    attributionControl: false
}).setView([-6.9, 110.4], 7);

// 2. Add Dark Theme Tiles (Keep CartoDB for the black theme)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; KITLV Archive',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Add Zoom Control at bottom right
L.control.zoom({ position: 'bottomright' }).addTo(map);

// 3. Custom Marker Icon (Yellow/Black Theme)
const customIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `
        <div style="
            background-color: #fbbf24;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #000;
            box-shadow: 0 0 12px #fbbf24;
        "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
});

// 4. Load Data Logic (Multi-Source Configuration)
// STRUKTUR BARU: Tambahkan file baru cukup dengan menambah object ke dalam array ini
const DATA_SOURCES = [
    {
        id: 'pertama',
        label: 'Buitenzorg_1921',
        url: 'https://raw.githubusercontent.com/adefauzan/CTAID/main/data/Buitenzorg_1921.geojson',
        active: true // Layer ini akan langsung tampil saat load
    },
    // Contoh jika nanti ada file kedua (hapus komentar untuk mencoba jika ada file-nya)
    /*
    {
        id: 'tambahan',
        label: 'Data Tambahan Surabaya',
        url: 'path/to/surabaya.geojson',
        active: false
    } 
    */
];

// Inisialisasi Layer Control (Menu untuk toggle layer)
const layerControl = L.control.layers(null, null, { collapsed: false }).addTo(map);

// Global counter untuk total statistik
let totalSites = 0;

// Main function to load ALL data sources
function loadMapData() {
    // Reset counter
    totalSites = 0;
    const promises = DATA_SOURCES.map(source => fetchSource(source));

    // Tunggu semua data selesai dimuat (opsional: bisa tambahkan loading spinner di sini)
    Promise.allSettled(promises).then(() => {
        updateStatsUI();
        console.log("Semua sumber data telah diproses.");
    });
}

// Fungsi fetch individual per source
function fetchSource(source) {
    return fetch(source.url)
        .then(response => {
            if (!response.ok) throw new Error(`File ${source.url} not found`);
            return response.json();
        })
        .then(geojsonData => {
            addLayerToMap(geojsonData, source);
            // Tambahkan ke total statistik
            if (geojsonData.features) {
                totalSites += geojsonData.features.length;
            }
        })
        .catch(error => {
            console.warn(`Gagal memuat ${source.label}:`, error);
            // Jika ini adalah sumber utama dan gagal, gunakan sample data
            if (source.id === 'utama') {
                console.log("Menggunakan Fallback Sample Data...");
                addLayerToMap(sampleData, { label: "Sample Data (Fallback)", active: true });
                totalSites += sampleData.features.length;
            }
        });
}

// Fungsi menambahkan layer GeoJSON ke Peta & Control
function addLayerToMap(data, sourceConfig) {
    // 1. Buat Layer GeoJSON (tapi jangan di-add ke map langsung)
    const geoJsonLayer = L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, { icon: customIcon });
        },
        onEachFeature: function (feature, layer) {
            // ... (Kode Popup sama seperti sebelumnya) ...
            const nama = feature.properties.nama || "Tanpa Nama";
            const tahun = feature.properties.tahun_wafat || "?";
            const link = feature.properties.link_arsip || "#";

            const popupContent = `
                <div class="p-1 min-w-[220px]">
                    <div class="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
                        <span class="text-[10px] text-gray-400 uppercase tracking-wider">Tahun Wafat</span>
                        <span class="text-xs text-amber-400 font-bold font-mono">${tahun}</span>
                    </div>
                    <h3 class="text-lg font-bold text-white mb-3 leading-tight">${nama}</h3>
                    
                    <a href="${link}" target="_blank" class="popup-link">
                        Lihat Arsip KITLV &nearr;
                    </a>
                </div>
            `;
            layer.bindPopup(popupContent);
        }
    });

    // 2. Buat Marker Cluster Group (Solusi untuk 1000+ data)
    const markers = L.markerClusterGroup({
        // Kustomisasi ikon cluster agar sesuai tema kuning/hitam
        iconCreateFunction: function(cluster) {
            return L.divIcon({ 
                html: '<div><span>' + cluster.getChildCount() + '</span></div>', 
                className: 'marker-cluster-custom', 
                iconSize: L.point(40, 40) 
            });
        },
        showCoverageOnHover: false, // Matikan area biru saat hover agar lebih bersih
        spiderfyOnMaxZoom: true     // Pecah marker jika di zoom maksimal masih bertumpuk
    });

    // 3. Masukkan data GeoJSON ke dalam Cluster Group
    markers.addLayer(geoJsonLayer);

    // 4. Tambahkan Cluster Group ke Layer Control & Peta
    layerControl.addOverlay(markers, `<span class="text-xs font-bold">${sourceConfig.label}</span>`);

    if (sourceConfig.active) {
        map.addLayer(markers);
    }
}

// Update UI Statistik
function updateStatsUI() {
    const statElement = document.getElementById('stat-count');
    if (statElement) {
        // Animasi sederhana angka
        statElement.innerText = totalSites;
    }
}

// 5. Interaction Logic

// Function called by button in HTML
function focusMap() {
    map.flyTo([-6.9, 110.4], 7, { animate: true, duration: 1.5 });
}

// Mouse move event for coordinate display
map.on('mousemove', function(e) {
    const latDisplay = document.getElementById('lat-display');
    const lngDisplay = document.getElementById('lng-display');
    
    if (latDisplay && lngDisplay) {
        latDisplay.innerText = e.latlng.lat.toFixed(4);
        lngDisplay.innerText = e.latlng.lng.toFixed(4);
    }
});

// Run Data Load
loadMapData();
