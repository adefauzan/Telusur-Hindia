// ==========================================
// 1. PENGATURAN DASAR PETA
// ==========================================
// Mengatur titik tengah peta (Fokus awal ke Indonesia) dan level zoom
const map = L.map('map').setView([-2.5489, 118.0149], 5); 

// Menambahkan peta dasar (Basemap) dari OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


// ==========================================
// 2. KONFIGURASI FOLDER DATABASE DI GITHUB
// ==========================================
// Ini adalah URL khusus mesin (API) untuk melihat isi folder 'database' di repo Anda.
// JANGAN PAKAI LINK WEB GITHUB BIASA! Pakai yang api.github.com ini:
const apiFolderUrl = 'https://api.github.com/repos/adefauzan/Telusur-Hindia/contents/database';


// ==========================================
// 3. PROSES MEMBACA FOLDER & MENAMPILKAN PETA
// ==========================================
// Langkah A: Minta GitHub API untuk mengecek ada file apa saja di folder 'database'
fetch(apiFolderUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error('Gagal membaca folder database. Pastikan repo publik dan nama folder benar.');
        }
        return response.json(); // Ubah respon menjadi format JSON (daftar file)
    })
    .then(daftarFile => {
        console.log("Berhasil menemukan file di folder database:", daftarFile);

        // Langkah B: Looping (ulangi) untuk setiap file yang ditemukan di dalam folder
        daftarFile.forEach(file => {
            
            // Kita filter, hanya proses file yang ujungnya ".geojson"
            if (file.name.endsWith('.geojson')) {
                
                console.log(`Sedang memuat peta: ${file.name}...`);

                // Langkah C: Ambil data mentah (RAW) dari file GeoJSON tersebut
                // file.download_url ini adalah link raw otomatis dari GitHub
                fetch(file.download_url)
                    .then(res => res.json())
                    .then(geojsonData => {
                        
                        // Langkah D: Gambar data GeoJSON ke atas peta Leaflet
                        L.geoJSON(geojsonData, {
                            
                            // Bikin gaya (warna garis/poligon) sedikit transparan biar basemap kelihatan
                            style: function (feature) {
                                return {
                                    color: "#e74c3c", // Warna merah
                                    weight: 2,        // Ketebalan garis
                                    opacity: 0.8,
                                    fillOpacity: 0.4
                                };
                            },

                            // Bikin Pop-up saat fitur di peta diklik
                            onEachFeature: function (feature, layer) {
                                let popupContent = `<div style="max-height: 200px; overflow-y: auto;">`;
                                popupContent += `<h4 style="margin:0 0 5px 0;">Sumber: ${file.name}</h4><hr style="margin:5px 0;">`;
                                
                                // Jika GeoJSON punya data atribut (properties), tampilkan semuanya
                                if (feature.properties && Object.keys(feature.properties).length > 0) {
                                    for (let key in feature.properties) {
                                        popupContent += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                                    }
                                } else {
                                    popupContent += `<i>Tidak ada data atribut/metadata pada fitur ini.</i>`;
                                }
                                
                                popupContent += `</div>`;
                                layer.bindPopup(popupContent);
                            }

                        }).addTo(map);

                    })
                    .catch(error => console.error(`Gagal menampilkan isi dari ${file.name}:`, error));
            }
        });
    })
    .catch(error => {
        console.error('Error Utama:', error);
        alert('Terjadi kesalahan saat mencoba membaca folder database dari GitHub.');
    });