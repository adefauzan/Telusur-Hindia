// 1. Inisialisasi Peta
// Mengatur titik tengah peta saat pertama kali dibuka. 
// Angka [-6.2088, 106.8456] adalah koordinat Jakarta. Angka 10 adalah level zoom.
const map = L.map('map').setView([-6.2088, 106.8456], 10);

// 2. Menambahkan Basemap (Peta Latar Belakang)
// Kita pakai OpenStreetMap yang gratis dan open-source
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 3. Menentukan Jalur File GeoJSON
// Karena script.js ada di folder visualization, kita pakai '../' untuk keluar, 
// lalu masuk ke folder 'database'.
// UBAH 'nama_file_anda.geojson' DENGAN NAMA FILE ASLI ANDA!
const urlData = '../database/nama_file_anda.geojson';

// 4. Mengambil (Fetch) Data GeoJSON dan Menampilkannya
fetch(urlData)
    .then(response => {
        // Cek apakah file berhasil ditemukan
        if (!response.ok) {
            throw new Error('File GeoJSON tidak ditemukan. Cek lagi nama dan lokasinya!');
        }
        return response.json();
    })
    .then(data => {
        // Jika berhasil, masukkan data GeoJSON ke dalam peta Leaflet
        const geojsonLayer = L.geoJSON(data, {
            // Bagian ini untuk membuat Pop-up saat bangunan/jalan di peta diklik
            onEachFeature: function (feature, layer) {
                // Misalnya di GeoJSON Anda ada informasi "nama" atau "keterangan"
                // Ganti tulisan 'nama_tempat' sesuai dengan atribut (properties) di GeoJSON Anda
                let popupContent = "<b>Informasi:</b><br>";
                
                // Menampilkan semua properties (informasi metadata) yang ada di GeoJSON
                if (feature.properties) {
                    for (let key in feature.properties) {
                        popupContent += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                    }
                } else {
                    popupContent += "Tidak ada data detail.";
                }
                
                layer.bindPopup(popupContent);
            }
        }).addTo(map);

        // Opsional: Membuat peta otomatis zoom / fokus ke ukuran data GeoJSON Anda
        map.fitBounds(geojsonLayer.getBounds());
    })
    .catch(error => {
        console.error('Ada masalah saat memuat peta:', error);
        alert('Gagal memuat data GeoJSON. Pastikan membuka file lewat Live Server!');
    });