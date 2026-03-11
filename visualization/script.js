// 1. Inisialisasi Peta
const map = L.map('map').setView([-6.2088, 106.8456], 10); // Default ke Jakarta

// Tambahkan Basemap OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 2. URL GitHub API untuk membaca isi folder "database"
const githubApiUrl = 'https://api.github.com/repos/adefauzan/Telusur-Hindia/contents/database';

// 3. Fungsi untuk mengambil dan melooping semua file di folder tersebut
fetch(githubApiUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error('Gagal membaca folder database dari GitHub API.');
        }
        return response.json();
    })
    .then(files => {
        // Melakukan perulangan (loop) untuk setiap file yang ditemukan di folder database
        files.forEach(file => {
            
            // Cek apakah file tersebut adalah file .geojson
            if (file.name.endsWith('.geojson')) {
                
                // Jika ya, ambil data mentahnya menggunakan 'download_url' bawaan GitHub
                fetch(file.download_url)
                    .then(res => res.json())
                    .then(geojsonData => {
                        
                        // Masukkan data GeoJSON tersebut ke dalam peta
                        L.geoJSON(geojsonData, {
                            onEachFeature: function (feature, layer) {
                                let popupContent = `<b>File: ${file.name}</b><br><hr>`;
                                
                                if (feature.properties) {
                                    for (let key in feature.properties) {
                                        popupContent += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                                    }
                                }
                                layer.bindPopup(popupContent);
                            }
                        }).addTo(map);

                    })
                    .catch(err => console.error(`Gagal memuat file ${file.name}:`, err));
            }
        });
    })
    .catch(error => {
        console.error('Ada masalah:', error);
        alert('Gagal membaca folder database. Pastikan koneksi internet lancar dan nama repo benar.');
    });